import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const demoPassword = "password123";
const profileImage = (name: string, background: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${background}&color=fff&size=256&bold=true`;

const demoAccounts = [
  {
    bio: "Organizzo partite, serate tranquille e uscite all'aperto. Mi piace creare gruppi spontanei con persone nuove.",
    birthday: new Date("2001-01-15"),
    city: "Luogosano",
    email: "mariodigregorio@evnt.app",
    image: profileImage("Mario Di Gregorio", "111827"),
    interests: ["Sport", "Socialità", "Gastronomia"],
    name: "Mario Di Gregorio"
  },
  {
    bio: "Amo trekking, musica dal vivo e posti in cui si chiacchiera bene. Sono sempre alla ricerca di eventi semplici ma curati.",
    birthday: new Date("2000-09-22"),
    city: "Summonte",
    email: "lauranigro@evnt.app",
    image: profileImage("Laura Nigro", "B42318"),
    interests: ["Benessere", "Musica", "Cultura"],
    name: "Laura Nigro"
  },
  {
    bio: "Sportivo, competitivo il giusto e appassionato di basket e calcetto. Se manca una persona in squadra, chiamatemi.",
    birthday: new Date("1999-05-09"),
    city: "Eboli",
    email: "riccardolaporta@evnt.app",
    image: profileImage("Riccardo Laporta", "047857"),
    interests: ["Sport", "Gaming", "Tecnologia"],
    name: "Riccardo Laporta"
  },
  {
    bio: "Mi piacciono concerti, giochi da tavolo e serate leggere. Porto sempre playlist e idee per far partire la conversazione.",
    birthday: new Date("2001-11-03"),
    city: "Pagani",
    email: "simonesquitieri@evnt.app",
    image: profileImage("Simone Squitieri", "0369A1"),
    interests: ["Socialità", "Nightlife", "Cinema"],
    name: "Simone Squitieri"
  }
] as const;

async function main() {
  console.log("Creating demo accounts...");
  const password = await bcrypt.hash(demoPassword, 10);

  for (const account of demoAccounts) {
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {
        bio: account.bio,
        birthday: account.birthday,
        city: account.city,
        image: account.image,
        name: account.name,
        password
      },
      create: {
        bio: account.bio,
        birthday: account.birthday,
        city: account.city,
        email: account.email,
        image: account.image,
        name: account.name,
        password
      }
    });

    const interests = await prisma.interest.findMany({
      where: { name: { in: [...account.interests] } },
      select: { id: true }
    });
    await prisma.userInterest.deleteMany({ where: { userId: user.id } });
    if (interests.length > 0) {
      await prisma.userInterest.createMany({
        data: interests.map((interest) => ({ interestId: interest.id, userId: user.id })),
        skipDuplicates: true
      });
    }

  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
