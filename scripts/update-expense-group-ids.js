
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    console.log('Starting migration: Update ExpenseGroup IDs to grp-{Name} format...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Fetch all ExpenseGroups
        const res = await client.query('SELECT * FROM "ExpenseGroup"');
        const groups = res.rows;

        console.log(`Found ${groups.length} expense groups.`);

        let updatedCount = 0;

        for (const group of groups) {
            const currentId = group.id;
            const newId = `grp-${group.name.trim()}`;

            if (currentId === newId) {
                console.log(`Group "${group.name}" already has correct ID: ${currentId}`);
                continue;
            }

            console.log(`Updating Group "${group.name}" (${currentId} -> ${newId})...`);

            // Collision check
            const check = await client.query('SELECT id FROM "ExpenseGroup" WHERE id = $1', [newId]);
            if (check.rows.length > 0) {
                 console.warn(`WARNING: Target ID ${newId} already exists! Skipping rename.`);
                 continue;
            }

            // Update References
            // 1. ExpenseCategory
            await client.query('UPDATE "ExpenseCategory" SET "groupId" = $1 WHERE "groupId" = $2', [newId, currentId]);
            
            // 2. Update ExpenseGroup
            await client.query('UPDATE "ExpenseGroup" SET "id" = $1 WHERE "id" = $2', [newId, currentId]);

            updatedCount++;
        }

        await client.query('COMMIT');
        console.log(`Migration successful.`);
        console.log(`Updated IDs for ${updatedCount} groups and their references.`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
    } finally {
        client.release();
        pool.end();
    }
}

main().catch(console.error);
