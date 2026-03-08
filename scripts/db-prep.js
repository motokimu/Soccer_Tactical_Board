import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const schemaPath = path.resolve(process.cwd(), 'prisma/schema.prisma');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

const databaseUrl = process.env.DATABASE_URL || '';
const provider = (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://') || process.env.VERCEL)
    ? 'postgresql'
    : 'sqlite';

console.log(`[db-prep] Detected provider: ${provider} (URL base: ${databaseUrl.split(':')[0]})`);

const updatedContent = schemaContent.replace(
    /provider\s*=\s*"(sqlite|postgresql)"/,
    `provider = "${provider}"`
);

if (schemaContent !== updatedContent) {
    fs.writeFileSync(schemaPath, updatedContent);
    console.log(`[db-prep] Updated schema.prisma provider to ${provider}`);
} else {
    console.log(`[db-prep] schema.prisma already using ${provider}`);
}
