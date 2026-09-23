-- Hold the storage confirm URL for presigned uploads whose strategy requires
-- an explicit confirm round-trip. The Edge Function writes it at presign
-- time and clears it when the upload completes. Null for strategies that
-- need no confirm (plain presigned PUT).
alter table public.attachments
  add column if not exists confirm_url text;
