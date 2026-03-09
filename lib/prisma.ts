import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const getPrisma = () => {
    return new PrismaClient()
}

export const prisma = globalForPrisma.prisma || getPrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
