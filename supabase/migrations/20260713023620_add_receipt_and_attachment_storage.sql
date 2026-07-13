-- Reconstructed from the live database (see 20260712172433_lock_down_security_definer_helpers.sql
-- for context on this batch of un-backfilled migrations).
--
-- Purpose: private storage buckets for fee-payment receipts and exam
-- attachments, scoped per institution via a top-level folder-name check
-- (uploads must live under `<institution_id>/...`).

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('receipts', 'receipts', false, 10485760)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('exam-attachments', 'exam-attachments', false, 10485760)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "receipts: upload within institution" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = get_my_institution_id()::text);
CREATE POLICY "receipts: read within institution" ON storage.objects
  FOR SELECT USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = get_my_institution_id()::text);
CREATE POLICY "receipts: staff delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = get_my_institution_id()::text AND is_admin_or_above());

CREATE POLICY "exam-attachments: upload within institution" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'exam-attachments' AND (storage.foldername(name))[1] = get_my_institution_id()::text);
CREATE POLICY "exam-attachments: read within institution" ON storage.objects
  FOR SELECT USING (bucket_id = 'exam-attachments' AND (storage.foldername(name))[1] = get_my_institution_id()::text);
CREATE POLICY "exam-attachments: staff delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'exam-attachments' AND (storage.foldername(name))[1] = get_my_institution_id()::text AND is_admin_or_above());
