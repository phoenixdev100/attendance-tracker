const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
    console.log('🚀 Setting up attendance tracker database...\n');

    // Create PostgreSQL connection
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        // Test connection
        console.log('📡 Testing database connection...');
        const client = await pool.connect();
        console.log('✅ Connected to PostgreSQL database successfully!\n');
        
        // Read and execute schema.sql
        console.log('📋 Creating tables and inserting sample data...');
        const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        
        await client.query(schemaSQL);
        console.log('✅ Database schema created successfully!\n');
        
        // Verify tables were created
        console.log('🔍 Verifying table creation...');
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `);
        
        console.log('📊 Created tables:');
        tablesResult.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });
        
        // Check students count
        const studentsResult = await client.query('SELECT COUNT(*) as count FROM students');
        console.log(`\n👥 Total students inserted: ${studentsResult.rows[0].count}`);
        
        // Check attendance data
        const attendanceResult = await client.query('SELECT COUNT(*) as count FROM attendance');
        console.log(`📋 Total attendance records: ${attendanceResult.rows[0].count}`);
        
        // Today's stats
        const todayStats = await client.query(`
            SELECT 
                COUNT(*) as total_marked,
                SUM(CASE WHEN present = true THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN present = false THEN 1 ELSE 0 END) as absent
            FROM attendance 
            WHERE date = CURRENT_DATE
        `);
        
        if (todayStats.rows[0].total_marked > 0) {
            const stats = todayStats.rows[0];
            console.log(`\n📊 Today's attendance preview:`);
            console.log(`   - Present: ${stats.present}`);
            console.log(`   - Absent: ${stats.absent}`);
            console.log(`   - Not yet marked: ${studentsResult.rows[0].count - stats.total_marked}`);
        }
        
        // Show sample students
        const sampleStudents = await client.query('SELECT system_id, name FROM students ORDER BY system_id LIMIT 8');
        console.log('\n📝 Sample students for testing:');
        sampleStudents.rows.forEach(student => {
            console.log(`   - ${student.system_id}: ${student.name}`);
        });
        
        console.log('\n💡 Test the app with these student IDs!');
        
        client.release();
        console.log('\n🎉 Database setup completed successfully!');
        console.log('\n🚀 You can now run: npm start');
        
    } catch (error) {
        console.error('❌ Error setting up database:', error.message);
        
        if (error.message.includes('connect')) {
            console.log('\n💡 Connection troubleshooting:');
            console.log('   1. Check your DATABASE_URL in .env file');
            console.log('   2. Ensure your NeonDB instance is running');
            console.log('   3. Verify your connection string format');
            console.log('   4. Check if your IP is whitelisted (if applicable)');
        }
        
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run setup
setupDatabase();
