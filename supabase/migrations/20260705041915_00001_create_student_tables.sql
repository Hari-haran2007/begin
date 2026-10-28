/*
# Beyond Grades - Student Growth Intelligence Platform Schema

1. Purpose
This creates a comprehensive student evaluation system that tracks multiple growth parameters
beyond traditional grades, including technical skills, projects, internships, certifications,
and soft skills with an AI-generated overall growth score.

2. New Tables
- `profiles` - Student personal information linked to auth.users
- `skills` - Technical and soft skills with proficiency levels
- `projects` - Student projects with descriptions and links
- `certifications` - Professional certifications and courses
- `internships` - Work experience and internships
- `hackathons` - Competition participations and achievements
- `workshops` - Workshop and seminar attendance
- `semester_performance` - Academic performance per semester
- `growth_metrics` - Calculated overall growth score and classification

3. Security
- All tables have RLS enabled
- Owner-scoped CRUD: students can only access their own data
- Friend comparison uses a separate mechanism that doesn't expose private dashboards
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  roll_number text NOT NULL,
  department text NOT NULL,
  semester integer NOT NULL DEFAULT 1,
  phone text,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(roll_number),
  UNIQUE(email)
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profiles" ON profiles;
CREATE POLICY "select_own_profiles" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_profiles" ON profiles;
CREATE POLICY "insert_own_profiles" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_profiles" ON profiles;
CREATE POLICY "update_own_profiles" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_profiles" ON profiles;
CREATE POLICY "delete_own_profiles" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Skills table
CREATE TABLE IF NOT EXISTS skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_name text NOT NULL,
  skill_type text NOT NULL CHECK (skill_type IN ('technical', 'programming', 'soft', 'communication')),
  proficiency integer NOT NULL DEFAULT 0 CHECK (proficiency >= 0 AND proficiency <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_skills" ON skills;
CREATE POLICY "select_own_skills" ON skills FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_skills" ON skills;
CREATE POLICY "insert_own_skills" ON skills FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_skills" ON skills;
CREATE POLICY "update_own_skills" ON skills FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_skills" ON skills;
CREATE POLICY "delete_own_skills" ON skills FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  technologies text[] DEFAULT '{}',
  github_url text,
  live_url text,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_projects" ON projects;
CREATE POLICY "select_own_projects" ON projects FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_projects" ON projects;
CREATE POLICY "insert_own_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_projects" ON projects;
CREATE POLICY "update_own_projects" ON projects FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_projects" ON projects;
CREATE POLICY "delete_own_projects" ON projects FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Certifications table
CREATE TABLE IF NOT EXISTS certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  issuer text NOT NULL,
  issue_date date NOT NULL,
  expiry_date date,
  credential_url text,
  credential_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_certifications" ON certifications;
CREATE POLICY "select_own_certifications" ON certifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_certifications" ON certifications;
CREATE POLICY "insert_own_certifications" ON certifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_certifications" ON certifications;
CREATE POLICY "update_own_certifications" ON certifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_certifications" ON certifications;
CREATE POLICY "delete_own_certifications" ON certifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Internships table
CREATE TABLE IF NOT EXISTS internships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company text NOT NULL,
  role text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date,
  is_current boolean DEFAULT false,
  skills text[] DEFAULT '{}',
  stipend numeric,
  location text,
  work_type text CHECK (work_type IN ('remote', 'onsite', 'hybrid')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE internships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_internships" ON internships;
CREATE POLICY "select_own_internships" ON internships FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_internships" ON internships;
CREATE POLICY "insert_own_internships" ON internships FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_internships" ON internships;
CREATE POLICY "update_own_internships" ON internships FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_internships" ON internships;
CREATE POLICY "delete_own_internships" ON internships FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Hackathons table
CREATE TABLE IF NOT EXISTS hackathons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  organizer text NOT NULL,
  date date NOT NULL,
  team_name text,
  result text CHECK (result IN ('participated', 'winner', 'runner_up', 'finalist')),
  prize text,
  project_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hackathons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_hackathons" ON hackathons;
CREATE POLICY "select_own_hackathons" ON hackathons FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_hackathons" ON hackathons;
CREATE POLICY "insert_own_hackathons" ON hackathons FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_hackathons" ON hackathons;
CREATE POLICY "update_own_hackathons" ON hackathons FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_hackathons" ON hackathons;
CREATE POLICY "delete_own_hackathons" ON hackathons FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Workshops table
CREATE TABLE IF NOT EXISTS workshops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  organizer text NOT NULL,
  date date NOT NULL,
  duration_hours numeric,
  skills_gained text[] DEFAULT '{}',
  certificate_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_workshops" ON workshops;
CREATE POLICY "select_own_workshops" ON workshops FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_workshops" ON workshops;
CREATE POLICY "insert_own_workshops" ON workshops FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_workshops" ON workshops;
CREATE POLICY "update_own_workshops" ON workshops FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_workshops" ON workshops;
CREATE POLICY "delete_own_workshops" ON workshops FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Semester Performance table
CREATE TABLE IF NOT EXISTS semester_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  semester integer NOT NULL CHECK (semester >= 1 AND semester <= 8),
  sgpa numeric(4,2) NOT NULL CHECK (sgpa >= 0 AND sgpa <= 10),
  credits_earned integer NOT NULL DEFAULT 0,
  credits_total integer NOT NULL DEFAULT 0,
  attendance_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (attendance_percent >= 0 AND attendance_percent <= 100),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, semester)
);

ALTER TABLE semester_performance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_semester_performance" ON semester_performance;
CREATE POLICY "select_own_semester_performance" ON semester_performance FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_semester_performance" ON semester_performance;
CREATE POLICY "insert_own_semester_performance" ON semester_performance FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_semester_performance" ON semester_performance;
CREATE POLICY "update_own_semester_performance" ON semester_performance FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_semester_performance" ON semester_performance;
CREATE POLICY "delete_own_semester_performance" ON semester_performance FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Growth Metrics table
CREATE TABLE IF NOT EXISTS growth_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_score numeric(5,2) NOT NULL DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
  growth_stage text NOT NULL DEFAULT 'Medium' CHECK (growth_stage IN ('Risk', 'Medium', 'Good', 'Advanced', 'Placement Ready')),
  marks_score numeric(5,2) DEFAULT 0,
  cgpa_score numeric(5,2) DEFAULT 0,
  attendance_score numeric(5,2) DEFAULT 0,
  technical_skills_score numeric(5,2) DEFAULT 0,
  programming_score numeric(5,2) DEFAULT 0,
  coding_score numeric(5,2) DEFAULT 0,
  projects_score numeric(5,2) DEFAULT 0,
  certifications_score numeric(5,2) DEFAULT 0,
  internships_score numeric(5,2) DEFAULT 0,
  aptitude_score numeric(5,2) DEFAULT 0,
  communication_score numeric(5,2) DEFAULT 0,
  hackathons_score numeric(5,2) DEFAULT 0,
  workshops_score numeric(5,2) DEFAULT 0,
  soft_skills_score numeric(5,2) DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE growth_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_growth_metrics" ON growth_metrics;
CREATE POLICY "select_own_growth_metrics" ON growth_metrics FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_growth_metrics" ON growth_metrics;
CREATE POLICY "insert_own_growth_metrics" ON growth_metrics FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_growth_metrics" ON growth_metrics;
CREATE POLICY "update_own_growth_metrics" ON growth_metrics FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_growth_metrics" ON growth_metrics;
CREATE POLICY "delete_own_growth_metrics" ON growth_metrics FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Friend connections for comparison feature
CREATE TABLE IF NOT EXISTS friend_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requestee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(requester_id, requestee_id),
  CHECK (requester_id != requestee_id)
);

ALTER TABLE friend_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_friend_connections" ON friend_connections;
CREATE POLICY "select_own_friend_connections" ON friend_connections FOR SELECT
  TO authenticated USING (auth.uid() = requester_id OR auth.uid() = requestee_id);

DROP POLICY IF EXISTS "insert_own_friend_connections" ON friend_connections;
CREATE POLICY "insert_own_friend_connections" ON friend_connections FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "update_own_friend_connections" ON friend_connections;
CREATE POLICY "update_own_friend_connections" ON friend_connections FOR UPDATE
  TO authenticated USING (auth.uid() = requester_id OR auth.uid() = requestee_id) 
  WITH CHECK (auth.uid() = requester_id OR auth.uid() = requestee_id);

-- Comparison view for friends (anonymized comparison data)
CREATE TABLE IF NOT EXISTS comparison_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  cgpa numeric(4,2),
  project_count integer DEFAULT 0,
  coding_score numeric(5,2),
  technical_avg numeric(5,2),
  communication_score numeric(5,2),
  internship_count integer DEFAULT 0,
  certification_count integer DEFAULT 0,
  overall_score numeric(5,2),
  department text,
  semester integer,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE comparison_data ENABLE ROW LEVEL SECURITY;

-- Allow users to read comparison data of their accepted friends only
DROP POLICY IF EXISTS "select_comparison_data" ON comparison_data;
CREATE POLICY "select_comparison_data" ON comparison_data FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM friend_connections 
      WHERE status = 'accepted' 
      AND (
        (requester_id = auth.uid() AND requestee_id = comparison_data.user_id)
        OR 
        (requestee_id = auth.uid() AND requester_id = comparison_data.user_id)
      )
    )
  );

DROP POLICY IF EXISTS "insert_own_comparison_data" ON comparison_data;
CREATE POLICY "insert_own_comparison_data" ON comparison_data FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_comparison_data" ON comparison_data;
CREATE POLICY "update_own_comparison_data" ON comparison_data FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_user_id ON skills(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_certifications_user_id ON certifications(user_id);
CREATE INDEX IF NOT EXISTS idx_internships_user_id ON internships(user_id);
CREATE INDEX IF NOT EXISTS idx_hackathons_user_id ON hackathons(user_id);
CREATE INDEX IF NOT EXISTS idx_workshops_user_id ON workshops(user_id);
CREATE INDEX IF NOT EXISTS idx_semester_performance_user_id ON semester_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_growth_metrics_user_id ON growth_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_connections_parties ON friend_connections(requester_id, requestee_id);
