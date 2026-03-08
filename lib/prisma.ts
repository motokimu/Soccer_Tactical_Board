import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

if (typeof window === 'undefined') {
    neonConfig.webSocketConstructor = ws
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const getPrisma = () => {
    const url = process.env.DATABASE_URL || 'file:./prisma/dev.db'
    const isPostgres = url.startsWith('postgresql://') || url.startsWith('postgres://')

    if (isPostgres) {
        const pool = new Pool({ connectionString: url })
        const adapter = new PrismaNeon(pool as any)
        return new PrismaClient({ adapter })
    }

    return new PrismaClient()
}

export const prisma = globalForPrisma.prisma || getPrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
