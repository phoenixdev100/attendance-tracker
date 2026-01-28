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
    await client.query('DELETE FROM student_teams');
    await client.query('DELETE FROM students');
    await client.query('DELETE FROM teams');
    
    // Collect unique team IDs, students, and student-team relationships
    const uniqueTeams = new Set();
    const studentsData = new Map(); // Use Map to store unique students by system_id
    const studentTeamRelations = []; // Store all student-team relationships
    const duplicateEntries = [];
    
    // Process each row
    for (const row of data) {
      // Extract data from Excel columns (adjust column names based on your Excel file)
      const teamId = row['Team ID'] || row['team_id'] || row['TeamID'] || row['TEAM_ID'];
      const systemId = row['System ID'] || row['system_id'] || row['SystemID'] || row['SYSTEM_ID'];
      const name = row['Name'] || row['name'] || row['Student Name'] || row['student_name'];
      const dept = row['Department'] || row['dept'] || row['Stream'] || row['stream'] || row['Department/Stream'];
      
      if (!systemId || !name || !teamId || !dept) {
        console.log(`⚠️ Skipping row - missing required fields (system_id, name, team_id, or department):`, row);
        continue;
      }
      
      // Clean and format data
      const cleanTeamId = teamId.toString().trim().toUpperCase();
      const cleanSystemId = systemId.toString().trim().toUpperCase();
      const cleanName = name.toString().trim();
      const cleanDept = dept.toString().trim();
      
      // Add to unique teams (team ID is now required)
      uniqueTeams.add(cleanTeamId);
      
      // Store unique student data (will overwrite if same student with different team)
      studentsData.set(cleanSystemId, {
        systemId: cleanSystemId,
        name: cleanName,
        dept: cleanDept
      });
      
      // Store student-team relationship (allows multiple teams per student)
      const relationKey = `${cleanSystemId}-${cleanTeamId}`;
      const existingRelation = studentTeamRelations.find(rel => 
        rel.studentId === cleanSystemId && rel.teamId === cleanTeamId
      );
      
      if (existingRelation) {
        duplicateEntries.push({
          systemId: cleanSystemId,
          name: cleanName,
          teamId: cleanTeamId,
          dept: cleanDept
        });
        console.log(`⚠️ Duplicate student-team relationship: ${cleanSystemId} - ${cleanTeamId} (skipping duplicate)`);
      } else {
        studentTeamRelations.push({
          studentId: cleanSystemId,
          teamId: cleanTeamId
        });
      }
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
    
    // Insert students (unique students only)
    console.log('👤 Inserting students...');
    let insertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    const uniqueStudents = Array.from(studentsData.values());
    
    for (const student of uniqueStudents) {
      try {
        // Check if student already exists
        const existingStudent = await client.query(
          'SELECT system_id FROM students WHERE system_id = $1',
          [student.systemId]
        );
        
        if (existingStudent.rows.length > 0) {
          // Update existing student
          await client.query(
            'UPDATE students SET name = $1, dept = $2 WHERE system_id = $3',
            [student.name, student.dept, student.systemId]
          );
          updatedCount++;
        } else {
          // Insert new student
          await client.query(
            'INSERT INTO students (system_id, name, dept) VALUES ($1, $2, $3)',
            [student.systemId, student.name, student.dept]
          );
          insertedCount++;
        }
      } catch (error) {
        console.log(`⚠️ Error processing student ${student.systemId}:`, error.message);
        errorCount++;
      }
    }
    
    // Insert student-team relationships
    console.log('🔗 Inserting student-team relationships...');
    let relationCount = 0;
    
    for (const relation of studentTeamRelations) {
      try {
        await client.query(
          'INSERT INTO student_teams (student_id, team_id) VALUES ($1, $2) ON CONFLICT (student_id, team_id) DO NOTHING',
          [relation.studentId, relation.teamId]
        );
        relationCount++;
      } catch (error) {
        console.log(`⚠️ Error creating relationship ${relation.studentId}-${relation.teamId}:`, error.message);
        errorCount++;
      }
    }
    
    // Create attendance records for all students with present=false (absent)
    console.log('📅 Creating attendance records (all absent)...');
    const today = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format
    let attendanceCount = 0;
    
    for (const student of uniqueStudents) {
      try {
        // Insert attendance record with present=false for today
        await client.query(
          'INSERT INTO attendance (student_id, date, present, recorded_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) ON CONFLICT (student_id, date) DO NOTHING',
          [student.systemId, today, false]
        );
        attendanceCount++;
      } catch (error) {
        console.log(`⚠️ Error creating attendance for ${student.systemId}:`, error.message);
      }
    }
    
    await client.query('COMMIT');
    
    console.log('🎉 Excel import completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Total rows processed: ${data.length}`);
    console.log(`   - Teams created: ${uniqueTeams.size}`);
    console.log(`   - Students inserted: ${insertedCount}`);
    console.log(`   - Students updated: ${updatedCount}`);
    console.log(`   - Student-team relationships created: ${relationCount}`);
    console.log(`   - Duplicate relationships skipped: ${duplicateEntries.length}`);
    console.log(`   - Attendance records created (absent): ${attendanceCount}`);
    console.log(`   - Errors: ${errorCount}`);
    
    if (duplicateEntries.length > 0) {
      console.log('\n⚠️ Duplicate entries found:');
      duplicateEntries.forEach(dup => {
        console.log(`   - ${dup.systemId}: ${dup.name} (${dup.teamId})`);
      });
    }
    
    // Show sample of imported data
    const sampleData = await client.query(`
      SELECT s.system_id, s.name, s.dept, 
             STRING_AGG(t.team_name, ', ') as teams
      FROM students s
      LEFT JOIN student_teams st ON s.system_id = st.student_id
      LEFT JOIN teams t ON st.team_id = t.team_id
      GROUP BY s.system_id, s.name, s.dept
      ORDER BY s.system_id
      LIMIT 10
    `);
    
    console.log('\n📋 Sample imported data:');
    console.log('System ID | Name | Teams | Department');
    console.log('----------|------|-------|------------');
    sampleData.rows.forEach(row => {
      console.log(`${row.system_id.padEnd(9)} | ${row.name.padEnd(15)} | ${(row.teams || 'None').padEnd(7)} | ${row.dept || 'Not Set'}`);
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
const filePath = process.argv[2] || path.join(__dirname, 'uploads/students.xlsx');

// Check if file exists
const fs = require('fs');
if (!fs.existsSync(filePath)) {
  console.error(`❌ File not found: ${filePath}`);
  console.log('Usage: node import-excel-data.js [path-to-excel-file]');
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
