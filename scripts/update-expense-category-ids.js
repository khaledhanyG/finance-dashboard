
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    console.log('Starting migration: Update ExpenseCategory IDs to cat-{Name} format...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Fetch all ExpenseCategories
        const res = await client.query('SELECT * FROM "ExpenseCategory"');
        const categories = res.rows;

        console.log(`Found ${categories.length} expense categories.`);

        let updatedCount = 0;

        for (const cat of categories) {
            const currentId = cat.id;
            const newId = `cat-${cat.name.trim()}`;

            if (currentId === newId) {
                console.log(`Category "${cat.name}" already has correct ID: ${currentId}`);
                continue;
            }

            console.log(`Updating Category "${cat.name}" (${currentId} -> ${newId})...`);

            // Collision check
            const check = await client.query('SELECT id FROM "ExpenseCategory" WHERE id = $1', [newId]);
            if (check.rows.length > 0) {
                 console.warn(`WARNING: Target ID ${newId} already exists! Skipping rename.`);
                 continue;
            }

            // Update References
            // 1. ExpenseEntry
            await client.query('UPDATE "ExpenseEntry" SET "categoryId" = $1 WHERE "categoryId" = $2', [newId, currentId]);
            
            // 2. IncomeCogsItem
            await client.query('UPDATE "IncomeCogsItem" SET "categoryId" = $1 WHERE "categoryId" = $2', [newId, currentId]);

            // 3. Update ExpenseCategory
            await client.query('UPDATE "ExpenseCategory" SET "id" = $1 WHERE "id" = $2', [newId, currentId]);

            updatedCount++;
        }

        await client.query('COMMIT');
        console.log(`Migration successful.`);
        console.log(`Updated IDs for ${updatedCount} categories and their references.`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
    } finally {
        client.release();
        pool.end();
    }
}

main().catch(console.error);
