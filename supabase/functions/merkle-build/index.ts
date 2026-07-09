// HE-SYSTEM Edge Function: merkle-build
// Ported from archive/HP SYSTEM/backend/services/merkle.js — daily Merkle tree
// of attendance records for tamper-proof, independently verifiable auditing.
// Reimplemented on Web Crypto (SHA-256) instead of the `merkletreejs` npm
// package, so it runs on the Deno edge runtime with no extra dependencies.
//
// Note on proofs: pairs are always hashed in sorted byte order (matching the
// original's `{ sortPairs: true }`), so verification never needs to know
// left/right — it just repeatedly combines the running hash with each proof
// node. The `position` field is kept in the response for human debugging only.
//
// POST body: { action: 'build' | 'proof' | 'verify', ... }
//   build:  { institution_id, date? }               (date defaults to today, UTC)
//   proof:  { attendance_id }
//   verify: { leaf, proof, root }                    (no DB access — pure check)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isServiceRoleCall, requireCaller, requireStaff, authErrorResponse } from '../_shared/auth.ts'
import { requireFields, isValidationError, validationErrorResponse } from '../_shared/resilience.ts'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

// deno-lint-ignore no-explicit-any
async function logAudit(
  supabase: any,
  opts: { institutionId?: string | null; userId?: string | null; action: string; resourceType?: string; resourceId?: string; metadata?: Record<string, unknown> },
) {
  try {
    const { data: prev } = await supabase.from('audit_log').select('hash').order('created_at', { ascending: false }).limit(1).maybeSingle()
    const prevHash = (prev as { hash?: string } | null)?.hash ?? 'GENESIS'
    const ts = new Date().toISOString()
    const chainInput = `${prevHash}|${opts.userId ?? 'anon'}|${opts.action}|${ts}`
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(chainInput))
    const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
    await supabase.from('audit_log').insert({
      institution_id: opts.institutionId ?? null, user_id: opts.userId ?? null, action: opts.action,
      resource_type: opts.resourceType ?? null, resource_id: opts.resourceId ?? null,
      metadata: opts.metadata ?? {}, prev_hash: prevHash, hash, created_at: ts,
    })
  } catch (err) {
    console.error('logAudit failed (non-fatal):', err)
  }
}

function supa() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}
function fromHex(hex: string) {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}
async function sha256(bytes: Uint8Array) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource))
}
function compareBytes(a: Uint8Array, b: Uint8Array) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i]
  return a.length - b.length
}
async function combine(a: Uint8Array, b: Uint8Array) {
  const [x, y] = compareBytes(a, b) <= 0 ? [a, b] : [b, a]
  const buf = new Uint8Array(x.length + y.length)
  buf.set(x, 0)
  buf.set(y, x.length)
  return sha256(buf)
}

async function buildLevels(leaves: Uint8Array[]): Promise<Uint8Array[][]> {
  const levels: Uint8Array[][] = [leaves]
  let current = leaves
  while (current.length > 1) {
    const next: Uint8Array[] = []
    for (let i = 0; i < current.length; i += 2) {
      next.push(i + 1 < current.length ? await combine(current[i], current[i + 1]) : current[i])
    }
    levels.push(next)
    current = next
  }
  return levels
}

function getProof(levels: Uint8Array[][], leafIndex: number) {
  const proof: { position: 'left' | 'right'; data: string }[] = []
  let idx = leafIndex
  for (let level = 0; level < levels.length - 1; level++) {
    const layer = levels[level]
    const isRightNode = idx % 2 === 1
    const pairIndex = isRightNode ? idx - 1 : idx + 1
    if (pairIndex < layer.length) proof.push({ position: isRightNode ? 'left' : 'right', data: toHex(layer[pairIndex]) })
    idx = Math.floor(idx / 2)
  }
  return proof
}

function canonicalLeafInput(r: { id: string; student_id: string; class_id: string; marked_at: string; status: string }) {
  return JSON.stringify({ id: r.id, studentId: r.student_id, classId: r.class_id, markedAt: r.marked_at, status: r.status })
}

serve(async (req) => {
  const supabase = supa()
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  const action = body.action as string

  try {
    requireFields(body, ['action'])
  } catch (err) {
    if (isValidationError(err)) return validationErrorResponse(err)
    throw err
  }

  try {
  if (action === 'verify') {
    try {
      requireFields(body, ['leaf', 'proof', 'root'])
    } catch (err) {
      if (isValidationError(err)) return validationErrorResponse(err)
      throw err
    }
    const { leaf, proof, root } = body as { leaf: string; proof: { data: string }[]; root: string }
    if (!Array.isArray(proof)) return json({ error: 'proof must be an array' }, 400)
    let current = fromHex(leaf)
    for (const p of proof) current = await combine(current, fromHex(p.data))
    return json({ valid: toHex(current) === root })
  }

  if (action === 'build') {
    // AUDIT FIX: previously anyone could trigger a full rebuild for any (or
    // every) institution. Only cron/service-role or staff may do this.
    if (!isServiceRoleCall(req)) {
      try {
        await requireStaff(req)
      } catch (err) {
        return authErrorResponse(err)
      }
    }

    const { institution_id, date } = body as { institution_id?: string; date?: string }
    const dateStr = date ?? new Date().toISOString().slice(0, 10)

    // No institution_id => cron mode: build for every active institution.
    let institutionIds: string[]
    if (institution_id) {
      institutionIds = [institution_id]
    } else {
      const { data: institutions } = await supabase.from('institutions').select('id').eq('is_active', true)
      institutionIds = (institutions ?? []).map((i: { id: string }) => i.id)
    }

    const results = []
    for (const instId of institutionIds) {
      const { data: records } = await supabase
        .from('attendance_records')
        .select('id, student_id, class_id, marked_at, status')
        .eq('institution_id', instId)
        .gte('marked_at', `${dateStr}T00:00:00Z`)
        .lt('marked_at', `${dateStr}T23:59:59.999Z`)
        .order('marked_at', { ascending: true })

      if (!records || records.length === 0) {
        results.push({ institutionId: instId, date: dateStr, recordCount: 0 })
        continue
      }

      const leaves = await Promise.all(records.map(async (r) => sha256(new TextEncoder().encode(canonicalLeafInput(r)))))
      const levels = await buildLevels(leaves)
      const root = toHex(levels[levels.length - 1][0])
      const leafHashesHex = leaves.map(toHex)

      await supabase.from('daily_merkle_roots').upsert(
        { institution_id: instId, date: dateStr, root_hash: root, record_count: records.length, leaf_hashes: leafHashesHex, updated_at: new Date().toISOString() },
        { onConflict: 'institution_id,date' },
      )

      results.push({ institutionId: instId, date: dateStr, rootHash: root, recordCount: records.length })
    }

    await logAudit(supabase, {
      institutionId: institution_id ?? null, action: 'merkle.build',
      resourceType: 'daily_merkle_roots', metadata: { date: dateStr, institutionCount: institutionIds.length },
    })

    return json(institution_id ? results[0] : { processed: results.length, results })
  }

  if (action === 'proof') {
    try {
      requireFields(body, ['attendance_id'])
    } catch (err) {
      if (isValidationError(err)) return validationErrorResponse(err)
      throw err
    }
    const { attendance_id } = body as { attendance_id: string }

    const { data: record } = await supabase.from('attendance_records').select('id, institution_id, student_id, class_id, marked_at, status').eq('id', attendance_id).single()
    if (!record) return json({ error: 'Record not found' }, 404)

    // AUDIT FIX: previously anyone with an attendance_id could pull the proof
    // (which reveals which student/class/time it belongs to). Restrict to the
    // student themselves, a linked parent, the class's teacher, or staff.
    if (!isServiceRoleCall(req)) {
      try {
        const caller = await requireCaller(req)
        const isStaff = caller.role === 'admin' || caller.role === 'management'
        if (!isStaff) {
          const [{ data: student }, { data: cls }, { data: parentLink }] = await Promise.all([
            supabase.from('students').select('user_id').eq('id', record.student_id).single(),
            supabase.from('classes').select('teacher_id').eq('id', record.class_id).single(),
            supabase.from('parent_student_links').select('id').eq('parent_user_id', caller.userId).eq('student_id', record.student_id).maybeSingle(),
          ])
          const { data: teacherRow } = cls?.teacher_id
            ? await supabase.from('teachers').select('id').eq('user_id', caller.userId).eq('id', cls.teacher_id).maybeSingle()
            : { data: null }
          const allowed = student?.user_id === caller.userId || !!parentLink || !!teacherRow
          if (!allowed) return json({ error: 'Not authorized to view this record' }, 403)
        }
      } catch (err) {
        return authErrorResponse(err)
      }
    }

    const dateStr = new Date(record.marked_at).toISOString().slice(0, 10)
    const { data: rootRec } = await supabase.from('daily_merkle_roots').select('root_hash, leaf_hashes').eq('institution_id', record.institution_id).eq('date', dateStr).single()
    if (!rootRec) return json({ error: 'Merkle tree not yet built for this date — run action=build first' }, 404)

    const leafHex = toHex(await sha256(new TextEncoder().encode(canonicalLeafInput(record))))
    const allLeaves = (rootRec.leaf_hashes as string[]).map(fromHex)
    const leafIndex = (rootRec.leaf_hashes as string[]).indexOf(leafHex)
    if (leafIndex === -1) return json({ error: 'Record not part of the built tree for this date (tree may be stale — rebuild it)' }, 409)

    const levels = await buildLevels(allLeaves)
    const proof = getProof(levels, leafIndex)

    return json({
      attendanceId: attendance_id,
      date: dateStr,
      leafHash: leafHex,
      proof,
      rootHash: rootRec.root_hash,
      howToVerify: 'POST { action: "verify", leaf, proof, root } to this same function — no DB access needed, anyone can independently check it.',
    })
  }

  return json({ error: 'Invalid action' }, 400)
  } catch (err) {
    console.error('merkle-build unhandled error:', err)
    return json({ error: 'Internal error', detail: err instanceof Error ? err.message : String(err) }, 500)
  }
})
