const fs = require('fs');
const path = require('path');
const staffDir = path.join(__dirname, 'src', 'pages', 'staff');

// Fix StaffLeaderboard
let lbPath = path.join(staffDir, 'StaffLeaderboard.tsx');
if (fs.existsSync(lbPath)) {
  let content = fs.readFileSync(lbPath, 'utf-8');
  if (!content.includes('const [error, setError]')) {
    content = content.replace(/const \[loading, setLoading\] = useState\(true\);/, "const [loading, setLoading] = useState(true);\n  const [error, setError] = useState('');");
    content = content.replace(/const fetchLeaderboard = async \(\) => \{[\s\S]*?setLoading\(false\);\s*\};/, `const fetchLeaderboard = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/staff/students', {
        headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` }
      });
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      setStudents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };`);
    content = content.replace(/\{\s*loading \? \([\s\S]*?animate-spin" \/>\s*<\/div>\s*\)\s*:\s*\(/, `{loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={fetchLeaderboard} className="px-4 py-2 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-500">Retry</button>
        </div>
      ) : (`);
    fs.writeFileSync(lbPath, content);
    console.log('Updated StaffLeaderboard');
  }
}

// Fix StaffAIRiskAnalysis
let riskPath = path.join(staffDir, 'StaffAIRiskAnalysis.tsx');
if (fs.existsSync(riskPath)) {
  let content = fs.readFileSync(riskPath, 'utf-8');
  if (!content.includes('const [error, setError]')) {
    content = content.replace(/const \[loading, setLoading\] = useState\(true\);/, "const [loading, setLoading] = useState(true);\n  const [error, setError] = useState('');");
    content = content.replace(/const fetchAtRiskStudents = async \(\) => \{[\s\S]*?setLoading\(false\);\s*\};/, `const fetchAtRiskStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/staff/students', {
        headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` }
      });
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      setAtRiskStudents(data.filter(s => s.growth_metrics?.growth_stage === 'Risk'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };`);
    content = content.replace(/\{\s*loading \? \([\s\S]*?animate-spin" \/>\s*<\/div>\s*\)\s*:\s*\(/, `{loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={fetchAtRiskStudents} className="px-4 py-2 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-500">Retry</button>
        </div>
      ) : (`);
    fs.writeFileSync(riskPath, content);
    console.log('Updated StaffAIRiskAnalysis');
  }
}
