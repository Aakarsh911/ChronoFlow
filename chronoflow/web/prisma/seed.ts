import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';

async function main() {
  const email = 'demo@example.com';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Demo user already exists');
    return;
  }
  const passwordHash = await bcrypt.hash('password123', 10);
  await prisma.user.create({ data: { email, name: 'Demo User', passwordHash } });
  console.log('Seeded demo user demo@example.com / password123');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(()=>prisma.$disconnect());
