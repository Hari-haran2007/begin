import { API_URL } from '../../lib/api';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, Download, Filter, AlertTriangle, Loader2, 
  TrendingUp, Users, ShieldCheck, CheckCircle 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';

interface ReportCardItem {
  id: string;
  title: string;
  desc: string;
  tag: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
}

export default function StaffReports() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState<string | null>(null);

  const reports: ReportCardItem[] = [
    { 
      id: 'placement', 
      title: 'Placement Readiness Report', 
      desc: 'Detailed CSV export of students evaluated for campus placements with CGPA, skills, certifications, and readiness status.', 
      tag: 'Placement Intelligence', 
      icon: TrendingUp, 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/25'
    },
    { 
      id: 'risk', 
      title: 'Risk Students Analysis', 
      desc: 'Comprehensive audit of students flagged for academic or progression risks with real risk factors and recommended interventions.', 
      tag: 'Early Intervention', 
      icon: AlertTriangle, 
      color: 'text-rose-400', 
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/25'
    },
    { 
      id: 'department', 
      title: 'Department Performance', 
      desc: 'Aggregated growth metrics, average CGPA, and completion rates categorized by academic department and semester.', 
      tag: 'Institutional Analytics', 
      icon: Filter, 
      color: 'text-blue-400', 
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/25'
    },
    { 
      id: 'all_students', 
      title: 'Comprehensive Student Roster', 
      desc: 'Master database export of all registered student profiles with enrolled departments, semesters, CGPA, and growth scores.', 
      tag: 'Master Student Records', 
      icon: Users, 
      color: 'text-purple-400', 
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/25'
    },
  ];

  // Helper to safely escape RFC 4180 CSV values
  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).trim();
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  // Helper to trigger browser download with UTF-8 BOM
  const triggerDownload = (csvContent: string, filename: string) => {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateCSV = async (reportId: string, title: string) => {
    const authToken = token || localStorage.getItem('token');
    if (!authToken) {
      showToast('Authentication token missing. Please sign in again.', 'error');
      return;
    }

    setDownloading(reportId);
    const dateStamp = new Date().toISOString().slice(0, 10);

    try {
      if (reportId === 'placement') {
        const res = await fetch(`${API_URL}/staff/students`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch student records.`);
        const students = await res.json();

        if (!Array.isArray(students) || students.length === 0) {
          showToast('No student records found in the database.', 'info');
          return;
        }

        const headers = [
          'Full Name',
          'Roll Number',
          'Email',
          'Department',
          'Semester',
          'CGPA / SGPA',
          'Overall Growth Score (%)',
          'Growth Stage',
          'Technical Score (%)',
          'Academic Score (%)',
          'Verified Skills Count',
          'Verified Certifications Count',
          'Placement Readiness Assessment'
        ];

        let csvContent = headers.map(escapeCSV).join(',') + '\n';

        students.forEach((s: any) => {
          const score = s.growth_metrics?.overall_score || 0;
          const stage = s.growth_metrics?.growth_stage || 'Enrolled';
          const isReady = stage === 'Placement Ready' || score >= 70;
          const readinessStatus = isReady ? 'Placement Ready' : (score < 40 ? 'At Risk' : 'Developing / On Track');

          const row = [
            s.full_name || '',
            s.roll_number || '',
            s.email || '',
            s.department || '',
            s.semester ?? '',
            s.latest_performance?.sgpa ?? 'N/A',
            `${score}%`,
            stage,
            `${s.growth_metrics?.technical_score || 0}%`,
            `${s.growth_metrics?.academic_score || 0}%`,
            s.skills_count ?? 0,
            s.certificates_count ?? 0,
            readinessStatus
          ];
          csvContent += row.map(escapeCSV).join(',') + '\n';
        });

        triggerDownload(csvContent, `placement_readiness_report_${dateStamp}.csv`);
        showToast('Placement Readiness Report generated and downloaded successfully.', 'success');

      } else if (reportId === 'risk') {
        const res = await fetch(`${API_URL}/staff/ai-risk-analysis`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch risk analysis.`);
        const data = await res.json();
        const riskStudents = Array.isArray(data.students) ? data.students : (Array.isArray(data) ? data : []);

        if (riskStudents.length === 0) {
          showToast('No students currently flagged as high risk in the system.', 'info');
          return;
        }

        const headers = [
          'Full Name',
          'Roll Number',
          'Email',
          'Department',
          'Semester',
          'Current CGPA / SGPA',
          'Overall Growth Score (%)',
          'Growth Stage',
          'Primary Risk Factors',
          'Recommended Action'
        ];

        let csvContent = headers.map(escapeCSV).join(',') + '\n';

        riskStudents.forEach((s: any) => {
          const riskFactorsText = Array.isArray(s.risk_factors) && s.risk_factors.length > 0
            ? s.risk_factors.join('; ')
            : 'Requires mentoring review';

          const row = [
            s.full_name || '',
            s.roll_number || '',
            s.email || '',
            s.department || '',
            s.semester ?? '',
            s.cgpa || s.latest_performance?.sgpa || 'N/A',
            `${s.growth_metrics?.overall_score || 0}%`,
            s.growth_metrics?.growth_stage || 'Risk',
            riskFactorsText,
            s.recommended_action || 'Schedule mentoring session'
          ];
          csvContent += row.map(escapeCSV).join(',') + '\n';
        });

        triggerDownload(csvContent, `risk_students_analysis_${dateStamp}.csv`);
        showToast('Risk Students Analysis generated and downloaded successfully.', 'success');

      } else if (reportId === 'department') {
        const res = await fetch(`${API_URL}/staff/students`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch department records.`);
        const students = await res.json();

        if (!Array.isArray(students) || students.length === 0) {
          showToast('No departmental records found in database.', 'info');
          return;
        }

        // Aggregate by department & semester
        interface DeptAgg {
          dept: string;
          semester: string | number;
          count: number;
          totalGrowth: number;
          cgpaSum: number;
          cgpaCount: number;
          placementReadyCount: number;
          atRiskCount: number;
          certsTotal: number;
          skillsTotal: number;
        }

        const aggMap = new Map<string, DeptAgg>();

        students.forEach((s: any) => {
          const dept = s.department || 'General';
          const sem = s.semester != null ? s.semester : 'All';
          const key = `${dept}__${sem}`;

          if (!aggMap.has(key)) {
            aggMap.set(key, {
              dept,
              semester: sem,
              count: 0,
              totalGrowth: 0,
              cgpaSum: 0,
              cgpaCount: 0,
              placementReadyCount: 0,
              atRiskCount: 0,
              certsTotal: 0,
              skillsTotal: 0
            });
          }

          const agg = aggMap.get(key)!;
          agg.count += 1;
          const score = s.growth_metrics?.overall_score || 0;
          agg.totalGrowth += score;

          const sgpa = Number(s.latest_performance?.sgpa);
          if (!isNaN(sgpa) && sgpa > 0) {
            agg.cgpaSum += sgpa;
            agg.cgpaCount += 1;
          }

          if (s.growth_metrics?.growth_stage === 'Placement Ready' || score >= 70) {
            agg.placementReadyCount += 1;
          }
          if (s.growth_metrics?.growth_stage === 'Risk' || (s.growth_metrics?.overall_score != null && s.growth_metrics.overall_score > 0 && s.growth_metrics.overall_score < 40)) {
            agg.atRiskCount += 1;
          }

          agg.certsTotal += s.certificates_count || 0;
          agg.skillsTotal += s.skills_count || 0;
        });

        const headers = [
          'Academic Department',
          'Semester',
          'Enrolled Students Count',
          'Average Growth Score (%)',
          'Average CGPA',
          'Placement Ready Students',
          'At Risk Students',
          'Verified Certifications Count',
          'Verified Skills Count'
        ];

        let csvContent = headers.map(escapeCSV).join(',') + '\n';

        Array.from(aggMap.values())
          .sort((a, b) => a.dept.localeCompare(b.dept) || String(a.semester).localeCompare(String(b.semester)))
          .forEach(a => {
            const avgGrowth = (a.totalGrowth / a.count).toFixed(1);
            const avgCgpa = a.cgpaCount > 0 ? (a.cgpaSum / a.cgpaCount).toFixed(2) : 'N/A';

            const row = [
              a.dept,
              a.semester,
              a.count,
              `${avgGrowth}%`,
              avgCgpa,
              a.placementReadyCount,
              a.atRiskCount,
              a.certsTotal,
              a.skillsTotal
            ];
            csvContent += row.map(escapeCSV).join(',') + '\n';
          });

        triggerDownload(csvContent, `department_performance_report_${dateStamp}.csv`);
        showToast('Department Performance Report generated and downloaded successfully.', 'success');

      } else {
        // comprehensive student roster
        const res = await fetch(`${API_URL}/staff/students`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch student roster.`);
        const students = await res.json();

        if (!Array.isArray(students) || students.length === 0) {
          showToast('No students enrolled in the system.', 'info');
          return;
        }

        const headers = [
          'Database ID',
          'Full Name',
          'Roll Number',
          'Email Address',
          'Department',
          'Semester',
          'Growth Score (%)',
          'Growth Stage',
          'Latest CGPA / SGPA',
          'Attendance (%)',
          'Verified Skills Count',
          'Verified Certifications Count'
        ];

        let csvContent = headers.map(escapeCSV).join(',') + '\n';

        students.forEach((s: any) => {
          const row = [
            s._id || s.id || '',
            s.full_name || '',
            s.roll_number || '',
            s.email || '',
            s.department || '',
            s.semester ?? '',
            `${s.growth_metrics?.overall_score || 0}%`,
            s.growth_metrics?.growth_stage || 'Enrolled',
            s.latest_performance?.sgpa ?? 'N/A',
            s.latest_performance?.attendance_percent ? `${s.latest_performance.attendance_percent}%` : 'N/A',
            s.skills_count ?? 0,
            s.certificates_count ?? 0
          ];
          csvContent += row.map(escapeCSV).join(',') + '\n';
        });

        triggerDownload(csvContent, `comprehensive_student_roster_${dateStamp}.csv`);
        showToast('Comprehensive Student Roster generated and downloaded successfully.', 'success');
      }
    } catch (err: any) {
      console.error('Error generating report:', err);
      showToast(err.message || 'Failed to generate institutional report.', 'error');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" /> Institutional Data Center
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Reports & Exports</h1>
          <p className="text-gray-400 text-sm mt-1 max-w-2xl leading-relaxed">
            Generate and download verified, real-time institutional intelligence reports and CSV audit exports directly from student database records.
          </p>
        </div>
      </div>

      {/* Two-Column Grid of 4 Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report, index) => {
          const IconComp = report.icon;
          const isBusy = downloading === report.id;
          const isAnyBusy = downloading !== null;

          return (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-blue-500/35 hover:bg-gray-900/80 transition-all duration-300 flex flex-col justify-between shadow-lg shadow-black/40 group relative overflow-hidden"
            >
              {/* Subtle top background highlight on hover */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-2xl rounded-full pointer-events-none group-hover:bg-blue-500/10 transition-colors" />

              <div>
                {/* Card Header: Icon & Tag */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl ${report.bg} ${report.border} border flex items-center justify-center ${report.color} shadow-sm group-hover:scale-105 transition-transform`}>
                    <IconComp className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                    {report.tag}
                  </span>
                </div>

                {/* Card Title & Description */}
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
                  {report.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-6">
                  {report.desc}
                </p>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => generateCSV(report.id, report.title)}
                  disabled={isAnyBusy}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 border border-blue-500/30 font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isBusy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      <span>Generating CSV...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Generate CSV</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
