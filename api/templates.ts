import { prisma } from '../lib/prisma';

export default async function handler(req: any, res: any) {
    if (req.method === 'GET') {
        try {
            const templates = await prisma.template.findMany({
                orderBy: { createdAt: 'desc' },
            });
            return res.status(200).json(templates);
        } catch (error) {
            console.error('Fetch templates error:', error);
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

            const template = await prisma.template.create({
                data: {
                    name,
                    data: typeof data === 'string' ? data : JSON.stringify(data),
                },
            });
            return res.status(201).json(template);
        } catch (error) {
            console.error('Save template error:', error);
            return res.status(500).json({ error: 'Failed to save template' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            const { id } = req.query;
            await prisma.template.delete({
                where: { id: id as string },
            });
            return res.status(204).end();
        } catch (error) {
            console.error('Delete template error:', error);
            return res.status(500).json({ error: 'Failed to delete template' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
