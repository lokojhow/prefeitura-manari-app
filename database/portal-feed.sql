alter table public.app_news add column if not exists status text not null default 'draft';
alter table public.app_news add column if not exists publish_at timestamptz not null default now();
alter table public.app_news add column if not exists event_at timestamptz;
alter table public.app_news add column if not exists event_location text;
alter table public.app_news add column if not exists video_url text;
alter table public.app_news add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.app_news add constraint app_news_status_check check(status in ('draft','published','archived'));
update public.app_news set status=case when active then 'published' else 'archived' end;
create or replace function portal_private.can_news(p_department text,p_publish boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.portal_staff_members s
 where s.user_id=auth.uid() and s.active and (s.role='admin' or
 (s.can_manage_documents and (not p_publish or s.role='manager') and exists
 (select 1 from public.portal_departments d where d.active and d.code=p_department and s.department in (d.name,d.code)))));
$$;
revoke all on function portal_private.can_news(text,boolean) from public;
grant execute on function portal_private.can_news(text,boolean) to anon,authenticated;
drop policy app_news_admin_insert on public.app_news;
drop policy app_news_admin_update on public.app_news;
drop policy app_news_admin_delete on public.app_news;
drop policy app_news_public_read on public.app_news;
create policy app_news_public_read on public.app_news for select using(active and status='published' and publish_at<=now());
create policy app_news_staff_read on public.app_news for select to authenticated using(portal_private.can_news(department_id));
create policy app_news_staff_insert on public.app_news for insert to authenticated with check(portal_private.can_news(department_id,status<>'draft'));
create policy app_news_staff_update on public.app_news for update to authenticated using(portal_private.can_news(department_id,status<>'draft')) with check(portal_private.can_news(department_id,status<>'draft'));
create policy app_news_staff_delete on public.app_news for delete to authenticated using(portal_private.can_news(department_id,true));
grant select on public.app_news to anon,authenticated;
grant insert,update,delete on public.app_news to authenticated;
create table public.app_news_comments(
 id uuid primary key default gen_random_uuid(),news_id uuid not null references public.app_news(id) on delete cascade,
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 author_name text not null check(char_length(trim(author_name)) between 2 and 80),
 body text not null check(char_length(trim(body)) between 1 and 2000),
 status text not null default 'pending' check(status in ('pending','approved','hidden')),
 created_at timestamptz not null default now());
alter table public.app_news_comments enable row level security;
create index app_news_comments_news_status on public.app_news_comments(news_id,status,created_at);
create index app_news_comments_user on public.app_news_comments(user_id);
create policy comments_read on public.app_news_comments for select using(
 exists(select 1 from public.app_news n where n.id=news_id and
 ((n.active and n.status='published' and n.publish_at<=now() and app_news_comments.status='approved') or
 user_id=auth.uid() or portal_private.can_news(n.department_id,true))));
create policy comments_insert on public.app_news_comments for insert to authenticated with check(
 user_id=auth.uid() and status='pending' and exists(select 1 from public.app_news n where n.id=news_id and n.active and n.status='published' and n.publish_at<=now()));
create policy comments_moderate on public.app_news_comments for update to authenticated using(
 exists(select 1 from public.app_news n where n.id=news_id and portal_private.can_news(n.department_id,true))) with check(
 exists(select 1 from public.app_news n where n.id=news_id and portal_private.can_news(n.department_id,true)));
create policy comments_delete on public.app_news_comments for delete to authenticated using(user_id=auth.uid() or exists(select 1 from public.app_news n where n.id=news_id and portal_private.can_news(n.department_id,true)));
grant select on public.app_news_comments to anon,authenticated;
grant insert,delete on public.app_news_comments to authenticated;
grant update(status) on public.app_news_comments to authenticated;
revoke truncate,references,trigger on public.app_news_comments from anon,authenticated;
create policy feed_media_upload on storage.objects for insert to authenticated with check(
 bucket_id='manari-media' and (storage.foldername(name))[1]='feed' and portal_private.can_news((storage.foldername(name))[2]));
