-- ─────────────────────────────────────────────────────────────────────────────
-- Storage buckets for Memoalive
-- Run in Supabase SQL Editor after migration 001 and 002
-- ─────────────────────────────────────────────────────────────────────────────

-- Memory photos & videos (public read so image URLs work in <img> tags)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memory-media',
  'memory-media',
  true,
  52428800,  -- 50 MB
  array['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/quicktime']
)
on conflict (id) do nothing;

-- User avatars (public read)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,   -- 5 MB
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;

-- Storage RLS: any authenticated user can upload to memory-media
create policy "memory_media_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'memory-media');

create policy "memory_media_select" on storage.objects
  for select using (bucket_id = 'memory-media');

create policy "memory_media_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'memory-media' and auth.uid()::text = (storage.foldername(name))[1]);

-- Storage RLS: avatars
create policy "avatars_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars');

create policy "avatars_select" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
