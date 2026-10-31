#!/bin/zsh
# End-to-end test of the real checkout against the live Supabase project, through the local API (npm run dev).
#   A. guest bank-transfer order: place, double-submit, order page, screenshot upload, admin approval
#   B. sign up, order with WELCOME10 (cash on delivery), confirm from the order page, account order list
#   C. voucher abuse + validation, admin guest/account view, newsletter
# Test rows are tagged *@e2e.test and removed at the end (also at the start, in case a previous run died).
# usage: scripts/e2e.sh [api base, default http://localhost:5173/api]
set -u
cd ${0:A:h:h}
set -a; . ./.env; set +a
API=${1:-http://localhost:5173/api}
SB=${SUPABASE_URL:-https://pjxbvsgbvgfwbvrbdpct.supabase.co}
PUB=${VITE_SUPABASE_PUBLISHABLE_KEY:-sb_publishable_0_rGqV5nmoS6ukgphPofgA_xIVMvP86}
T=$(mktemp -d); trap 'rm -rf $T' EXIT
fails=0
j() { python3 -I -c "import json,sys
try: d=json.load(sys.stdin)
except Exception: print('<non-json>'); sys.exit()
try: print($1)
except Exception as e: print('<missing: %s>' % e)"; }
post() { if [[ -n ${3:-} ]]; then curl -s -m 30 -X POST "$API/$1" -H 'content-type: application/json' -H "authorization: Bearer $3" -d "$2"; else curl -s -m 30 -X POST "$API/$1" -H 'content-type: application/json' -d "$2"; fi }
get() { if [[ -n ${2:-} ]]; then curl -s -m 30 "$API/$1" -H "authorization: Bearer $2"; else curl -s -m 30 "$API/$1"; fi }
sql() { echo "$1" > $T/q.sql; scripts/db-sql.sh $T/q.sql; }
check() { if [[ "$2" == "$3" ]]; then echo "PASS $1"; else echo "FAIL $1: expected [$3] got [$2]"; fails=$((fails+1)); fi }
cleanup() {
  # storage rows can't be deleted with SQL; use the Storage API with the server key
  local paths=$(sql "select coalesce(json_agg(name), '[]') as p from storage.objects where bucket_id = 'payment-proofs' and name like any (select id::text || '/%' from public.orders where email like '%@e2e.test')" | j "json.dumps(d[0]['p'])")
  [[ "$paths" != "[]" && -n "$paths" ]] && curl -s -m 30 -o /dev/null -X DELETE "$SB/storage/v1/object/payment-proofs" -H "apikey: $SUPABASE_SECRET_KEY" -H "authorization: Bearer $SUPABASE_SECRET_KEY" -H 'content-type: application/json' -d "{\"prefixes\":$paths}"
  sql "delete from public.orders where email like '%@e2e.test';
       delete from public.subscribers where email like '%@e2e.test';
       delete from auth.users where email like '%@e2e.test';
       delete from public.rate_limits where bucket like '%e2e.test%' or bucket like '%:ip:127.0.0.1' or bucket like '%:ip:::1';
       update public.products set stock = 100 where slug in ('hot-smoked-coho', 'sardines-orange-fennel', 'albacore-chili-oil');" > /dev/null
}
cleanup
ADDR='{"name":"Guest Tester","line1":"1 Test Lane","city":"Karachi","region":"Sindh","postal_code":"75500","country":"PK"}'
ITEMS='[{"sku":"hot-smoked-coho-3","quantity":1},{"sku":"sardines-orange-fennel-1","quantity":2}]'
# 1x1 PNG
python3 -I -c "import struct,zlib
def ch(t,d): return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
open('$T/p.png','wb').write(b'\x89PNG\r\n\x1a\n'+ch(b'IHDR',struct.pack('>IIBBBBB',1,1,8,2,0,0,0))+ch(b'IDAT',zlib.compress(b'\x00\xff\x00\x00'))+ch(b'IEND',b''))"

echo "== A. guest bank transfer"
K1="ck-guest-$RANDOM$RANDOM-xxxxxxxx"
R=$(post checkout "{\"key\":\"$K1\",\"method\":\"bank_transfer\",\"email\":\"guest@e2e.test\",\"phone\":\"0300 1234567\",\"address\":$ADDR,\"items\":$ITEMS}")
TOK=$(echo "$R" | j "d['token']"); NUM=$(echo "$R" | j "d['number']")
check "A1 order placed" "$([[ ${#TOK} -gt 20 ]] && echo yes)" yes
check "A2 double submit returns the same order" "$(post checkout "{\"key\":\"$K1\",\"method\":\"bank_transfer\",\"email\":\"guest@e2e.test\",\"address\":$ADDR,\"items\":$ITEMS}" | j "str(d['number'])+':'+str(d['retried'])")" "$NUM:True"
check "A3 order page: status, bank details, normalized phone, totals, no secrets" "$(get "order?t=$TOK" | j "d['order']['status']+' '+str(bool(d['bank_details'].get('account_number')))+' '+d['order']['phone']+' %s/%s/%s/%s'%(d['order']['subtotal_cents'],d['order']['shipping_cents'],d['order']['tax_cents'],d['order']['total_cents'])+' secrets='+str(any(k in json.dumps(d) for k in ['token_hash','client_ip','idempotency']))")" "awaiting_payment True +923001234567 5040/895/403/6338 secrets=False"
ST=$(post proof "{\"t\":\"$TOK\",\"step\":\"start\",\"type\":\"image/png\"}"); P=$(echo "$ST" | j "d['path']"); UT=$(echo "$ST" | j "d['token']")
check "A4 signed upload accepted" "$(curl -s -m 30 -o /dev/null -w "%{http_code}" -X PUT "$SB/storage/v1/object/upload/sign/payment-proofs/$P?token=$UT" -H "content-type: image/png" --data-binary @$T/p.png)" 200
check "A5 proof recorded -> payment_review" "$(post proof "{\"t\":\"$TOK\",\"step\":\"done\",\"path\":\"$P\"}" | j "d.get('status') or d.get('error')")" payment_review
check "A6 second screenshot during review rejected" "$(post proof "{\"t\":\"$TOK\",\"step\":\"start\",\"type\":\"image/png\"}" | j "d.get('error','').strip()")" "This order is not waiting for a payment screenshot"
sql "do \$\$ declare adm uuid; pr uuid; begin
  select user_id into adm from public.admins limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  select p.id into pr from public.payment_proofs p join public.orders x on x.id = p.order_id where x.number = $NUM and p.status = 'pending';
  perform public.review_payment_proof(pr, true, null, 'E2E-TXN-$NUM');
end \$\$;" > /dev/null
check "A7 admin approval -> confirmed / paid / txn recorded" "$(get "order?t=$TOK" | j "d['order']['status']+'/'+d['order']['payment_status']+'/'+str(d['order']['transaction_ref'])")" "confirmed/paid/E2E-TXN-$NUM"

echo "== B. sign up, then order with WELCOME10 (cash on delivery)"
SU=$(curl -s -m 30 -X POST "$SB/auth/v1/signup" -H "apikey: $PUB" -H 'content-type: application/json' -d '{"email":"member@e2e.test","password":"Str0ngPassw0rd!x","data":{"full_name":"Member Tester"}}')
JWT=$(echo "$SU" | j "d['access_token']"); USERID=$(echo "$SU" | j "d['user']['id']")
check "B1 signup returns a session (email auto-confirm is on)" "$([[ ${#JWT} -gt 100 ]] && echo yes)" yes
check "B2 profile row created by trigger" "$(curl -s -m 30 "$SB/rest/v1/profiles?select=full_name&id=eq.$USERID" -H "apikey: $PUB" -H "authorization: Bearer $JWT" | j "d[0]['full_name']")" "Member Tester"
R=$(post checkout "{\"key\":\"ck-member-$RANDOM$RANDOM-xxxxxxxx\",\"method\":\"cod\",\"email\":\"member@e2e.test\",\"phone\":\"+923009876543\",\"code\":\"welcome10\",\"address\":$ADDR,\"items\":[{\"sku\":\"albacore-chili-oil-1\",\"quantity\":2}],\"whatsapp\":true}" "$JWT")
MID=$(echo "$R" | j "d['id']")
check "B3 COD order placed for the account" "$(echo "$R" | j "d.get('status') or d.get('error')")" awaiting_confirmation
check "B4 owner opens it by id; WELCOME10 took 10% (260 of 2600)" "$(get "order?id=$MID" "$JWT" | j "d['order']['status']+' '+str(d['order']['discount_cents'])+' '+str(d['order']['discount_code'])")" "awaiting_confirmation 260 WELCOME10"
check "B5 stranger cannot open it by id" "$(get "order?id=$MID" | j "d['error']")" "Order not found"
check "B6 customer confirms COD" "$(post respond "{\"id\":\"$MID\",\"confirm\":true}" "$JWT" | j "d.get('status') or d.get('error')")" confirmed
check "B7 confirming again is rejected" "$(post respond "{\"id\":\"$MID\",\"confirm\":false}" "$JWT" | j "d['error']")" "This order is no longer waiting for confirmation"
check "B8 account sees exactly its own order (RLS)" "$(curl -s -m 30 "$SB/rest/v1/orders?select=number" -H "apikey: $PUB" -H "authorization: Bearer $JWT" | j "len(d) if isinstance(d, list) else 'error'")" 1
check "B9 account sees its own timeline only" "$(curl -s -m 30 "$SB/rest/v1/order_events?select=to_status" -H "apikey: $PUB" -H "authorization: Bearer $JWT" | j "len(d) if isinstance(d, list) else 'error'")" 2

echo "== C. voucher abuse + validation"
check "C1 WELCOME10 as guest refused" "$(post checkout "{\"key\":\"ck-g2-$RANDOM$RANDOM-xxxxxxxx\",\"method\":\"bank_transfer\",\"email\":\"guest2@e2e.test\",\"code\":\"WELCOME10\",\"address\":$ADDR,\"items\":[{\"sku\":\"albacore-chili-oil-1\",\"quantity\":1}]}" | j "d['error']")" "Sign in or create an account to use code WELCOME10"
check "C2 WELCOME10 twice for one account refused" "$(post checkout "{\"key\":\"ck-m2-$RANDOM$RANDOM-xxxxxxxx\",\"method\":\"cod\",\"email\":\"member@e2e.test\",\"phone\":\"+923009876543\",\"code\":\"WELCOME10\",\"address\":$ADDR,\"items\":[{\"sku\":\"albacore-chili-oil-1\",\"quantity\":1}]}" "$JWT" | j "d['error']")" "Code WELCOME10 is for first orders only"
check "C3 account using an email that already ordered as guest refused" "$(post checkout "{\"key\":\"ck-m3-$RANDOM$RANDOM-xxxxxxxx\",\"method\":\"cod\",\"email\":\"guest@e2e.test\",\"phone\":\"+923009876543\",\"code\":\"WELCOME10\",\"address\":$ADDR,\"items\":[{\"sku\":\"albacore-chili-oil-1\",\"quantity\":1}]}" "$JWT" | j "d['error']")" "Code WELCOME10 is for first orders only"
check "C4 unknown sku" "$(post checkout "{\"key\":\"ck-x-$RANDOM$RANDOM-xxxxxxxx\",\"method\":\"bank_transfer\",\"email\":\"g3@e2e.test\",\"address\":$ADDR,\"items\":[{\"sku\":\"nope\",\"quantity\":1}]}" | j "d['error']")" "One of the items in your cart is no longer available"
check "C5 bad phone" "$(post checkout "{\"key\":\"ck-y-$RANDOM$RANDOM-xxxxxxxx\",\"method\":\"cod\",\"email\":\"g4@e2e.test\",\"phone\":\"12\",\"address\":$ADDR,\"items\":[{\"sku\":\"albacore-chili-oil-1\",\"quantity\":1}]}" | j "d['error'][:26]")" "Enter a valid phone number"
check "C6 admin customer list shows guest vs account" "$(sql "do \$\$ begin perform set_config('request.jwt.claims', json_build_object('sub', (select user_id from public.admins limit 1), 'role', 'authenticated')::text, true); end \$\$;
  select email, has_account from public.admin_customers() where email like '%@e2e.test' order by email;" | j "','.join(f\"{r['email'].split('@')[0]}={r['has_account']}\" for r in d)")" "guest=False,member=True"
check "C7 newsletter endpoint" "$(post subscribe '{"email":"news@e2e.test","source":"test"}' | j "d.get('ok') or d.get('error')")" True

cleanup
echo; (( fails == 0 )) && echo "E2E: ALL PASS" || { echo "E2E: $fails FAILED"; exit 1; }
