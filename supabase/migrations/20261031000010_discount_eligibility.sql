-- Discount eligibility rules, enforced inside the order insert so they cannot be skipped:
--   requires_account  -> only signed-in customers can use the code
--   first_order_only  -> only when neither the account nor the email has a live (non-cancelled) order
alter table public.discount_codes
  add column requires_account boolean not null default false,
  add column first_order_only boolean not null default false;

update public.discount_codes set requires_account = true, first_order_only = true, label = '10% off your first order (account required)'
where code = 'WELCOME10';

create function private.check_discount_eligibility() returns trigger
language plpgsql security definer set search_path = '' as $$
declare d public.discount_codes;
begin
  if new.discount_code is null then
    return new;
  end if;
  select * into d from public.discount_codes where code = new.discount_code;
  if d.requires_account and new.user_id is null then
    raise exception 'Sign in or create an account to use code %', d.code using errcode = '22023';
  end if;
  if d.first_order_only and exists (
    select 1 from public.orders o
    where o.status not in ('cancelled')
      and (o.email = new.email or (new.user_id is not null and o.user_id = new.user_id))
  ) then
    raise exception 'Code % is for first orders only', d.code using errcode = '22023';
  end if;
  return new;
end $$;
create trigger orders_discount_eligibility before insert on public.orders
  for each row execute function private.check_discount_eligibility();
