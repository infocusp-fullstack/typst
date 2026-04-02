create table public.projects_search (
  id uuid not null default gen_random_uuid (),
  project_id uuid null,
  chunk text null,
  fts tsvector GENERATED ALWAYS as (to_tsvector('english'::regconfig, chunk)) STORED null,
  chunk_index integer null,
  constraint projects_search_pkey primary key (id),
  constraint projects_search_project_id_fkey foreign KEY (project_id) references projects (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists projects_search_fts_idx on public.projects_search using gin (fts) TABLESPACE pg_default;
ALTER TABLE public.projects_search ENABLE ROW LEVEL SECURITY;
create policy "Enable read access for all users" on "public"."projects_search" as PERMISSIVE for SELECT to public using (true);

create or replace function search_resumes_shared(
  search_query text,
  curr_user uuid,
  page int,
  page_size int
)
returns jsonb
language plpgsql
as $$
declare
  result jsonb;
  query tsquery;
begin
  query := regexp_replace(
    websearch_to_tsquery('english', search_query)::text, 
    '''(?=\s|&|\||!|<->|$)', 
    ''':*',
    'g'
  )::tsquery;

  select jsonb_build_object(
    'projects', coalesce(jsonb_agg(row_to_json(p)), '[]'::jsonb),
    'total_count', coalesce(max(p.total_count), 0)
  )
  into result
  from (
    select 
      p.*,
      count(*) over() as total_count
    from (
      select distinct 
        p.*,
        (
          select array_agg(snippet)
          from (
            select ts_headline(
              'english',
              s.chunk,
              query,
              'StartSel=<mark>, StopSel=</mark>, MaxFragments=2'
            ) as snippet
            from projects_search s
            where s.project_id = p.id
            and s.fts @@ query
            order by ts_rank(s.fts, query) desc
            limit 3
          ) t
        ) as snippets

      from projects p
      inner join project_shares ps 
        on ps.project_id = p.id
        and ps.shared_with = curr_user
      inner join projects_search s 
        on s.project_id = p.id
      where s.fts @@ query
    ) p
    order by p.created_at desc
    limit page_size
    offset page * page_size
  ) p;

  return result;
end;
$$;

create or replace function search_resumes(
  search_query text,
  page int,
  page_size int
)
returns jsonb
language plpgsql
as $$
declare
  result jsonb;
  query tsquery;
begin
  query := regexp_replace(
    websearch_to_tsquery('english', search_query)::text, 
    '''(?=\s|&|\||!|<->|$)', 
    ''':*',
    'g'
  )::tsquery;

  select jsonb_build_object(
    'projects', coalesce(jsonb_agg(row_to_json(p)), '[]'::jsonb),
    'total_count', coalesce(max(p.total_count), 0)
  )
  into result
  from (
    select 
      p.*,
      count(*) over() as total_count
    from (
      select 
        p.*,
        (
          select array_agg(snippet)
          from (
            select ts_headline(
              'english',
              s.chunk,
              query,
              'StartSel=<mark>, StopSel=</mark>, MaxFragments=2'
            ) as snippet
            from projects_search s
            where s.project_id = p.id
            and s.fts @@ query
            order by ts_rank(s.fts, query) desc
            limit 3
          ) t
        ) as snippets

      from projects p
      where exists (
        select 1
        from projects_search s
        where s.project_id = p.id
        and s.fts @@ query
      )
    ) p
    order by p.created_at desc
    limit page_size
    offset page * page_size
  ) p;

  return result;
end;
$$;

ccreate or replace function search_resumes_own(
  search_query text,
  curr_user uuid,
  page int,
  page_size int
)
returns jsonb
language plpgsql
as $$
declare
  result jsonb;
  query tsquery;
begin
  query := regexp_replace(
    websearch_to_tsquery('english', search_query)::text, 
    '''(?=\s|&|\||!|<->|$)', 
    ''':*',
    'g'
  )::tsquery;

  select jsonb_build_object(
    'projects', coalesce(jsonb_agg(row_to_json(p)), '[]'::jsonb),
    'total_count', coalesce(max(p.total_count), 0)
  )
  into result
  from (
    select 
      p.*,
      count(*) over() as total_count
    from (
      select 
        p.*,
        (
          select array_agg(snippet)
          from (
            select ts_headline(
              'english',
              s.chunk,
              query,
              'StartSel=<mark>, StopSel=</mark>, MaxFragments=2'
            ) as snippet
            from projects_search s
            where s.project_id = p.id
            and s.fts @@ query
            order by ts_rank(s.fts, query) desc
            limit 3
          ) t
        ) as snippets

      from projects p
      where p.user_id = curr_user
      and exists (
        select 1
        from projects_search s
        where s.project_id = p.id
        and s.fts @@ query
      )
    ) p
    order by p.created_at desc
    limit page_size
    offset page * page_size
  ) p;

  return result;
end;
$$;