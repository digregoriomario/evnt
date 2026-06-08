import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const demoPassword = "password123";
const demoAccounts = [
  {
    bio: "Account demo per testare Evnt.",
    birthday: new Date("2001-01-15"),
    city: "Roma",
    email: "demo1@evnt.app",
    name: "Demo Uno"
  },
  {
    bio: "Secondo account demo per chat e notifiche.",
    birthday: new Date("2000-09-22"),
    city: "Milano",
    email: "demo2@evnt.app",
    name: "Demo Due"
  }
];

async function main() {
  console.log("Creating demo accounts...");
  const password = await bcrypt.hash(demoPassword, 10);
  const interests = await prisma.interest.findMany({
    where: { name: { in: ["Musica", "Sport", "Socialità"] } },
    select: { id: true }
  });

  for (const account of demoAccounts) {
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {
        bio: account.bio,
        birthday: account.birthday,
        city: account.city,
        name: account.name,
        password
      },
      create: {
        ...account,
        password
      }
    });

    await prisma.userInterest.deleteMany({ where: { userId: user.id } });
    if (interests.length > 0) {
      await prisma.userInterest.createMany({
        data: interests.map((interest) => ({ interestId: interest.id, userId: user.id })),
        skipDuplicates: true
      });
    }

    console.log(`${account.email} / ${demoPassword}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
