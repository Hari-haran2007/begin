const fs = require('fs');
const path = require('path');
const staffDir = path.join(__dirname, 'src', 'pages', 'staff');

let profilePath = path.join(staffDir, 'StaffStudentProfile.tsx');
if (fs.existsSync(profilePath)) {
  let content = fs.readFileSync(profilePath, 'utf-8');
  if (!content.includes('const [error, setError]')) {
    content = content.replace(/const \[loading, setLoading\] = useState\(true\);/, "const [loading, setLoading] = useState(true);\n  const [error, setError] = useState('');");
    
    const fetchRegex = /const fetchStudentProfile = async \(\) => \{[\s\S]*?setLoading\(false\);\s*\};/;
    const newFetch = `const fetchStudentProfile = async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/staff/students', {
        headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` }
      });
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      const student = data.find((s: any) => s.id === userId || s.user_id === userId);
      if (student) {
        setStudent(student);
        if (student.growth_metrics) setMetrics(student.growth_metrics);
        if (student.latest_performance) setPerformance([student.latest_performance]);
      } else {
        throw new Error('Student not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };`;
    content = content.replace(fetchRegex, newFetch);
    
    content = content.replace(/\{\s*loading \? \([\s\S]*?animate-spin" \/>\s*<\/div>\s*\)\s*:\s*!student \? \(/, `{loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={fetchStudentProfile} className="px-4 py-2 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-500">Retry</button>
        </div>
      ) : !student ? (`);
    
    fs.writeFileSync(profilePath, content);
    console.log('Updated StaffStudentProfile');
  }
}
