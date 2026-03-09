import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

if (typeof window === 'undefined') {
    const wsConstructor = (ws as any).default || ws;
    console.log('Static check - WebSocket constructor type:', typeof wsConstructor);
    neonConfig.webSocketConstructor = wsConstructor;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const getPrisma = () => {
    let url = process.env.DATABASE_URL || 'file:./prisma/dev.db'

    // Sanitize Neon URL: Remove channel_binding which can cause TypeErrors in the serverless driver
    if (url.includes('neon.tech')) {
        url = url.replace(/[\?&]channel_binding=[^&]+/, '');
        if (!url.includes('sslmode=')) {
            url += (url.includes('?') ? '&' : '?') + 'sslmode=require';
        }
    }

    console.log('Database URL starts with:', url.substring(0, 15) + '...');
    const isPostgres = url.startsWith('postgresql://') || url.startsWith('postgres://')

    console.log(`Initializing Prisma Client with ${isPostgres ? 'Neon (PostgreSQL)' : 'SQLite'}`);

    if (isPostgres) {
        const pool = new Pool({ connectionString: url })
        const adapter = new PrismaNeon(pool as any)
        return new PrismaClient({ adapter })
    }

    return new PrismaClient()
}

export const prisma = globalForPrisma.prisma || getPrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
