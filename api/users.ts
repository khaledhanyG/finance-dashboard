import type { VercelRequest, VercelResponse } from '@vercel/node';
import pg from 'pg';

const { Pool } = pg;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { method, query, body } = req;

    if (!process.env.DATABASE_URL) {
        console.error("Critical: DATABASE_URL is undefined");
        return res.status(500).json({ error: "CONFIGURATION ERROR: DATABASE_URL is missing." });
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();

        try {
            // GET - Login or List Users
            if (method === 'GET') {
                const { email, password } = query;

                // Login authentication
                if (email && password) {
                    const result = await client.query(
                        'SELECT id, email, name, role FROM "User" WHERE email = $1 AND password = $2',
                        [email, password]
                    );

                    if (result.rows.length === 0) {
                        return res.status(401).json({ error: 'Invalid credentials' });
                    }

                    return res.status(200).json(result.rows[0]);
                }

                // List all users
                const result = await client.query(
                    'SELECT id, email, name, role FROM "User" ORDER BY "createdAt" ASC'
                );
                return res.status(200).json(result.rows);
            }

            // POST - Create new user
            if (method === 'POST') {
                const { id, email, password, name, role } = body;

                if (!id || !email || !password || !name || !role) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }

                const existing = await client.query('SELECT id FROM "User" WHERE email = $1', [email]);
                if (existing.rows.length > 0) {
                    return res.status(409).json({ error: 'Email already exists' });
                }

                const result = await client.query(
                    'INSERT INTO "User" (id, email, password, name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role',
                    [id, email, password, name, role]
                );

                return res.status(201).json(result.rows[0]);
            }

            // PUT - Update user
            if (method === 'PUT') {
                const { id, email, password, name } = body;

                if (!id) return res.status(400).json({ error: 'User ID is required' });

                const updates: string[] = [];
                const values: any[] = [];
                let paramCount = 1;

                if (name) { updates.push(`name = $${paramCount++}`); values.push(name); }
                if (password) { updates.push(`password = $${paramCount++}`); values.push(password); }
                if (email) { updates.push(`email = $${paramCount++}`); values.push(email); }

                if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

                values.push(id);
                const result = await client.query(
                    `UPDATE "User" SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, email, name, role`,
                    values
                );

                if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

                return res.status(200).json(result.rows[0]);
            }

            // DELETE - Remove user
            if (method === 'DELETE') {
                const { id } = query;
                if (!id) return res.status(400).json({ error: 'User ID is required' });

                const userCheck = await client.query('SELECT role FROM "User" WHERE id = $1', [id]);
                if (userCheck.rows.length > 0 && userCheck.rows[0].role === 'admin') {
                    return res.status(403).json({ error: 'Cannot delete admin user' });
                }

                await client.query('DELETE FROM "User" WHERE id = $1', [id]);
                return res.status(204).send('');
            }

            return res.status(405).json({ error: 'Method not allowed' });
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error('User API error:', error);
        return res.status(500).json({ error: error.message });
    } finally {
        await pool.end(); // Ensure pool is closed for serverless efficiency
    }
}
