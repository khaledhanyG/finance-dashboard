
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const INSPECTOR_CAT_ID = 'cat-1766658698744'; // From earlier script

async function main() {
    const client = await pool.connect();
    try {
        // Get all revenue entries with their Cogs items for Inspector Share
        const res = await client.query(`
            SELECT 
                i."serviceId", 
                s.name as "serviceName",
                i.amount as "revenue", 
                COALESCE(SUM(c.amount), 0) as "inspectorShare"
            FROM "IncomeEntry" i
            JOIN "IncomeService" s ON i."serviceId" = s.id
            LEFT JOIN "IncomeCogsItem" c ON c."incomeEntryId" = i.id AND c."categoryId" = $1
            WHERE i.type = 'revenue' AND i.amount > 0
            GROUP BY i.id, i."serviceId", s.name, i.amount
        `, [INSPECTOR_CAT_ID]);

        const serviceStats = {};

        res.rows.forEach(row => {
            if (!serviceStats[row.serviceName]) {
                serviceStats[row.serviceName] = { totalRev: 0, totalShare: 0, count: 0 };
            }
            const rev = Number(row.revenue);
            const share = Number(row.inspectorShare);

            serviceStats[row.serviceName].totalRev += rev;
            serviceStats[row.serviceName].totalShare += share;
            serviceStats[row.serviceName].count++;
        });

        console.log('Calculated Inspector Share Rates:');
        Object.keys(serviceStats).forEach(svc => {
            const stats = serviceStats[svc];
            const rate = stats.totalRev > 0 ? (stats.totalShare / stats.totalRev) : 0;
            console.log(`${svc}: ${(rate * 100).toFixed(2)}% (Based on ${stats.count} entries)`);
        });

    } finally {
        client.release();
        pool.end();
    }
}
main().catch(console.error);
