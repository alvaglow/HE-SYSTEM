/**
 * HE-SYSTEM mobile — Supabase Storage upload helper
 *
 * Mirrors the web app's plain `supabase.storage.from(bucket).upload(path, file)`
 * calls (see e.g. apps/web/app/management/finance/ExpenseForm.tsx), adapted
 * for React Native: expo-document-picker returns a local file URI, not a File
 * object, so it has to be fetched into a Blob first. This is the standard
 * Expo + Supabase Storage upload pattern — no expo-file-system/base64
 * conversion needed, since `fetch()` on a local file:// URI already resolves
 * to a working Blob in the Expo runtime.
 */
import * as DocumentPicker from 'expo-document-picker'
import { supabase } from './supabase'

export async function pickAndUpload(bucket: string, pathPrefix: string): Promise<{ path: string | null; error: string | null }> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true })
  if (result.canceled || !result.assets?.[0]) return { path: null, error: null }

  const asset = result.assets[0]
  try {
    const res = await fetch(asset.uri)
    const blob = await res.blob()
    const path = `${pathPrefix}/${Date.now()}-${asset.name}`
    const { error } = await supabase.storage.from(bucket).upload(path, blob, {
      contentType: asset.mimeType ?? 'application/octet-stream',
    })
    if (error) return { path: null, error: error.message }
    return { path, error: null }
  } catch (err) {
    return { path: null, error: err instanceof Error ? err.message : 'Upload failed' }
  }
}
