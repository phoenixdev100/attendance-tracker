const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const seedDatabase = async () => {
    const client = await pool.connect();

    try {
        console.log('🌱 Starting database seeding...');
        console.log('📁 Reading SQL file...');

        // Read the SQL file
        const sqlFilePath = path.join(__dirname, '../dummy-data.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        console.log('🗄️  Executing SQL commands...');

        // Execute the SQL file
        await client.query(sqlContent);

        console.log('✅ Database seeded successfully!');

        // Display summary of created data
        console.log('\n📊 Database Summary:');

        const teamsCount = await client.query('SELECT COUNT(*) FROM teams');
        console.log(`   - Teams: ${teamsCount.rows[0].count}`);

        const studentsCount = await client.query('SELECT COUNT(*) FROM students');
        console.log(`   - Students: ${studentsCount.rows[0].count}`);

        const attendanceCount = await client.query('SELECT COUNT(*) FROM attendance');
        console.log(`   - Attendance Records: ${attendanceCount.rows[0].count}`);

        // Show sample data
        console.log('\n👥 Sample Teams:');
        const teams = await client.query('SELECT team_id, team_name FROM teams LIMIT 5');
        teams.rows.forEach(team => {
            console.log(`   - ${team.team_id}: ${team.team_name}`);
        });

        console.log('\n👨‍🎓 Sample Students:');
        const students = await client.query(`
      SELECT s.system_id, s.name, s.team_id, s.dept 
      FROM students s 
      ORDER BY s.team_id, s.system_id 
      LIMIT 10
    `);
        console.log('   System ID | Name                | Team     | Department');
        console.log('   ----------|---------------------|----------|---------------------------');
        students.rows.forEach(student => {
            const teamId = student.team_id || 'None';
            const dept = student.dept || 'Not Set';
            console.log(`   ${student.system_id.padEnd(9)} | ${student.name.padEnd(19)} | ${teamId.padEnd(8)} | ${dept}`);
        });

        console.log('\n📅 Today\'s Attendance Summary:');
        const todayStats = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE present = true) as present_count,
        COUNT(*) FILTER (WHERE present = false) as absent_count,
        COUNT(*) as total
      FROM attendance 
      WHERE date = CURRENT_DATE
    `);
        const stats = todayStats.rows[0];
        console.log(`   - Present: ${stats.present_count}`);
        console.log(`   - Absent: ${stats.absent_count}`);
        console.log(`   - Total: ${stats.total}`);

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
};

// Run the seeding
seedDatabase()
    .then(() => {
        console.log('\n🎉 Database seeding completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Database seeding failed:', error.message);
        process.exit(1);
    });
