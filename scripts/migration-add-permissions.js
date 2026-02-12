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

const migrate = async () => {
    const client = await pool.connect();
    try {
        console.log("Connected to database...");

        // Add permissions column if it doesn't exist
        await client.query(`
            ALTER TABLE "User" 
            ADD COLUMN IF NOT EXISTS "permissions" TEXT[] DEFAULT '{}';
        `);
        console.log("Permissions column added/verified");

        // Set default permissions for existing admin
        await client.query(`
            UPDATE "User" 
            SET "permissions" = ARRAY['dashboard', 'transactions', 'tasks', 'reports', 'import', 'settings']
            WHERE "role" = 'admin';
        `);
        console.log("Default permissions set for admins");

        console.log("\n✅ Migration completed successfully!");

    } catch (e) {
        console.error("❌ Error during migration:", e.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
};

migrate();
