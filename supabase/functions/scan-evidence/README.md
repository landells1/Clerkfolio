# scan-evidence

Known launch gap: this Edge Function still needs a real ClamAV implementation.

The current application upload path calls `/api/upload/verify`, downloads the
uploaded blob with the service role client, validates MIME content with inline
magic-byte checks, and marks `evidence_files.scan_status` as `clean` or
`quarantined`.

Before public launch, replace that interim verification path with a Supabase
Edge Function that fetches the uploaded file from storage, runs ClamAV, and
updates `scan_status` to `clean` or `quarantined`.
