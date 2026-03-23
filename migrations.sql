-- drop old constraints
alter table public.project_shares
drop constraint if exists project_shares_shared_by_fkey;

alter table public.project_shares
drop constraint if exists project_shares_shared_with_fkey;

alter table public.projects
drop constraint if exists projects_user_id_fkey;

-- add new ones
alter table public.project_shares
add constraint project_shares_shared_by_fkey
foreign key (shared_by) references public.profiles(id) on delete cascade;

alter table public.project_shares
add constraint project_shares_shared_with_fkey
foreign key (shared_with) references public.profiles(id) on delete cascade;

alter table public.projects
add constraint projects_user_id_fkey
foreign key (user_id) references public.profiles(id) on delete cascade;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();