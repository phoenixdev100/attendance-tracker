const { Pool } = require('pg');
const ExcelJS = require('exceljs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const BATCH_SIZE = 1000;

const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

const importExcelData = async (filePath) => {
  const client = await pool.connect();

  try {
    // console.log('📊 Starting Excel data import...');

    // Read the Excel file
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];

    // Convert to JSON
    const data = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row
      const rowData = {};
      row.eachCell((cell, colNumber) => {
        const header = worksheet.getRow(1).getCell(colNumber).value;
        if (header) {
          const headerKey = header.toString().toLowerCase().replace(/\s+/g, '_');
          rowData[headerKey] = cell.value;
        }
      });
      if (Object.keys(rowData).length > 0) {
        data.push(rowData);
      }
    });

    if (data.length === 0) {
      throw new Error('Excel file is empty or has no valid data');
    }

    // console.log(`📋 Found ${data.length} rows in Excel file`);
    // console.log('📝 Sample row:', data[0]);

    await client.query('BEGIN');

    // Clear existing data (optional - comment out if you want to keep existing data)
    // console.log('🧹 Clearing existing data...');
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
// Process each row
for (const row of data) {

  // Accept either "team_id" or "team_ids"
  const teamIdsValue =
    row['Team IDs'] ||
    row['team_ids'] ||
    row['team_id'] ||
    row['Team ID'] ||
    row['TeamID'] ||
    row['TEAM_ID'];

  const systemId =
    row['System ID'] ||
    row['system_id'] ||
    row['SystemID'] ||
    row['SYSTEM_ID'];

  const name =
    row['Name'] ||
    row['name'] ||
    row['Student Name'] ||
    row['student_name'];

  const dept =
    row['Department'] ||
    row['department'] ||
    row['dept'] ||
    row['Stream'] ||
    row['stream'] ||
    row['Department/Stream'];

  const section =
    row['Section'] ||
    row['section'] ||
    row['SECTION'];

  const year =
    row['Year'] ||
    row['year'] ||
    row['YEAR'];

  if (!systemId || !name || !teamIdsValue || !dept || !section || !year) {
    continue;
  }

  const cleanSystemId = systemId.toString().trim().toUpperCase();
  const cleanName = name.toString().trim();
  const cleanDept = dept.toString().trim();
  const cleanSection = section.toString().trim();
  const cleanYear = year ? parseInt(year.toString().trim()) : null;

  // Store student once
  studentsData.set(cleanSystemId, {
    systemId: cleanSystemId,
    name: cleanName,
    dept: cleanDept,
    section: cleanSection,
    year: cleanYear
  });

  // Split comma-separated team IDs
  const teamIds = teamIdsValue
    .toString()
    .split(',')
    .map(id => id.trim().toUpperCase())
    .filter(Boolean);

  for (const cleanTeamId of teamIds) {

    uniqueTeams.add(cleanTeamId);

    const exists = studentTeamRelations.some(rel =>
      rel.studentId === cleanSystemId &&
      rel.teamId === cleanTeamId
    );

    if (!exists) {

      studentTeamRelations.push({
        studentId: cleanSystemId,
        teamId: cleanTeamId
      });

    } else {

      duplicateEntries.push({
        systemId: cleanSystemId,
        name: cleanName,
        teamId: cleanTeamId,
        dept: cleanDept
      });

    }
  }
}

    // Insert teams in batches
    console.log('👥 Inserting teams...');
    const teamList = Array.from(uniqueTeams);
    for (const chunk of chunkArray(teamList, BATCH_SIZE)) {
      const placeholders = [];
      const values = [];
      let index = 1;
      for (const teamId of chunk) {
        placeholders.push(`($${index}, $${index + 1})`);
        values.push(teamId, `Team ${teamId}`);
        index += 2;
      }
      await client.query(
        `INSERT INTO teams (team_id, team_name) VALUES ${placeholders.join(', ')} ON CONFLICT (team_id) DO NOTHING`,
        values
      );
    }

    // Insert students in batches using upsert
    console.log('👤 Inserting students...');
    const uniqueStudents = Array.from(studentsData.values());
    for (const chunk of chunkArray(uniqueStudents, BATCH_SIZE)) {
      const placeholders = [];
      const values = [];
      let index = 1;
      for (const student of chunk) {
        placeholders.push(`($${index}, $${index + 1}, $${index + 2}, $${index + 3}, $${index + 4})`);
        values.push(student.systemId, student.name, student.dept, student.section, student.year);
        index += 5;
      }
      await client.query(
        `INSERT INTO students (system_id, name, dept, section, year) VALUES ${placeholders.join(', ')} ON CONFLICT (system_id) DO UPDATE SET name = EXCLUDED.name, dept = EXCLUDED.dept, section = EXCLUDED.section, year = EXCLUDED.year`,
        values
      );
    }

    // Insert student-team relationships in batches
    console.log('🔗 Inserting student-team relationships...');
    for (const chunk of chunkArray(studentTeamRelations, BATCH_SIZE)) {
      const placeholders = [];
      const values = [];
      let index = 1;
      for (const relation of chunk) {
        placeholders.push(`($${index}, $${index + 1})`);
        values.push(relation.studentId, relation.teamId);
        index += 2;
      }
      await client.query(
        `INSERT INTO student_teams (student_id, team_id) VALUES ${placeholders.join(', ')} ON CONFLICT (student_id, team_id) DO NOTHING`,
        values
      );
    }

    // Create attendance records in batches
    console.log('📅 Creating attendance records...');
    const today = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format
    for (const chunk of chunkArray(uniqueStudents, BATCH_SIZE)) {
      const placeholders = [];
      const values = [];
      let index = 1;
      for (const student of chunk) {
        placeholders.push(`($${index}, $${index + 1}, $${index + 2})`);
        values.push(student.systemId, today, false);
        index += 3;
      }
      await client.query(
        `INSERT INTO attendance (student_id, date, present) VALUES ${placeholders.join(', ')} ON CONFLICT (student_id, date) DO NOTHING`,
        values
      );
    }

    await client.query('COMMIT');

    console.log('🎉 Excel import completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Total rows processed: ${data.length}`);
    console.log(`   - Teams: ${uniqueTeams.size}`);
    console.log(`   - Students: ${uniqueStudents.length}`);
    console.log(`   - Student-team relationships: ${studentTeamRelations.length}`);

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
  // console.log('Usage: node import-excel-data.js [path-to-excel-file]');
  process.exit(1);
}

// console.log(`📁 Importing from: ${filePath}`);
importExcelData(filePath)
  .then(() => {
    // console.log('✅ Import process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  });
