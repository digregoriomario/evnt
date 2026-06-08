import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TAXONOMY: { interest: string; categories: { name: string; icon: string }[] }[] = [
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

async function main() {
  console.log("Seeding Evnt catalog...");

  await prisma.chatMessage.deleteMany();
  await prisma.participation.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.pushToken.deleteMany();
  await prisma.event.deleteMany();
  await prisma.userInterest.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
  await prisma.interest.deleteMany();

  for (const item of TAXONOMY) {
    const interest = await prisma.interest.create({ data: { name: item.interest } });
    for (const category of item.categories) {
      await prisma.category.create({
        data: {
          iconCategory: category.icon,
          interestId: interest.id,
          name: category.name
        }
      });
    }
  }

  console.log("Seed complete. Catalog only, no generated users/events/messages.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
