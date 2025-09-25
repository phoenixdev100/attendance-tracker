const { Pool } = require('pg');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const importExcelData = async (filePath) => {
  const client = await pool.connect();
  
  try {
    console.log('📊 Starting Excel data import...');
    
    // Read the Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    if (data.length === 0) {
      throw new Error('Excel file is empty or has no valid data');
    }
    
    console.log(`📋 Found ${data.length} rows in Excel file`);
    console.log('📝 Sample row:', data[0]);
    
    await client.query('BEGIN');
    
    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🧹 Clearing existing data...');
    await client.query('DELETE FROM attendance');
    await client.query('DELETE FROM students');
    await client.query('DELETE FROM teams');
    
    // Collect unique team IDs
    const uniqueTeams = new Set();
    const studentsData = [];
    
    // Process each row
    for (const row of data) {
      // Extract data from Excel columns (adjust column names based on your Excel file)
      const teamId = row['Team ID'] || row['team_id'] || row['TeamID'] || row['TEAM_ID'];
      const systemId = row['System ID'] || row['system_id'] || row['SystemID'] || row['SYSTEM_ID'];
      const name = row['Name'] || row['name'] || row['Student Name'] || row['student_name'];
      const dept = row['Department'] || row['dept'] || row['Stream'] || row['stream'] || row['Department/Stream'];
      
      if (!systemId || !name) {
        console.log(`⚠️ Skipping row - missing system_id or name:`, row);
        continue;
      }
      
      // Clean and format data
      const cleanTeamId = teamId ? teamId.toString().trim().toUpperCase() : null;
      const cleanSystemId = systemId.toString().trim().toUpperCase();
      const cleanName = name.toString().trim();
      const cleanDept = dept ? dept.toString().trim() : null;
      
      // Add to unique teams if team ID exists
      if (cleanTeamId) {
        uniqueTeams.add(cleanTeamId);
      }
      
      studentsData.push({
        teamId: cleanTeamId,
        systemId: cleanSystemId,
        name: cleanName,
        dept: cleanDept
      });
    }
    
    // Insert teams first (without team names and descriptions for now)
    console.log('👥 Inserting teams...');
    for (const teamId of uniqueTeams) {
      try {
        await client.query(
          'INSERT INTO teams (team_id, team_name) VALUES ($1, $2) ON CONFLICT (team_id) DO NOTHING',
          [teamId, `Team ${teamId}`] // Temporary team name, you can update later
        );
      } catch (error) {
        console.log(`⚠️ Error inserting team ${teamId}:`, error.message);
      }
    }
    
    // Insert students
    console.log('👨‍🎓 Inserting students...');
    let insertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const student of studentsData) {
      try {
        // Check if student exists
        const existingStudent = await client.query(
          'SELECT system_id FROM students WHERE system_id = $1',
          [student.systemId]
        );
        
        if (existingStudent.rows.length > 0) {
          // Update existing student
          await client.query(
            'UPDATE students SET name = $1, team_id = $2, dept = $3 WHERE system_id = $4',
            [student.name, student.teamId, student.dept, student.systemId]
          );
          updatedCount++;
        } else {
          // Insert new student
          await client.query(
            'INSERT INTO students (system_id, name, team_id, dept) VALUES ($1, $2, $3, $4)',
            [student.systemId, student.name, student.teamId, student.dept]
          );
          insertedCount++;
        }
      } catch (error) {
        console.log(`⚠️ Error processing student ${student.systemId}:`, error.message);
        errorCount++;
      }
    }
    
    await client.query('COMMIT');
    
    console.log('🎉 Excel import completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Teams created: ${uniqueTeams.size}`);
    console.log(`   - Students inserted: ${insertedCount}`);
    console.log(`   - Students updated: ${updatedCount}`);
    console.log(`   - Errors: ${errorCount}`);
    
    // Show sample of imported data
    const sampleData = await client.query(`
      SELECT s.system_id, s.name, s.team_id, s.dept, t.team_name
      FROM students s
      LEFT JOIN teams t ON s.team_id = t.team_id
      ORDER BY s.team_id, s.system_id
      LIMIT 10
    `);
    
    console.log('\n📋 Sample imported data:');
    console.log('System ID | Name | Team | Department');
    console.log('----------|------|------|------------');
    sampleData.rows.forEach(row => {
      console.log(`${row.system_id.padEnd(9)} | ${row.name.padEnd(15)} | ${(row.team_id || 'None').padEnd(7)} | ${row.dept || 'Not Set'}`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error importing Excel data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

// Get file path from command line argument or use default
const filePath = process.argv[2] || path.join(__dirname, '../uploads/students.xlsx');

// Check if file exists
const fs = require('fs');
if (!fs.existsSync(filePath)) {
  console.error(`❌ File not found: ${filePath}`);
  console.log('Usage: node scripts/import-excel-data.js [path-to-excel-file]');
  process.exit(1);
}

console.log(`📁 Importing from: ${filePath}`);
importExcelData(filePath)
  .then(() => {
    console.log('✅ Import process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  });
