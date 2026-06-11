import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const taxonomy: { interest: string; categories: { name: string; icon: string }[] }[] = [
  { interest: "Musica", categories: [{ name: "Concerto", icon: "🎸" }] },
  { interest: "Sport", categories: [{ name: "Sport", icon: "⚽" }] },
  { interest: "Gastronomia", categories: [{ name: "Food", icon: "🍔" }] },
  { interest: "Socialità", categories: [{ name: "Social", icon: "🤝" }] },
  { interest: "Cultura", categories: [{ name: "Arte", icon: "🎨" }] },
  { interest: "Tecnologia", categories: [{ name: "Tech", icon: "💻" }] },
  { interest: "Nightlife", categories: [{ name: "Serata", icon: "🌙" }] },
  { interest: "Benessere", categories: [{ name: "Benessere", icon: "🧘" }] },
  { interest: "Viaggi", categories: [{ name: "Viaggi", icon: "🧳" }] },
  { interest: "Gaming", categories: [{ name: "Gaming", icon: "🎮" }] },
  { interest: "Cinema", categories: [{ name: "Cinema", icon: "🎬" }] }
];

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

async function ensureCatalog() {
  for (const item of taxonomy) {
    const interest = await prisma.interest.upsert({
      where: { name: item.interest },
      create: { name: item.interest },
      update: {}
    });

    for (const category of item.categories) {
      await prisma.category.upsert({
        where: { name: category.name },
        create: {
          iconCategory: category.icon,
          interestId: interest.id,
          name: category.name
        },
        update: {
          iconCategory: category.icon,
          interestId: interest.id
        }
      });
    }
  }
}

async function ensureDemoAccounts() {
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

    if (interests.length > 0) {
      await prisma.userInterest.createMany({
        data: interests.map((interest) => ({ interestId: interest.id, userId: user.id })),
        skipDuplicates: true
      });
    }
  }
}

async function main() {
  await ensureCatalog();
  await ensureDemoAccounts();
  console.log("Bootstrap complete. Catalog ready and demo accounts available.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
