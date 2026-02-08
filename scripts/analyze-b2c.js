
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const INSPECTOR_CAT_ID = 'cat-1766658698744';

async function main() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT 
                i.amount as "revenue", 
                COALESCE(SUM(c.amount), 0) as "inspectorShare"
            FROM "IncomeEntry" i
            LEFT JOIN "IncomeCogsItem" c ON c."incomeEntryId" = i.id AND c."categoryId" = $1
            WHERE i.type = 'revenue' AND i.amount > 100 AND i."serviceId" = 'svc-1766658788484' -- B2C
            GROUP BY i.id, i.amount
            LIMIT 100
        `, [INSPECTOR_CAT_ID]);

        console.log('Sample B2C Rates (Revenue -> Share):');
        res.rows.slice(0, 20).forEach(row => {
            const rev = Number(row.revenue);
            const share = Number(row.inspectorShare);
            const rate = (share / rev) * 100;
            console.log(`${rev} -> ${share} (${rate.toFixed(2)}%)`);
        });

    } finally {
        client.release();
        pool.end();
    }
}
main().catch(console.error);
