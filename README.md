### Project Portfolio Dashboard

Minimal, responsive dashboard to track and manage multiple projects, visualize progress, and export reports. Built with React + TypeScript + Vite, Supabase, and Tailwind utility classes.

#### 1) Environment

Create a `.env.local` in the project root with:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

For your project:

```
VITE_SUPABASE_URL=https://jmquidnvnjalkykfcxsm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptcXVpZG52bmphbGt5a2ZjeHNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MzEwMjAsImV4cCI6MjA3NzQwNzAyMH0.JkZDLpp0BzIx1Wa3CgechQ2RCmIccF_kYpeik6QWMd0
```

#### 2) Supabase schema

Run the following SQL in Supabase SQL editor to create tables and RLS policies:

```sql
-- Projects table
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active', -- active | paused | completed
  progress int not null default 0,       -- 0..100
  image_url text,
  created_at timestamptz not null default now()
);

-- Enable RLS and basic policies
alter table projects enable row level security;
create policy "Allow read own" on projects for select using (auth.uid() = user_id);
create policy "Allow insert own" on projects for insert with check (auth.uid() = user_id);
create policy "Allow update own" on projects for update using (auth.uid() = user_id);
create policy "Allow delete own" on projects for delete using (auth.uid() = user_id);

-- Auto-assign user_id via trigger
create or replace function set_project_user()
returns trigger as $$
begin
  if NEW.user_id is null then NEW.user_id := auth.uid(); end if;
  return NEW;
end; $$ language plpgsql security definer;

drop trigger if exists projects_set_user on projects;
create trigger projects_set_user before insert on projects for each row execute function set_project_user();

-- Steps table (per-project checklist)
create table if not exists project_steps (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table project_steps enable row level security;
create policy "Read own steps" on project_steps for select using (auth.uid() = user_id);
create policy "Insert own steps" on project_steps for insert with check (auth.uid() = user_id);
create policy "Update own steps" on project_steps for update using (auth.uid() = user_id);
create policy "Delete own steps" on project_steps for delete using (auth.uid() = user_id);

create or replace function set_project_step_user()
returns trigger as $$
begin
  if NEW.user_id is null then NEW.user_id := auth.uid(); end if;
  return NEW;
end; $$ language plpgsql security definer;

drop trigger if exists project_steps_set_user on project_steps;
create trigger project_steps_set_user before insert on project_steps for each row execute function set_project_step_user();

-- Notes per step (optional text + image)
create table if not exists project_step_notes (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references project_steps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  note_text text,
  image_url text,
  created_at timestamptz not null default now()
);

alter table project_step_notes enable row level security;
create policy "Read own notes" on project_step_notes for select using (auth.uid() = user_id);
create policy "Insert own notes" on project_step_notes for insert with check (auth.uid() = user_id);
create policy "Update own notes" on project_step_notes for update using (auth.uid() = user_id);
create policy "Delete own notes" on project_step_notes for delete using (auth.uid() = user_id);

create or replace function set_step_note_user()
returns trigger as $$
begin
  if NEW.user_id is null then NEW.user_id := auth.uid(); end if;
  return NEW;
end; $$ language plpgsql security definer;

drop trigger if exists project_step_notes_set_user on project_step_notes;
create trigger project_step_notes_set_user before insert on project_step_notes for each row execute function set_step_note_user();
```

#### 3) Install and run

```
npm install
npm run dev
```

#### 4) Features

- Authentication (email/password + magic link)
- Projects CRUD with progress and status
- Dashboard overview with progress chart
- CSV export of projects for reports
- Minimal, mobile-responsive UI using utility classes and Heroicons

#### 5) Notes

- If you change the schema, update types accordingly.
- All data is scoped per authenticated user via RLS.

#### 6) Project images (Supabase Storage)

1. In Supabase Storage, create a new bucket named `project-images` and set it to public.
2. Add RLS-like storage policies so only signed-in users can write to their folder:

```sql
-- Storage policies for bucket "project-images"
-- Allow anyone to read public files
create policy "Public read" on storage.objects for select using ( bucket_id = 'project-images' );

-- Allow authenticated users to insert into their own folder
create policy "User can upload to own folder" on storage.objects for insert
with check (
  bucket_id = 'project-images' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update/delete their own files
create policy "User can modify own files" on storage.objects for update using (
  bucket_id = 'project-images' and
  (storage.foldername(name))[1] = auth.uid()::text
);
create policy "User can delete own files" on storage.objects for delete using (
  bucket_id = 'project-images' and
  (storage.foldername(name))[1] = auth.uid()::text
);
```

3. The app uploads selected image files to this bucket and stores the public URL in `projects.image_url`.

Notes images: you can reuse the same `project-images` bucket; files are placed under `<auth.uid()>/notes/<uuid>.<ext>`. The same storage policies above cover these paths.
