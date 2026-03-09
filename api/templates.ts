import { prisma } from '../lib/prisma.js';

export default async function handler(req: any, res: any) {
    if (req.method === 'GET') {
        try {
            console.log('Fetching templates...');
            if (!process.env.DATABASE_URL) {
                console.error('DATABASE_URL is not set in environment variables');
            }
            const templates = await prisma.template.findMany({
                orderBy: { createdAt: 'desc' },
            });
            console.log(`Successfully fetched ${templates.length} templates`);
            return res.status(200).json(templates);
        } catch (error: any) {
            console.error('Fetch templates error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack,
            });
            return res.status(500).json({
                error: 'Failed to fetch templates',
                details: error.message
            });
        }
    }

    if (req.method === 'POST') {
        try {
            const { name, data } = req.body;
            console.log(`Saving template: ${name}`);

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
            console.log(`Successfully saved template with ID: ${template.id}`);
            return res.status(201).json(template);
        } catch (error: any) {
            console.error('Save template error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack,
            });
            return res.status(500).json({
                error: 'Failed to save template',
                details: error.message
            });
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
