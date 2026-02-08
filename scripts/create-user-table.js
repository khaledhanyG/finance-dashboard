import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("ERROR: DATABASE_URL environment variable is not set!");
    process.exit(1);
}

const pool = new pg.Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false,
    },
});

const createUserTable = async () => {
    const client = await pool.connect();
    try {
        console.log("Connected to database...");

        // Create User table
        await client.query(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT PRIMARY KEY,
        "email" TEXT UNIQUE NOT NULL,
        "password" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "role" TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);
        console.log("User table created/verified");

        // Check if admin already exists
        const existingAdmin = await client.query(
            'SELECT id FROM "User" WHERE email = $1',
            ['khaled.hany@gmail.com']
        );

        if (existingAdmin.rows.length === 0) {
            // Seed admin user only if doesn't exist
            await client.query(
                'INSERT INTO "User" (id, email, password, name, role) VALUES ($1, $2, $3, $4, $5)',
                ['admin-1', 'khaled.hany@gmail.com', '123456', 'Khaled Hany', 'admin']
            );
            console.log("✅ Admin user created successfully!");
        } else {
            console.log("ℹ️  Admin user already exists");
        }

        console.log("\n✅ Migration completed successfully!");

    } catch (e) {
        console.error("❌ Error during migration:", e.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
};

createUserTable();
