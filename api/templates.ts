import { prisma } from '../lib/prisma.js';
import { sql } from '@vercel/postgres';

export default async function handler(req: any, res: any) {
    const isVercel = process.env.VERCEL === '1';

    if (req.method === 'GET') {
        try {
            if (isVercel) {
                const { rows } = await sql`SELECT * FROM "Template" ORDER BY "createdAt" DESC`;
                return res.status(200).json(rows);
            }
            const templates = await prisma.template.findMany({
                orderBy: { createdAt: 'desc' },
            });
            return res.status(200).json(templates);
        } catch (error: any) {
            console.error('Fetch templates error:', error.message);
            return res.status(500).json({ error: 'Failed to fetch templates' });
        }
    }

    if (req.method === 'POST') {
        try {
            const { name, data } = req.body;
            // Security: Basic input validation
            if (!name || typeof name !== 'string' || name.length > 50) {
                return res.status(400).json({ error: 'Invalid name' });
            }
            if (!data || (typeof data !== 'object' && typeof data !== 'string')) {
                return res.status(400).json({ error: 'Invalid data' });
            }

            const dataString = typeof data === 'string' ? data : JSON.stringify(data);

            if (isVercel) {
                const { rows } = await sql`
                    INSERT INTO "Template" ("name", "data", "updatedAt")
                    VALUES (${name}, ${dataString}, NOW())
                    RETURNING *
                `;
                return res.status(201).json(rows[0]);
            }

            const template = await prisma.template.create({
                data: {
                    name,
                    data: dataString,
                },
            });
            return res.status(201).json(template);
        } catch (error: any) {
            console.error('Save template error:', error.message);
            return res.status(500).json({ error: 'Failed to save template' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            const { id } = req.query;
            if (isVercel) {
                await sql`DELETE FROM "Template" WHERE "id" = ${id as string}`;
            } else {
                await prisma.template.delete({
                    where: { id: id as string },
                });
            }
            return res.status(204).end();
        } catch (error: any) {
            console.error('Delete template error:', error.message);
            return res.status(500).json({ error: 'Failed to delete template' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
