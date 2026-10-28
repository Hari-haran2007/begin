/*
# Staff Role and Verification/AI Fields Migration
*/

-- 1. Add Staff fields to profiles
ALTER TABLE profiles ADD COLUMN role text DEFAULT 'student' CHECK (role IN ('student', 'staff'));
ALTER TABLE profiles ADD COLUMN staff_id text;

-- 2. Add verification and AI fields to projects
ALTER TABLE projects ADD COLUMN verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'reupload'));
ALTER TABLE projects ADD COLUMN staff_comment text;
ALTER TABLE projects ADD COLUMN ai_status text CHECK (ai_status IN ('Original', 'Duplicate', 'Fake', 'Low Quality', 'Missing Information'));
ALTER TABLE projects ADD COLUMN ai_confidence_score numeric(5,2);
ALTER TABLE projects ADD COLUMN ai_explanation text;
ALTER TABLE projects ADD COLUMN ai_recommendation text;
ALTER TABLE projects ADD COLUMN file_url text;

-- 3. Add verification and AI fields to certifications
ALTER TABLE certifications ADD COLUMN verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'reupload'));
ALTER TABLE certifications ADD COLUMN staff_comment text;
ALTER TABLE certifications ADD COLUMN ai_status text CHECK (ai_status IN ('Original', 'Duplicate', 'Fake', 'Low Quality', 'Missing Information'));
ALTER TABLE certifications ADD COLUMN ai_confidence_score numeric(5,2);
ALTER TABLE certifications ADD COLUMN ai_explanation text;
ALTER TABLE certifications ADD COLUMN ai_recommendation text;
ALTER TABLE certifications ADD COLUMN file_url text;

-- 4. Add verification and AI fields to internships
ALTER TABLE internships ADD COLUMN verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'reupload'));
ALTER TABLE internships ADD COLUMN staff_comment text;
ALTER TABLE internships ADD COLUMN ai_status text CHECK (ai_status IN ('Original', 'Duplicate', 'Fake', 'Low Quality', 'Missing Information'));
ALTER TABLE internships ADD COLUMN ai_confidence_score numeric(5,2);
ALTER TABLE internships ADD COLUMN ai_explanation text;
ALTER TABLE internships ADD COLUMN ai_recommendation text;
ALTER TABLE internships ADD COLUMN file_url text;

-- 5. Add verification and AI fields to hackathons
ALTER TABLE hackathons ADD COLUMN verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'reupload'));
ALTER TABLE hackathons ADD COLUMN staff_comment text;
ALTER TABLE hackathons ADD COLUMN ai_status text CHECK (ai_status IN ('Original', 'Duplicate', 'Fake', 'Low Quality', 'Missing Information'));
ALTER TABLE hackathons ADD COLUMN ai_confidence_score numeric(5,2);
ALTER TABLE hackathons ADD COLUMN ai_explanation text;
ALTER TABLE hackathons ADD COLUMN ai_recommendation text;
ALTER TABLE hackathons ADD COLUMN file_url text;

-- 6. Add verification and AI fields to workshops
ALTER TABLE workshops ADD COLUMN verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'reupload'));
ALTER TABLE workshops ADD COLUMN staff_comment text;
ALTER TABLE workshops ADD COLUMN ai_status text CHECK (ai_status IN ('Original', 'Duplicate', 'Fake', 'Low Quality', 'Missing Information'));
ALTER TABLE workshops ADD COLUMN ai_confidence_score numeric(5,2);
ALTER TABLE workshops ADD COLUMN ai_explanation text;
ALTER TABLE workshops ADD COLUMN ai_recommendation text;
ALTER TABLE workshops ADD COLUMN file_url text;

-- 7. Add verification and AI fields to semester_performance
ALTER TABLE semester_performance ADD COLUMN verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'reupload'));
ALTER TABLE semester_performance ADD COLUMN staff_comment text;
ALTER TABLE semester_performance ADD COLUMN ai_status text CHECK (ai_status IN ('Original', 'Duplicate', 'Fake', 'Low Quality', 'Missing Information'));
ALTER TABLE semester_performance ADD COLUMN ai_confidence_score numeric(5,2);
ALTER TABLE semester_performance ADD COLUMN ai_explanation text;
ALTER TABLE semester_performance ADD COLUMN ai_recommendation text;
ALTER TABLE semester_performance ADD COLUMN file_url text;


-- 8. Update RLS Policies to allow staff to select and update everything
-- We create a function to check if a user is staff
CREATE OR REPLACE FUNCTION is_staff()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'staff'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles
CREATE POLICY "staff_select_all_profiles" ON profiles FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "staff_update_all_profiles" ON profiles FOR UPDATE TO authenticated USING (is_staff());

-- Projects
CREATE POLICY "staff_select_all_projects" ON projects FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "staff_update_all_projects" ON projects FOR UPDATE TO authenticated USING (is_staff());

-- Certifications
CREATE POLICY "staff_select_all_certifications" ON certifications FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "staff_update_all_certifications" ON certifications FOR UPDATE TO authenticated USING (is_staff());

-- Internships
CREATE POLICY "staff_select_all_internships" ON internships FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "staff_update_all_internships" ON internships FOR UPDATE TO authenticated USING (is_staff());

-- Hackathons
CREATE POLICY "staff_select_all_hackathons" ON hackathons FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "staff_update_all_hackathons" ON hackathons FOR UPDATE TO authenticated USING (is_staff());

-- Workshops
CREATE POLICY "staff_select_all_workshops" ON workshops FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "staff_update_all_workshops" ON workshops FOR UPDATE TO authenticated USING (is_staff());

-- Semester Performance
CREATE POLICY "staff_select_all_semester_performance" ON semester_performance FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "staff_update_all_semester_performance" ON semester_performance FOR UPDATE TO authenticated USING (is_staff());

-- Skills (Wait, verification for Skills was also requested)
ALTER TABLE skills ADD COLUMN verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'reupload'));
ALTER TABLE skills ADD COLUMN staff_comment text;
ALTER TABLE skills ADD COLUMN ai_status text CHECK (ai_status IN ('Original', 'Duplicate', 'Fake', 'Low Quality', 'Missing Information'));
ALTER TABLE skills ADD COLUMN ai_confidence_score numeric(5,2);
ALTER TABLE skills ADD COLUMN ai_explanation text;
ALTER TABLE skills ADD COLUMN ai_recommendation text;
ALTER TABLE skills ADD COLUMN file_url text;

CREATE POLICY "staff_select_all_skills" ON skills FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "staff_update_all_skills" ON skills FOR UPDATE TO authenticated USING (is_staff());
