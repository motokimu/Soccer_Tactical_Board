import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

if (typeof window === 'undefined') {
    const wsConstructor = (ws as any).default || ws;

    const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

    const getPrisma = () => {
        return new PrismaClient()
    }

    export const prisma = globalForPrisma.prisma || getPrisma()

    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
