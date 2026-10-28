const fs = require('fs');
const path = require('path');

const staffDir = path.join(__dirname, 'src', 'pages', 'staff');

const filesToUpdate = [
  {
    name: 'StaffStudents.tsx',
    endpoint: 'students',
    fetchFn: 'fetchStudents',
    stateVar: 'students',
    emptyMessage: 'No students found matching your filters.',
    hasHandleAction: false
  },
  {
    name: 'StaffAcademicVerification.tsx',
    endpoint: 'academic-verification',
    fetchFn: 'fetchRecords',
    stateVar: 'records',
    emptyMessage: 'No semester results found.',
    hasHandleAction: true
  },
  {
    name: 'StaffCertificates.tsx',
    endpoint: 'certificates',
    fetchFn: 'fetchCertificates',
    stateVar: 'certificates',
    emptyMessage: 'No certificates found.',
    hasHandleAction: true
  },
  {
    name: 'StaffInternships.tsx',
    endpoint: 'internships',
    fetchFn: 'fetchInternships',
    stateVar: 'internships',
    emptyMessage: 'No internships found.',
    hasHandleAction: true
  },
  {
    name: 'StaffProjects.tsx',
    endpoint: 'projects',
    fetchFn: 'fetchProjects',
    stateVar: 'projects',
    emptyMessage: 'No projects found.',
    hasHandleAction: true
  },
  {
    name: 'StaffSkills.tsx',
    endpoint: 'skills',
    fetchFn: 'fetchSkills',
    stateVar: 'skills',
    emptyMessage: 'No skills found.',
    hasHandleAction: true
  }
];

filesToUpdate.forEach(({ name, endpoint, fetchFn, stateVar, emptyMessage, hasHandleAction }) => {
  const filePath = path.join(staffDir, name);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');

  // Add error state
  if (!content.includes('const [error, setError] = useState')) {
    content = content.replace(
      /const \[loading, setLoading\] = useState\(true\);/g,
      "const [loading, setLoading] = useState(true);\n  const [error, setError] = useState('');"
    );
  }

  // Replace fetch function
  const fetchRegex = new RegExp(`const ${fetchFn} = async \\(\\) => \\{[\\s\\S]*?setLoading\\(false\\);\\s*\\};`);
  const newFetch = `const ${fetchFn} = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/staff/${endpoint}', {
        headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` }
      });
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      set${stateVar.charAt(0).toUpperCase() + stateVar.slice(1)}(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };`;
  content = content.replace(fetchRegex, newFetch);

  // Replace handleAction if it exists
  if (hasHandleAction) {
    const handleActionRegex = /const handleAction = async \([\s\S]*?setActionLoading\(false\);\s*\};/;
    const newHandleAction = `const handleAction = async (id: string, status: 'approved' | 'rejected' | 'reupload') => {
    setActionLoading(true);
    try {
      const response = await fetch(\`http://localhost:5000/api/staff/${endpoint}/\${id}\`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${localStorage.getItem('token')}\`
        },
        body: JSON.stringify({ verification_status: status, staff_comment: remark })
      });
      if (!response.ok) throw new Error('Failed to update status');
      
      set${stateVar.charAt(0).toUpperCase() + stateVar.slice(1)}(prev => prev.map(r => r.id === id ? { ...r, verification_status: status, staff_comment: remark } : r));
      ${stateVar === 'records' ? 'setSelectedRecord(null)' : stateVar === 'certificates' ? 'setSelectedCert(null)' : stateVar === 'internships' ? 'setSelectedInternship(null)' : stateVar === 'projects' ? 'setSelectedProject(null)' : stateVar === 'skills' ? 'setSelectedSkill(null)' : ''};
      setRemark('');
    } catch (err) {
      console.error(err);
      alert('Failed to update status. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };`;
    content = content.replace(handleActionRegex, newHandleAction);
  }

  // Update JSX to handle error state
  const jsxLoadingRegex = /\{\s*loading \? \([\s\S]*?animate-spin" \/>\s*<\/div>\s*\)\s*:\s*\(/;
  const jsxLoadingReplacement = `{loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={${fetchFn}} className="px-4 py-2 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-500">Retry</button>
        </div>
      ) : (`;
  content = content.replace(jsxLoadingRegex, jsxLoadingReplacement);

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${name}`);
});
