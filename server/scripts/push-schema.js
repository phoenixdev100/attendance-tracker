const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const pushSchema = async () => {
    const client = await pool.connect();

    try {
        console.log('📤 Pushing schema to Neon...');

        const schemaFilePath = path.join(__dirname, '../schema.sql');

        if (!fs.existsSync(schemaFilePath)) {
            throw new Error(`schema.sql not found at ${schemaFilePath}`);
        }

        const schemaContent = fs.readFileSync(schemaFilePath, 'utf8');

        await client.query(schemaContent);

        console.log('✅ Schema pushed successfully!');

        const result = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        const tables = result.rows.map(row => row.table_name);
        console.log('📋 Tables in database:', tables.join(', '));

    } catch (error) {
        console.error('❌ Failed to push schema:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
};

pushSchema()
    .then(() => {
        console.log('🏁 Done');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error:', error.message);
        process.exit(1);
    });
