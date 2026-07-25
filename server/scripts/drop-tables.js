const { Pool } = require('pg');
const readline = require('readline');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const askConfirmation = (question) => {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim().toLowerCase());
        });
    });
};

const dropTables = async () => {
    console.log('⚠️  This will DROP ALL TABLES and DELETE ALL DATA.');
    const answer = await askConfirmation('Type "yes" to continue or anything else to cancel: ');

    if (answer !== 'yes') {
        console.log('❌ Cancelled. No tables were dropped.');
        process.exit(0);
    }

    const client = await pool.connect();

    try {
        console.log('💥 Dropping all tables...');

        await client.query('BEGIN');

        const tables = [
            'attendance',
            'student_teams',
            'students',
            'teams',
            'settings',
            'users'
        ];

        for (const table of tables) {
            await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
            console.log(`   ✅ Dropped ${table}`);
        }

        await client.query('COMMIT');

        console.log('💥 All tables dropped successfully.');

    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('❌ Failed to drop tables:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
};

dropTables()
    .then(() => {
        console.log('🏁 Done');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error:', error.message);
        process.exit(1);
    });
