-- Batch 5a: Support / Helpdesk tickets
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  created_by uuid not null references public.users(id),
  category text not null default 'general' check (category in ('general', 'it', 'academic', 'financial', 'facilities')),
  subject text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  assigned_to uuid references public.users(id),
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;

create policy "support_tickets: creator create own" on public.support_tickets for insert
  with check (created_by = auth.uid() and institution_id = get_my_institution_id());

create policy "support_tickets: creator view own" on public.support_tickets for select
  using (created_by = auth.uid());

create policy "support_tickets: admin manage" on public.support_tickets for all
  using (institution_id = get_my_institution_id() and is_admin_or_above());

create trigger set_updated_at before update on public.support_tickets
  for each row execute function trigger_set_updated_at();

-- Batch 5b: Room / facility booking
create table public.room_bookings (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  room_id uuid not null references public.campus_rooms(id),
  booked_by uuid not null references public.users(id),
  purpose text not null,
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

alter table public.room_bookings enable row level security;

create policy "room_bookings: institution members view" on public.room_bookings for select
  using (institution_id = get_my_institution_id());

create policy "room_bookings: self create" on public.room_bookings for insert
  with check (booked_by = auth.uid() and institution_id = get_my_institution_id());

create policy "room_bookings: self cancel own" on public.room_bookings for update
  using (booked_by = auth.uid())
  with check (booked_by = auth.uid());

create policy "room_bookings: admin manage" on public.room_bookings for all
  using (institution_id = get_my_institution_id() and is_admin_or_above());

create or replace function public.enforce_room_booking_no_overlap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  conflict_count integer;
begin
  if new.status = 'confirmed' then
    select count(*) into conflict_count from room_bookings
      where room_id = new.room_id
        and booking_date = new.booking_date
        and status = 'confirmed'
        and id <> new.id
        and start_time < new.end_time
        and end_time > new.start_time;
    if conflict_count > 0 then
      raise exception 'This room is already booked for an overlapping time slot.';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_room_booking_no_overlap() from public;

create trigger trg_enforce_room_booking_no_overlap
  before insert or update on public.room_bookings
  for each row execute function public.enforce_room_booking_no_overlap();

-- Batch 5c: Graduation application / degree audit
alter table public.programmes add column if not exists required_credit_hours numeric;

create table public.graduation_applications (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  student_id uuid not null references public.students(id),
  programme_id uuid not null references public.programmes(id),
  total_credit_hours_completed numeric not null default 0,
  cgpa_at_application numeric,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  applied_at timestamptz not null default now(),
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  review_notes text,
  unique (student_id, programme_id)
);

alter table public.graduation_applications enable row level security;

create policy "graduation_applications: student create own" on public.graduation_applications for insert
  with check (student_id in (select id from public.students where user_id = auth.uid()));

create policy "graduation_applications: student view own" on public.graduation_applications for select
  using (student_id in (select id from public.students where user_id = auth.uid()));

create policy "graduation_applications: parent view children" on public.graduation_applications for select
  using (student_id in (select student_id from public.parent_student_links where parent_user_id = auth.uid()));

create policy "graduation_applications: admin manage" on public.graduation_applications for all
  using (institution_id = get_my_institution_id() and is_admin_or_above());
