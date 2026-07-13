import { createClient } from '@/lib/supabase/server'
import { AuditLogFilterForm, AuditLogPagination } from './AuditLogControls'

const PAGE_SIZE = 50

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { action?: string; resource_type?: string; from?: string; to?: string; page?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meRaw } = await supabase.from('users').select('institution_id').eq('id', user!.id).single()
  const institutionId = (meRaw as unknown as { institution_id: string } | null)?.institution_id ?? ''

  const page = Math.max(1, Number(searchParams.page ?? '1') || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('audit_log')
    .select('id, action, resource_type, resource_id, metadata, ip_address, created_at, users(full_name, email)', { count: 'exact' })
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false })

  if (searchParams.action) query = query.ilike('action', `%${searchParams.action}%`)
  if (searchParams.resource_type) query = query.eq('resource_type', searchParams.resource_type)
  if (searchParams.from) query = query.gte('created_at', `${searchParams.from}T00:00:00`)
  if (searchParams.to) query = query.lte('created_at', `${searchParams.to}T23:59:59`)

  const { data: entriesRaw, count } = await query.range(from, to)

  // AUDIT FIX (build): embedded-relation selects collapse to `never` under
  // this project's generated Database types — cast once here, same pattern
  // used across every other admin page in this app.
  const entries = (entriesRaw ?? []) as unknown as Array<{
    id: string; action: string; resource_type: string | null; resource_id: string | null
    metadata: Record<string, unknown> | null; ip_address: string | null; created_at: string
    users: { full_name: string | null; email: string } | null
  }>

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-2">Audit Log</h1>
      <p className="text-sm text-gray-500 mb-6">
        A tamper-evident record of sensitive actions across this institution (each entry is hash-chained to the previous one).
      </p>

      <AuditLogFilterForm
        action={searchParams.action ?? ''}
        resourceType={searchParams.resource_type ?? ''}
        from={searchParams.from ?? ''}
        to={searchParams.to ?? ''}
      />

      <div className="card">
        <h2 className="text-lg font-display font-semibold text-brand-blue mb-4">
          {total.toLocaleString()} entr{total === 1 ? 'y' : 'ies'} · Page {page} of {totalPages}
        </h2>
        {entries.length === 0 ? (
          <p className="text-gray-400 text-sm">No matching audit log entries.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">When</th>
                  <th className="pb-2 font-medium">Actor</th>
                  <th className="pb-2 font-medium">Action</th>
                  <th className="pb-2 font-medium">Resource</th>
                  <th className="pb-2 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id} className="border-b border-gray-50 align-top">
                    <td className="py-2 text-gray-500 whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                    <td className="py-2 text-gray-700">{e.users?.full_name ?? e.users?.email ?? 'System'}</td>
                    <td className="py-2 text-gray-800 font-medium">{e.action}</td>
                    <td className="py-2 text-gray-500">
                      {e.resource_type ?? '—'}{e.resource_id ? ` · ${e.resource_id.slice(0, 8)}` : ''}
                      {e.metadata && Object.keys(e.metadata).length > 0 && (
                        <details className="mt-1">
                          <summary className="text-xs text-brand-blue cursor-pointer">details</summary>
                          <pre className="text-xs text-gray-400 mt-1 whitespace-pre-wrap">{JSON.stringify(e.metadata, null, 2)}</pre>
                        </details>
                      )}
                    </td>
                    <td className="py-2 text-gray-400 text-xs">{e.ip_address ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <AuditLogPagination
          page={page}
          totalPages={totalPages}
          action={searchParams.action ?? ''}
          resourceType={searchParams.resource_type ?? ''}
          from={searchParams.from ?? ''}
          to={searchParams.to ?? ''}
        />
      </div>
    </div>
  )
}
