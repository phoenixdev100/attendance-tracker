const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const seedDatabase = async () => {
    const client = await pool.connect();

    try {
        console.log('🌱 Seeding database...');

        await client.query('BEGIN');

        // Remove all existing users to ensure only .env admin exists
        await client.query('DELETE FROM users');
        console.log('🗑️  Removed existing users');

        // Seed admin user from .env
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminEmail || !adminPassword) {
            throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
        }

        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        await client.query(
            `INSERT INTO users (email, password, role, name)
             VALUES ($1, $2, $3, $4)`,
            [adminEmail, hashedPassword, 'admin', 'Admin']
        );
        console.log('✅ Admin user seeded:', adminEmail);

        await client.query('COMMIT');

        // Display summary
        console.log('\n📊 Database Summary:');

        const usersCount = await client.query('SELECT COUNT(*) FROM users');
        console.log(`   - Users: ${usersCount.rows[0].count}`);

        const studentsCount = await client.query('SELECT COUNT(*) FROM students');
        console.log(`   - Students: ${studentsCount.rows[0].count}`);

    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('❌ Error seeding database:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
};

seedDatabase()
    .then(() => {
        console.log('\n🎉 Database seeding completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Database seeding failed:', error.message);
        process.exit(1);
    });
