/**
 * AUDIT FIX: the homepage links to /api/health twice ("API Health" nav link
 * and footer "API Health Status" link) but no route existed — both were
 * dead 404 links. This is also generally useful as an actual uptime/health
 * check endpoint for deployment monitoring.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const startedAt = Date.now()
  let database: 'ok' | 'error' = 'ok'
  let databaseError: string | null = null

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('institutions').select('id', { count: 'exact', head: true }).limit(1)
    if (error) { database = 'error'; databaseError = error.message }
  } catch (err) {
    database = 'error'
    databaseError = err instanceof Error ? err.message : 'Unknown error'
  }

  const body = {
    status: database === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
    checks: { database, databaseError },
  }

  return NextResponse.json(body, { status: database === 'ok' ? 200 : 503 })
}
