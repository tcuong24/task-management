import { prisma } from '../index';
import bcrypt from 'bcrypt';
import 'dotenv/config';

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 12);

  console.log('🌱 Starting database seeding...');

  // 1. Create a test organization
  let org = await prisma.organization.findUnique({
    where: { slug: 'test-workspace' },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Test Workspace',
        slug: 'test-workspace',
      },
    });
    console.log(`✅ Created organization: ${org.name}`);
  }

  // Helper function to seed user and organization membership
  const seedUserWithRole = async (username: string, email: string, fullName: string, role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST') => {
    const user = await prisma.user.upsert({
      where: { username },
      update: {
        passwordHash: passwordHash,
        fullName,
        email,
      },
      create: {
        username,
        email,
        passwordHash,
        fullName,
        isVerified: true,
      },
    });
    console.log(`✅ Seeded User: ${user.username} (${fullName})`);

    // Ensure user has correct role in the organization
    const membership = await prisma.organizationMember.findFirst({
      where: { organizationId: org.id, userId: user.id },
    });

    if (membership) {
      if (membership.role !== role) {
        await prisma.organizationMember.update({
          where: { id: membership.id },
          data: { role },
        });
        console.log(`🔄 Updated ${user.username} role to ${role}`);
      }
    } else {
      await prisma.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role,
        },
      });
      console.log(`✅ Added ${user.username} to organization as ${role}`);
    }
  };

  // Seed required test accounts
  await seedUserWithRole('owner', 'owner@taskmanager.com', 'Workspace Owner', 'OWNER');
  await seedUserWithRole('admin', 'admin@taskmanager.com', 'System Admin', 'ADMIN');
  await seedUserWithRole('member', 'member@taskmanager.com', 'Regular Member', 'MEMBER');
  await seedUserWithRole('guest', 'guest@taskmanager.com', 'Guest User', 'GUEST');

  console.log('\n🎉 Seeding completed successfully!');
  console.log('Use password: "admin123" for all seeded test accounts:');
  console.log('- Username: "owner"   (Role: OWNER)');
  console.log('- Username: "admin"   (Role: ADMIN)');
  console.log('- Username: "member"  (Role: MEMBER)');
  console.log('- Username: "guest"   (Role: GUEST)');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
