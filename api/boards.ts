import { prisma } from '../lib/prisma.js';
import { sql } from '@vercel/postgres';

export default async function handler(req: any, res: any) {
    const isVercel = process.env.VERCEL === '1';

    // Helper for explicit field selection
    const boardSelect = {
        id: true,
        name: true,
        data: true,
        createdAt: true,
        updatedAt: true,
    };

    if (req.method === 'GET') {
        try {
            const { id } = req.query;

            // Single board fetch
            if (id) {
                if (isVercel) {
                    const { rows } = await sql`SELECT "id", "name", "data", "createdAt", "updatedAt" FROM "Board" WHERE "id" = ${id as string}`;
                    if (rows.length === 0) return res.status(404).json({ error: 'Board not found' });
                    return res.status(200).json(rows[0]);
                }
                const board = await prisma.board.findUnique({
                    where: { id: id as string },
                    select: boardSelect
                });
                if (!board) return res.status(404).json({ error: 'Board not found' });
                return res.status(200).json(board);
            }

            // All boards list
            if (isVercel) {
                const { rows } = await sql`SELECT "id", "name", "data", "createdAt", "updatedAt" FROM "Board" ORDER BY "createdAt" DESC`;
                return res.status(200).json(rows);
            }
            const boards = await prisma.board.findMany({
                orderBy: { createdAt: 'desc' },
                select: boardSelect
            });
            return res.status(200).json(boards);
        } catch (error: any) {
            console.error('[API] Fetch boards error:', error.message);
            return res.status(500).json({ error: 'Failed to fetch boards' });
        }
    }

    if (req.method === 'POST' || req.method === 'PUT') {
        try {
            const { name, data } = req.body;
            const { id } = req.query;

            // Validate Name
            if (name !== undefined) {
                if (!name || typeof name !== 'string' || name.length > 50) {
                    return res.status(400).json({ error: 'Invalid name (1-50 chars)' });
                }
            } else if (req.method === 'POST') {
                return res.status(400).json({ error: 'Missing name' });
            }

            // Validate Data
            if (data !== undefined) {
                const dataString = typeof data === 'string' ? data : JSON.stringify(data);

                // 1. Size limit (512KB)
                if (dataString.length > 512000) {
                    return res.status(400).json({ error: 'Data size exceeds limit (512KB)' });
                }

                // 2. Structural/Count limit
                try {
                    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
                    if (parsed.objects && Array.isArray(parsed.objects) && parsed.objects.length > 100) {
                        return res.status(400).json({ error: 'Too many objects (max 100)' });
                    }
                    if (parsed.lines && Array.isArray(parsed.lines) && parsed.lines.length > 200) {
                        return res.status(400).json({ error: 'Too many lines (max 200)' });
                    }
                } catch (e) {
                    return res.status(400).json({ error: 'Invalid JSON data' });
                }

                if (req.method === 'POST') {
                    const boardId = crypto.randomUUID();
                    if (isVercel) {
                        const { rows } = await sql`
                            INSERT INTO "Board" ("id", "name", "data", "updatedAt")
                            VALUES (${boardId}, ${name}, ${dataString}, NOW())
                            RETURNING "id", "name", "data", "createdAt", "updatedAt"
                        `;
                        return res.status(201).json(rows[0]);
                    }
                    const board = await prisma.board.create({
                        data: { id: boardId, name, data: dataString },
                        select: boardSelect
                    });
                    return res.status(201).json(board);
                } else {
                    // PUT
                    if (!id) return res.status(400).json({ error: 'Missing board ID' });
                    if (isVercel) {
                        let query = 'UPDATE "Board" SET "updatedAt" = NOW()';
                        const params: any[] = [];
                        let paramIndex = 1;
                        if (name) { query += `, "name" = $${paramIndex++}`; params.push(name); }
                        if (data !== undefined) { query += `, "data" = $${paramIndex++}`; params.push(dataString); }
                        query += ` WHERE "id" = $${paramIndex} RETURNING "id", "name", "data", "createdAt", "updatedAt"`;
                        params.push(id);
                        const { rows } = await sql.query(query, params);
                        if (rows.length === 0) return res.status(404).json({ error: 'Board not found' });
                        return res.status(200).json(rows[0]);
                    }
                    const board = await prisma.board.update({
                        where: { id: id as string },
                        data: {
                            ...(name && { name }),
                            ...(data !== undefined && { data: dataString })
                        },
                        select: boardSelect
                    });
                    return res.status(200).json(board);
                }
            } else if (req.method === 'PUT' && name !== undefined) {
                // Handle Name-only update for PUT
                if (!id) return res.status(400).json({ error: 'Missing board ID' });
                if (isVercel) {
                    const { rows } = await sql`
                        UPDATE "Board" 
                        SET "name" = ${name}, "updatedAt" = NOW() 
                        WHERE "id" = ${id as string} 
                        RETURNING "id", "name", "data", "createdAt", "updatedAt"
                    `;
                    if (rows.length === 0) return res.status(404).json({ error: 'Board not found' });
                    return res.status(200).json(rows[0]);
                }
                const board = await prisma.board.update({
                    where: { id: id as string },
                    data: { name, updatedAt: new Date() },
                    select: boardSelect
                });
                return res.status(200).json(board);
            }
        } catch (error: any) {
            console.error(`[API] ${req.method} error:`, error.message);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'Missing board ID' });
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
