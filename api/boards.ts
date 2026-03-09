import { prisma } from '../lib/prisma.js';
import { sql } from '@vercel/postgres';

export default async function handler(req: any, res: any) {
    const isVercel = process.env.VERCEL === '1';

    if (req.method === 'GET') {
        try {
            const { id } = req.query;

            // Single board fetch for polling sync
            if (id) {
                if (isVercel) {
                    const { rows } = await sql`SELECT * FROM "Board" WHERE "id" = ${id as string}`;
                    if (rows.length === 0) return res.status(404).json({ error: 'Board not found' });
                    return res.status(200).json(rows[0]);
                }
                const board = await prisma.board.findUnique({ where: { id: id as string } });
                if (!board) return res.status(404).json({ error: 'Board not found' });
                return res.status(200).json(board);
            }

            // All boards list
            if (isVercel) {
                const { rows } = await sql`SELECT * FROM "Board" ORDER BY "createdAt" DESC`;
                return res.status(200).json(rows);
            }
            const boards = await prisma.board.findMany({
                orderBy: { createdAt: 'desc' },
            });
            return res.status(200).json(boards);
        } catch (error: any) {
            console.error('[API] Fetch boards error:', error.message);
            return res.status(500).json({ error: 'Failed to fetch boards' });
        }
    }

    if (req.method === 'POST') {
        try {
            const { name, data } = req.body;
            if (!name || typeof name !== 'string' || name.length > 50) {
                return res.status(400).json({ error: 'Invalid name' });
            }
            if (!data) return res.status(400).json({ error: 'Invalid data' });

            const dataString = typeof data === 'string' ? data : JSON.stringify(data);
            const id = crypto.randomUUID();

            if (isVercel) {
                const { rows } = await sql`
                    INSERT INTO "Board" ("id", "name", "data", "updatedAt")
                    VALUES (${id}, ${name}, ${dataString}, NOW())
                    RETURNING *
                `;
                return res.status(201).json(rows[0]);
            }

            const board = await prisma.board.create({
                data: {
                    name,
                    data: dataString,
                },
            });
            return res.status(201).json(board);
        } catch (error: any) {
            console.error('[API] Save board error:', error.message);
            return res.status(500).json({ error: 'Failed to save board' });
        }
    }

    if (req.method === 'PUT') {
        try {
            const { id } = req.query;
            const { name, data } = req.body;
            if (!id) return res.status(400).json({ error: 'Missing board ID' });

            const updateData: any = {};
            if (name) updateData.name = name;
            if (data) updateData.data = typeof data === 'string' ? data : JSON.stringify(data);

            if (isVercel) {
                let query = 'UPDATE "Board" SET "updatedAt" = NOW()';
                const params: any[] = [];
                let paramIndex = 1;

                if (name) {
                    query += `, "name" = $${paramIndex++}`;
                    params.push(name);
                }
                if (data) {
                    query += `, "data" = $${paramIndex++}`;
                    params.push(updateData.data);
                }

                query += ` WHERE "id" = $${paramIndex} RETURNING *`;
                params.push(id);

                const { rows } = await sql.query(query, params);
                if (rows.length === 0) return res.status(404).json({ error: 'Board not found' });
                return res.status(200).json(rows[0]);
            }

            const board = await prisma.board.update({
                where: { id: id as string },
                data: updateData,
            });
            return res.status(200).json(board);
        } catch (error: any) {
            console.error('[API] Update board error:', error.message);
            return res.status(500).json({ error: 'Failed to update board' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            const { id } = req.query;
            if (isVercel) {
                await sql`DELETE FROM "Board" WHERE "id" = ${id as string}`;
            } else {
                await prisma.board.delete({
                    where: { id: id as string },
                });
            }
            return res.status(204).end();
        } catch (error: any) {
            console.error('[API] Delete board error:', error.message);
            return res.status(500).json({ error: 'Failed to delete board' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
