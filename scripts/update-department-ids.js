
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    console.log('Starting migration: Update Department IDs to Dept-{Name} format...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Fetch all departments
        const res = await client.query('SELECT * FROM "Department"');
        const departments = res.rows;

        console.log(`Found ${departments.length} departments.`);

        let updatedCount = 0;

        for (const dept of departments) {
            const currentId = dept.id;
            const newId = `Dept-${dept.name.trim()}`;

            if (currentId === newId) {
                console.log(`Department "${dept.name}" already has correct ID: ${currentId}`);
                continue;
            }

            console.log(`Updating Department "${dept.name}" (${currentId} -> ${newId})...`);

            // Check if new ID already exists (collision check)
            const check = await client.query('SELECT id FROM "Department" WHERE id = $1', [newId]);
            if (check.rows.length > 0) {
                 console.warn(`WARNING: Target ID ${newId} already exists! Skipping rename for ${dept.name} to avoid collision.`);
                 continue;
            }

            // Update References in other tables
            // 1. Employee
            await client.query('UPDATE "Employee" SET "departmentId" = $1 WHERE "departmentId" = $2', [newId, currentId]);
            
            // 2. ExpenseEntry
            await client.query('UPDATE "ExpenseEntry" SET "departmentId" = $1 WHERE "departmentId" = $2', [newId, currentId]);

            // 3. IncomeEntry
            await client.query('UPDATE "IncomeEntry" SET "departmentId" = $1 WHERE "departmentId" = $2', [newId, currentId]);

            // 4. OutstandingExpense
            await client.query('UPDATE "OutstandingExpense" SET "departmentId" = $1 WHERE "departmentId" = $2', [newId, currentId]);

            // 5. Update the Department record itself
            await client.query('UPDATE "Department" SET "id" = $1 WHERE "id" = $2', [newId, currentId]);

            updatedCount++;
        }

        await client.query('COMMIT');
        console.log(`Migration successful.`);
        console.log(`Updated IDs for ${updatedCount} departments and their references.`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
    } finally {
        client.release();
        pool.end();
    }
}

main().catch(console.error);
