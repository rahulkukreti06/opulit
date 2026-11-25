-- Run only from the Supabase SQL Editor as a trusted project administrator.
-- Replace the placeholder with the email of the account to promote.
do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  where lower(email) = lower('YOUR_EMAIL_HERE');

  if v_user_id is null then
    raise exception 'Replace YOUR_EMAIL_HERE with an existing account email';
  end if;

  insert into public.admin_roles (user_id, role)
  values (v_user_id, 'super_admin')
  on conflict (user_id, role) do nothing;
end;
$$;

select ar.user_id, u.email, ar.role, ar.created_at
from public.admin_roles ar
join auth.users u on u.id = ar.user_id
where ar.role = 'super_admin';
