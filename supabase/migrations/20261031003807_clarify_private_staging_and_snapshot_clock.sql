-- Explicit deny policy documents the administrator-only import staging table.
create policy staging_not_client_accessible on barbell_private.legacy_imports
for all to authenticated using(false) with check(false);
create index legacy_imports_claimed_by_idx on barbell_private.legacy_imports(claimed_by);
alter table public.barbell_snapshots alter column created_at set default clock_timestamp();
