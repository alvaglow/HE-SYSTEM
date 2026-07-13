-- Batch 4a: Assignments & grading
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  class_id uuid not null references public.classes(id),
  subject_id uuid references public.subjects(id),
  teacher_id uuid not null references public.teachers(id),
  title text not null,
  description text,
  due_at timestamptz,
  max_score numeric not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.students(id),
  content text,
  file_path text,
  submitted_at timestamptz not null default now(),
  score numeric,
  feedback text,
  graded_by uuid references public.teachers(id),
  graded_at timestamptz,
  unique (assignment_id, student_id)
);

alter table public.assignments enable row level security;
alter table public.assignment_submissions enable row level security;

create policy "assignments: admin manage" on public.assignments for all
  using (institution_id = get_my_institution_id() and is_admin_or_above());

create policy "assignments: teacher manage own" on public.assignments for all
  using (teacher_id in (select id from public.teachers where user_id = auth.uid()));

create policy "assignments: student view enrolled" on public.assignments for select
  using (class_id in (
    select ce.class_id from public.class_enrollments ce
    join public.students s on s.id = ce.student_id
    where s.user_id = auth.uid() and ce.is_active = true
  ));

create policy "assignments: parent view children" on public.assignments for select
  using (class_id in (
    select ce.class_id from public.class_enrollments ce
    where ce.student_id in (select student_id from public.parent_student_links where parent_user_id = auth.uid())
      and ce.is_active = true
  ));

create policy "assignment_submissions: admin manage" on public.assignment_submissions for all
  using (
    assignment_id in (select id from public.assignments where institution_id = get_my_institution_id())
    and is_admin_or_above()
  );

create policy "assignment_submissions: teacher manage" on public.assignment_submissions for all
  using (
    assignment_id in (
      select id from public.assignments where teacher_id in (select id from public.teachers where user_id = auth.uid())
    )
  );

create policy "assignment_submissions: student select own" on public.assignment_submissions for select
  using (student_id in (select id from public.students where user_id = auth.uid()));

create policy "assignment_submissions: student insert own" on public.assignment_submissions for insert
  with check (student_id in (select id from public.students where user_id = auth.uid()));

create policy "assignment_submissions: student update own ungraded" on public.assignment_submissions for update
  using (
    student_id in (select id from public.students where user_id = auth.uid())
    and graded_at is null
  );

create policy "assignment_submissions: parent view children" on public.assignment_submissions for select
  using (student_id in (select student_id from public.parent_student_links where parent_user_id = auth.uid()));

-- Storage bucket for submission file uploads (mirrors exam-attachments pattern)
insert into storage.buckets (id, name, public, file_size_limit)
values ('assignment-submissions', 'assignment-submissions', false, 10485760)
on conflict (id) do nothing;

create policy "assignment-submissions: read within institution" on storage.objects for select
  using (bucket_id = 'assignment-submissions' and (storage.foldername(name))[1] = get_my_institution_id()::text);

create policy "assignment-submissions: upload within institution" on storage.objects for insert
  with check (bucket_id = 'assignment-submissions' and (storage.foldername(name))[1] = get_my_institution_id()::text);

create policy "assignment-submissions: staff delete" on storage.objects for delete
  using (bucket_id = 'assignment-submissions' and (storage.foldername(name))[1] = get_my_institution_id()::text and is_admin_or_above());

-- Batch 4b: self-service course registration
alter table public.classes add column if not exists capacity integer;

create or replace function public.enforce_class_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cap integer;
  current_count integer;
begin
  select capacity into cap from classes where id = new.class_id;
  if cap is not null then
    select count(*) into current_count from class_enrollments
      where class_id = new.class_id and is_active = true;
    if current_count >= cap then
      raise exception 'This class is full (capacity %).', cap;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_class_capacity() from public;

drop trigger if exists trg_enforce_class_capacity on public.class_enrollments;
create trigger trg_enforce_class_capacity
  before insert on public.class_enrollments
  for each row execute function public.enforce_class_capacity();

create policy "class_enrollments: student self enroll" on public.class_enrollments for insert
  with check (
    student_id in (select id from public.students where user_id = auth.uid())
    and class_id in (select id from public.classes where institution_id = get_my_institution_id() and is_cancelled = false)
  );

create policy "class_enrollments: student self update" on public.class_enrollments for update
  using (student_id in (select id from public.students where user_id = auth.uid()))
  with check (student_id in (select id from public.students where user_id = auth.uid()));
