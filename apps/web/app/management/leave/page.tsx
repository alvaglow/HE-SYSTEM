// Management shares the identical leave-approval view as Admin (same RLS
// scope — both roles pass is_admin_or_above()) — reuse the component instead
// of duplicating the query/markup.
export { default } from '../../admin/leave/page'
