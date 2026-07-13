import AnnouncementsList from '@/components/AnnouncementsList'

export default function ParentAnnouncementsPage() {
  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-brand-blue mb-8">Announcements</h1>
      <AnnouncementsList role="parent" />
    </div>
  )
}
