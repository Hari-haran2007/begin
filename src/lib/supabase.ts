import { createClient } from '@supabase/supabase-js';

console.log(import.meta.env);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export type Profile = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  roll_number: string;
  department: string;
  semester: number;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
  role?: 'student' | 'staff';
  staff_id?: string;
};

export type Skill = {
  id: string;
  user_id: string;
  skill_name: string;
  skill_type: 'technical' | 'programming' | 'soft' | 'communication';
  proficiency: number;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  technologies: string[];
  github_url?: string;
  live_url?: string;
  start_date?: string;
  end_date?: string;
  status: 'in_progress' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  verification_status?: 'pending' | 'approved' | 'rejected' | 'reupload';
  staff_comment?: string;
  ai_status?: 'Original' | 'Duplicate' | 'Fake' | 'Low Quality' | 'Missing Information';
  ai_confidence_score?: number;
  ai_explanation?: string;
  ai_recommendation?: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
};

export type Certification = {
  id: string;
  user_id: string;
  name: string;
  issuer: string;
  issue_date: string;
  expiry_date?: string;
  credential_url?: string;
  credential_id?: string;
  created_at: string;
  verification_status?: 'pending' | 'approved' | 'rejected' | 'reupload';
  staff_comment?: string;
  ai_status?: 'Original' | 'Duplicate' | 'Fake' | 'Low Quality' | 'Missing Information';
  ai_confidence_score?: number;
  ai_explanation?: string;
  ai_recommendation?: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
};

export type Internship = {
  id: string;
  user_id: string;
  company: string;
  role: string;
  description?: string;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  skills: string[];
  stipend?: number;
  location?: string;
  work_type?: 'remote' | 'onsite' | 'hybrid';
  created_at: string;
  verification_status?: 'pending' | 'approved' | 'rejected' | 'reupload';
  staff_comment?: string;
  ai_status?: 'Original' | 'Duplicate' | 'Fake' | 'Low Quality' | 'Missing Information';
  ai_confidence_score?: number;
  ai_explanation?: string;
  ai_recommendation?: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
};

export type Hackathon = {
  id: string;
  user_id: string;
  name: string;
  organizer: string;
  date: string;
  team_name?: string;
  result?: 'participated' | 'winner' | 'runner_up' | 'finalist';
  prize?: string;
  project_name?: string;
  created_at: string;
  verification_status?: 'pending' | 'approved' | 'rejected' | 'reupload';
  staff_comment?: string;
  ai_status?: 'Original' | 'Duplicate' | 'Fake' | 'Low Quality' | 'Missing Information';
  ai_confidence_score?: number;
  ai_explanation?: string;
  ai_recommendation?: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
};

export type Workshop = {
  id: string;
  user_id: string;
  name: string;
  organizer: string;
  date: string;
  duration_hours?: number;
  skills_gained: string[];
  certificate_url?: string;
  created_at: string;
  verification_status?: 'pending' | 'approved' | 'rejected' | 'reupload';
  staff_comment?: string;
  ai_status?: 'Original' | 'Duplicate' | 'Fake' | 'Low Quality' | 'Missing Information';
  ai_confidence_score?: number;
  ai_explanation?: string;
  ai_recommendation?: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
};

export type SemesterPerformance = {
  id: string;
  user_id: string;
  semester: number;
  sgpa: number;
  credits_earned: number;
  credits_total: number;
  attendance_percent: number;
  created_at: string;
  verification_status?: 'pending' | 'approved' | 'rejected' | 'reupload';
  staff_comment?: string;
  ai_status?: 'Original' | 'Duplicate' | 'Fake' | 'Low Quality' | 'Missing Information';
  ai_confidence_score?: number;
  ai_explanation?: string;
  ai_recommendation?: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
};

export type GrowthMetrics = {
  id: string;
  user_id: string;
  overall_score: number;
  growth_stage: 'Risk' | 'Medium' | 'Good' | 'Advanced' | 'Placement Ready';
  marks_score: number;
  cgpa_score: number;
  attendance_score: number;
  technical_skills_score: number;
  programming_score: number;
  coding_score: number;
  projects_score: number;
  certifications_score: number;
  internships_score: number;
  aptitude_score: number;
  communication_score: number;
  hackathons_score: number;
  workshops_score: number;
  soft_skills_score: number;
  updated_at: string;
};

export type ComparisonData = {
  id: string;
  user_id: string;
  cgpa: number;
  project_count: number;
  coding_score: number;
  technical_avg: number;
  communication_score: number;
  internship_count: number;
  certification_count: number;
  overall_score: number;
  department: string;
  semester: number;
  updated_at: string;
};

export type FriendConnection = {
  id: string;
  requester_id: string;
  requestee_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
};
