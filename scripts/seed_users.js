
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const defaultUser = {
  id: 'admin-1',
  email: 'khaled.hany@gmail.com',
  password: '123456',
  name: 'Khaled Hany',
  role: 'admin'
};

async function seedUsers() {
  const client = await pool.connect();
  try {
    console.log("Checking User table...");
    const res = await client.query('SELECT count(*) FROM "User"');
    const count = parseInt(res.rows[0].count);
    
    if (count === 0) {
      console.log("Seeding default admin user...");
      await client.query(
        'INSERT INTO "User" (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5)',
        [defaultUser.id, defaultUser.name, defaultUser.email, defaultUser.password, defaultUser.role]
      );
      console.log("Default admin user inserted.");
    } else {
      console.log(`User table already has ${count} users. Skipping seed.`);
    }
  } catch (e) {
    console.error("Error seeding users:", e);
  } finally {
    client.release();
    pool.end();
  }
}

seedUsers();
