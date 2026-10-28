const fs = require('fs');
const path = require('path');
const staffDir = path.join(__dirname, 'src', 'pages', 'staff');

const filesToUpdate = [
  'StaffStudents.tsx',
  'StaffAcademicVerification.tsx',
  'StaffCertificates.tsx',
  'StaffInternships.tsx',
  'StaffProjects.tsx',
  'StaffSkills.tsx',
  'StaffLeaderboard.tsx',
  'StaffAIRiskAnalysis.tsx',
  'StaffStudentProfile.tsx'
];

filesToUpdate.forEach(name => {
  const filePath = path.join(staffDir, name);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace "if (!response.ok) throw new Error('Failed to fetch data');"
  // with detailed error
  content = content.replace(
    /if \(!response\.ok\) throw new Error\('Failed to fetch data'\);/g,
    `if (!response.ok) {
        const text = await response.text();
        throw new Error(\`Error \${response.status}: \${text}\`);
      }`
  );

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${name}`);
});
