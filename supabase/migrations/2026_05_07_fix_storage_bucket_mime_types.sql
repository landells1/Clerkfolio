-- Fix evidence storage bucket: add all whitelisted MIME types that were missing.
-- Original bucket only had: PDF, JPEG, PNG, DOC, DOCX.
-- Missing: XLSX, PPTX, TXT, HEIC/HEIF — all listed in the app's upload whitelist.
-- Without this, those file types are rejected at the Supabase storage layer even
-- though magic-byte validation and ClamAV scanning accept them.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/heif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain'
]
WHERE id = 'evidence';
