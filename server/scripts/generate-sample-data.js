const ExcelJS = require('exceljs');
const path = require('path');

// Configuration
const NUM_STUDENTS = 1000;
const OUTPUT_FILE = path.join(__dirname, 'uploads', 'sample-students.xlsx');

// Sample data
const departments = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Information Technology', 'Electrical'];
const sections = ['A', 'B', 'C', 'D'];
const years = [1, 2, 3, 4];

// Helper function to generate random system ID
function generateSystemId(index) {
  return `STU${String(index + 1).padStart(4, '0')}`;
}

// Helper function to generate random name
function generateName(index) {
  const firstNames = ['Rahul', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Anjali', 'Raj', 'Pooja', 'Karan', 'Neha', 'Arjun', 'Kavita', 'Mohit', 'Riya', 'Saurabh', 'Divya', 'Nikhil', 'Meera', 'Rohit', 'Sanya'];
  const lastNames = ['Sharma', 'Patel', 'Singh', 'Kumar', 'Verma', 'Gupta', 'Malhotra', 'Reddy', 'Nair', 'Iyer', 'Sharma', 'Patel', 'Singh', 'Kumar', 'Verma', 'Gupta', 'Malhotra', 'Reddy', 'Nair', 'Iyer'];
  return `${firstNames[index % firstNames.length]} ${lastNames[index % lastNames.length]}`;
}

// Helper function to generate random team ID
function generateTeamId(index) {
  const teamCount = 50; // 50 teams
  return `TEAM${String((index % teamCount) + 1).padStart(2, '0')}`;
}

async function generateSampleData() {
  console.log('📊 Generating sample student data...');

  // Create workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Students');

  // Add headers
  worksheet.columns = [
    { header: 'System ID', key: 'system_id', width: 15 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Department', key: 'dept', width: 30 },
    { header: 'Section', key: 'section', width: 10 },
    { header: 'Year', key: 'year', width: 8 },
    { header: 'Team ID', key: 'team_id', width: 15 }
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };

  // Generate student data
  const students = [];
  for (let i = 0; i < NUM_STUDENTS; i++) {
    students.push({
      system_id: generateSystemId(i),
      name: generateName(i),
      dept: departments[i % departments.length],
      section: sections[i % sections.length],
      year: years[i % years.length],
      team_id: generateTeamId(i)
    });
  }

  // Add data to worksheet
  worksheet.addRows(students);

  // Ensure uploads directory exists
  const fs = require('fs');
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Write to file
  await workbook.xlsx.writeFile(OUTPUT_FILE);

  console.log(`✅ Generated ${NUM_STUDENTS} student records`);
  console.log(`📁 File saved to: ${OUTPUT_FILE}`);
  console.log(`📊 Data distribution:`);
  console.log(`   - Departments: ${departments.length}`);
  console.log(`   - Sections: ${sections.length}`);
  console.log(`   - Years: ${years.length}`);
  console.log(`   - Teams: 50`);
  console.log(`🏁 Done!`);
}

generateSampleData().catch(console.error);
