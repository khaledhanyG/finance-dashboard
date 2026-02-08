import pg from 'pg';
const { Pool } = pg;

console.log("Testing Pool init with undefined connectionString...");

try {
    const pool = new Pool({
        connectionString: undefined,
        ssl: { rejectUnauthorized: false }
    });
    console.log("Pool initialized successfully (did not throw).");
} catch (e) {
    console.error("CRASH: Pool initialization threw an error!");
    console.error(e);
}
