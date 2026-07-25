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

const clearDatabase = async () => {
    console.log('⚠️  This will DELETE ALL DATA from all tables.');
    const answer = await askConfirmation('Type "yes" to continue or anything else to cancel: ');

    if (answer !== 'yes') {
        console.log('❌ Cancelled. No data was deleted.');
        process.exit(0);
    }

    const client = await pool.connect();

    try {
        console.log('🧹 Clearing all data...');

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
            await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
            console.log(`   ✅ Cleared ${table}`);
        }

        await client.query('COMMIT');

        console.log('🧹 All data cleared successfully.');

    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('❌ Failed to clear data:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
};

clearDatabase()
    .then(() => {
        console.log('🏁 Done');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error:', error.message);
        process.exit(1);
    });
