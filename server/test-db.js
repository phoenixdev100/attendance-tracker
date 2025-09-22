const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const testConnection = async () => {
  try {
    console.log('🔍 Testing database connection...');
    console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    
    const client = await pool.connect();
    console.log('✅ Database connected successfully!');
    
    // Test basic query
    const result = await client.query('SELECT NOW()');
    console.log('⏰ Current database time:', result.rows[0].now);
    
    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('📋 Existing tables:', tablesResult.rows.map(row => row.table_name));
    
    // Check students count
    try {
      const studentsResult = await client.query('SELECT COUNT(*) FROM students');
      console.log('👨‍🎓 Students in database:', studentsResult.rows[0].count);
    } catch (error) {
      console.log('⚠️ Students table does not exist or is empty');
    }
    
    // Check teams count
    try {
      const teamsResult = await client.query('SELECT COUNT(*) FROM teams');
      console.log('👥 Teams in database:', teamsResult.rows[0].count);
    } catch (error) {
      console.log('⚠️ Teams table does not exist or is empty');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
};

testConnection();
