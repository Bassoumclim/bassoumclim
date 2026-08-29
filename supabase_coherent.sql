-- BassoumClim - correctif cohérent pour la structure Supabase existante.
-- Ce script ne supprime aucune donnée.

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path=public,pg_catalog
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin'); $$;
create or replace function public.is_technician() returns boolean
language sql stable security definer set search_path=public,pg_catalog
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='technicien'); $$;

create or replace function public.claim_request(p_request_id uuid) returns boolean
language plpgsql security definer set search_path=public,pg_catalog
as $$
declare changed integer;
begin
  if not public.is_technician() then raise exception 'Compte technicien requis'; end if;
  update public.requests
  set technician_id=auth.uid(), status='accepted'
  where id=p_request_id and status='pending' and technician_id is null
    and exists(select 1 from public.technicians t where t.id=auth.uid() and t.is_available=true);
  get diagnostics changed = row_count;
  return changed > 0;
end; $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.is_technician() from public;
grant execute on function public.is_technician() to authenticated;
revoke all on function public.claim_request(uuid) from public;
grant execute on function public.claim_request(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.technicians enable row level security;
alter table public.requests enable row level security;
alter table public.quotes enable row level security;
alter table public.interventions enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.payments enable row level security;

-- Profils
 drop policy if exists profiles_own on public.profiles;
 create policy profiles_own on public.profiles for all to authenticated
 using(id=auth.uid() or public.is_admin())
 with check(id=auth.uid() or public.is_admin());

-- Techniciens
 drop policy if exists tech_read on public.technicians;
 create policy tech_read on public.technicians for select to authenticated using(true);
 drop policy if exists tech_own on public.technicians;
 create policy tech_own on public.technicians for insert to authenticated with check(id=auth.uid());
 drop policy if exists tech_update on public.technicians;
 create policy tech_update on public.technicians for update to authenticated
 using(id=auth.uid() or public.is_admin()) with check(id=auth.uid() or public.is_admin());

-- Demandes
 drop policy if exists request_insert on public.requests;
 create policy request_insert on public.requests for insert to authenticated with check(client_id=auth.uid());
 drop policy if exists request_read on public.requests;
 create policy request_read on public.requests for select to authenticated
 using(client_id=auth.uid() or technician_id=auth.uid() or (public.is_technician() and status='pending' and technician_id is null) or public.is_admin());
 drop policy if exists request_client_update on public.requests;
 create policy request_client_update on public.requests for update to authenticated
 using(client_id=auth.uid() or technician_id=auth.uid() or public.is_admin())
 with check(client_id=auth.uid() or technician_id=auth.uid() or public.is_admin());

-- Devis
 drop policy if exists quote_read on public.quotes;
 create policy quote_read on public.quotes for select to authenticated
 using(technician_id=auth.uid() or public.is_admin() or exists(select 1 from public.requests r where r.id=request_id and r.client_id=auth.uid()));
 drop policy if exists quote_insert on public.quotes;
 create policy quote_insert on public.quotes for insert to authenticated
 with check(technician_id=auth.uid() and exists(select 1 from public.requests r where r.id=request_id and r.technician_id=auth.uid()));
 drop policy if exists quote_update on public.quotes;
 create policy quote_update on public.quotes for update to authenticated
 using(technician_id=auth.uid() or public.is_admin() or exists(select 1 from public.requests r where r.id=request_id and r.client_id=auth.uid()))
 with check(technician_id=auth.uid() or public.is_admin() or exists(select 1 from public.requests r where r.id=request_id and r.client_id=auth.uid()));

-- Interventions
 drop policy if exists intervention_read on public.interventions;
 create policy intervention_read on public.interventions for select to authenticated
 using(client_id=auth.uid() or technician_id=auth.uid() or public.is_admin());
 drop policy if exists intervention_insert on public.interventions;
 create policy intervention_insert on public.interventions for insert to authenticated
 with check(client_id=auth.uid() or technician_id=auth.uid() or public.is_admin());
 drop policy if exists intervention_update on public.interventions;
 create policy intervention_update on public.interventions for update to authenticated
 using(client_id=auth.uid() or technician_id=auth.uid() or public.is_admin())
 with check(client_id=auth.uid() or technician_id=auth.uid() or public.is_admin());

-- Avis
 drop policy if exists review_read on public.reviews;
 create policy review_read on public.reviews for select to authenticated
 using(client_id=auth.uid() or technician_id=auth.uid() or public.is_admin());
 drop policy if exists review_insert on public.reviews;
 create policy review_insert on public.reviews for insert to authenticated with check(client_id=auth.uid());
 drop policy if exists review_update on public.reviews;
 create policy review_update on public.reviews for update to authenticated using(client_id=auth.uid() or public.is_admin()) with check(client_id=auth.uid() or public.is_admin());

-- Notifications: la table actuelle utilise "read".
 drop policy if exists notif_read on public.notifications;
 create policy notif_read on public.notifications for select to authenticated using(user_id=auth.uid() or public.is_admin());
 drop policy if exists notif_update on public.notifications;
 create policy notif_update on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

-- Paiements
 drop policy if exists pay_read on public.payments;
 create policy pay_read on public.payments for select to authenticated using(client_id=auth.uid() or public.is_admin());
