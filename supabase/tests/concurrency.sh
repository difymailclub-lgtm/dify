#!/bin/zsh
# Real concurrency against the live database: every request is its own API call / DB session.
#   1. oversell race     20 buyers, stock 5        -> exactly 5 orders, stock 0
#   2. double-click race 10 clicks, one checkout key -> 1 order, every click gets the same order
#   3. IP burst          10 orders from one IP      -> at most 5 succeed (rate limit)
#   4. deadlock check    12 carts [A,B] vs [B,A]    -> all succeed, no deadlocks
# Creates products/orders tagged "conc" and deletes them at the end (even on failure).
# usage: supabase/tests/concurrency.sh
set -u
cd ${0:A:h:h:h}
T=$(mktemp -d)
RUN=$RANDOM$RANDOM
fails=0
q() { echo "$1" > $T/q.sql; scripts/db-sql.sh $T/q.sql; }
cleanup() {
  q "delete from public.orders where email like 'conc%@test.dev';
     delete from public.products where slug like 'conc-%';
     delete from public.rate_limits where bucket like 'order:%conc%' or bucket like 'order:ip:10.20_.%';" >/dev/null
  rm -rf $T
}
trap cleanup EXIT
check() { if [[ "$2" == "$3" ]]; then echo "PASS $1 ($2)"; else echo "FAIL $1: expected $3, got $2"; fails=$((fails + 1)); fi }
json() { python3 -I -c "import json,sys; d=json.load(sys.stdin); print(d[0]['$1'] if isinstance(d, list) and d else d)"; }

q "insert into public.products (slug, name, status, stock) values
     ('conc-race', 'Conc Race', 'active', 5), ('conc-a', 'Conc A', 'active', 100), ('conc-b', 'Conc B', 'active', 100), ('conc-burst', 'Conc Burst', 'active', 100);
   insert into public.variants (product_id, title, price_cents) select id, 'Single', 100 from public.products where slug like 'conc-%';" >/dev/null
vid() { q "select v.id from public.variants v join public.products p on p.id = v.product_id where p.slug = '$1'" | json id; }
V_RACE=$(vid conc-race); V_A=$(vid conc-a); V_B=$(vid conc-b); V_BURST=$(vid conc-burst)

order_sql() { # items-json key ip email
  cat <<SQL
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select (public.place_order(p_items => '$1', p_email => '$4', p_phone => null,
  p_address => '{"name":"C","line1":"1 Race St","city":"X"}', p_method => 'bank_transfer',
  p_token_hash => encode(sha256(convert_to('$2-tok', 'UTF8')), 'hex'), p_idempotency_key => '$2', p_ip => '$3')).number as n;
SQL
}
fire() { # name count items key-template ip-template email-template   (templates use {i})
  local name=$1 count=$2 items=$3
  for i in $(seq 1 $count); do
    order_sql "$items" "${4//\{i\}/$i}" "${5//\{i\}/$i}" "${6//\{i\}/$i}" > $T/$name-$i.sql
    scripts/db-sql.sh $T/$name-$i.sql > $T/$name-$i.out &
  done
  wait
}
ok_count() { grep -l '"n"' $T/$1-*.out 2>/dev/null | wc -l | tr -d ' '; }
distinct_orders() { cat $T/$1-*.out | grep -o '"n":[0-9]*' | sort -u | wc -l | tr -d ' '; }

# 1. oversell race
fire race 20 "[{\"variant_id\":\"$V_RACE\",\"quantity\":1}]" "conc-race-$RUN-{i}-xxxxxxxx" "10.201.{i}.1" "conc-race{i}@test.dev"
check "oversell: orders placed" "$(ok_count race)" 5
check "oversell: final stock" "$(q "select stock from public.products where slug = 'conc-race'" | json stock)" 0
check "oversell: rejections say 'Only 0 left'" "$(grep -l 'Only 0 left' $T/race-*.out | wc -l | tr -d ' ')" 15

# 2. double-click race (same checkout key, same IP, same email)
fire dbl 10 "[{\"variant_id\":\"$V_A\",\"quantity\":1}]" "conc-dbl-$RUN-xxxxxxxxxxxx" "10.202.0.1" "conc-dbl@test.dev"
check "double click: all clicks answered" "$(ok_count dbl)" 10
check "double click: distinct orders" "$(distinct_orders dbl)" 1
check "double click: stock taken once" "$(q "select stock from public.products where slug = 'conc-a'" | json stock)" 99

# 3. IP burst (different checkout keys + emails, one IP)
fire burst 10 "[{\"variant_id\":\"$V_BURST\",\"quantity\":1}]" "conc-burst-$RUN-{i}-xxxxxxxx" "10.203.0.1" "conc-burst{i}@test.dev"
check "IP burst: orders allowed" "$(ok_count burst)" 5
check "IP burst: HTTP-429 rejections" "$(grep -l 'Too many requests' $T/burst-*.out | wc -l | tr -d ' ')" 5

# 4. opposite lock order
for i in $(seq 1 12); do
  if (( i % 2 )); then items="[{\"variant_id\":\"$V_A\",\"quantity\":1},{\"variant_id\":\"$V_B\",\"quantity\":1}]"
  else items="[{\"variant_id\":\"$V_B\",\"quantity\":1},{\"variant_id\":\"$V_A\",\"quantity\":1}]"; fi
  order_sql "$items" "conc-dead-$RUN-$i-xxxxxxxx" "10.204.$i.1" "conc-dead$i@test.dev" > $T/dead-$i.sql
  scripts/db-sql.sh $T/dead-$i.sql > $T/dead-$i.out &
done
wait
check "deadlock: all carts placed" "$(ok_count dead)" 12
check "deadlock: no deadlock errors" "$(grep -l 'deadlock' $T/dead-*.out | wc -l | tr -d ' ')" 0
check "deadlock: stock A (100 - 1 dbl - 12)" "$(q "select stock from public.products where slug = 'conc-a'" | json stock)" 87

echo; (( fails == 0 )) && echo "CONCURRENCY: ALL PASS" || { echo "CONCURRENCY: $fails FAILED"; for f in $T/*.out; do grep -q '"n"' $f || { echo "--- $f"; head -c 300 $f; echo; }; done | head -40; exit 1; }
