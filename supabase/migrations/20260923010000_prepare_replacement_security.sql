-- Reproduce the database and Storage security baseline in a fresh replacement
-- Supabase project. Apply Prisma migrations first so all six tables exist.

do $$
declare
  application_table text;
begin
  foreach application_table in array array[
    'UserProfile',
    'Booking',
    'ProfessionalProfile',
    'Payment',
    'AdditionalAuthorization',
    '_prisma_migrations'
  ]
  loop
    if to_regclass(format('%I.%I', 'public', application_table)) is not null then
      execute format(
        'alter table %I.%I enable row level security',
        'public',
        application_table
      );
      execute format(
        'revoke all privileges on table %I.%I from anon, authenticated',
        'public',
        application_table
      );
    end if;
  end loop;
end
$$;

-- The application uploads only through its server-side service-role client.
-- Keep applicant files private and enforce the same limits as the API routes.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'professional-documents',
    'professional-documents',
    false,
    2097152,
    array['application/pdf', 'image/png', 'image/jpeg']::text[]
  ),
  (
    'professional-profiles',
    'professional-profiles',
    false,
    5242880,
    array['image/png', 'image/jpeg']::text[]
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Allow public read professional documents" on storage.objects;
drop policy if exists "Allow public read professional profiles" on storage.objects;
drop policy if exists "Allow public uploads to professional documents" on storage.objects;
drop policy if exists "Allow public uploads to professional profiles" on storage.objects;
