-- Applicant identity documents and profile photos contain personal information.
-- Keep both buckets private and permit access only through the server-side
-- service role, which bypasses storage RLS. Authenticated admins receive
-- short-lived signed URLs from the application.

drop policy if exists "Allow public read professional documents" on storage.objects;
drop policy if exists "Allow public read professional profiles" on storage.objects;
drop policy if exists "Allow public uploads to professional documents" on storage.objects;
drop policy if exists "Allow public uploads to professional profiles" on storage.objects;

update storage.buckets
set
  public = false,
  file_size_limit = 2097152,
  allowed_mime_types = array[
    'application/pdf',
    'image/png',
    'image/jpeg'
  ]::text[]
where id = 'professional-documents';

update storage.buckets
set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array[
    'image/png',
    'image/jpeg'
  ]::text[]
where id = 'professional-profiles';
