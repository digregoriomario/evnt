import { PrismaClient, ChatType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// interest (macro) -> categories (with map icon)
const TAXONOMY: { interest: string; categories: { name: string; icon: string }[] }[] = [
  { interest: "Musica", categories: [{ name: "Concerto", icon: "🎸" }] },
  { interest: "Sport", categories: [{ name: "Sport", icon: "⚽" }] },
  { interest: "Gastronomia", categories: [{ name: "Food", icon: "🍔" }] },
  { interest: "Socialità", categories: [{ name: "Social", icon: "🤝" }] },
  { interest: "Cultura", categories: [{ name: "Arte", icon: "🎨" }] },
  { interest: "Tecnologia", categories: [{ name: "Tech", icon: "💻" }] },
  { interest: "Nightlife", categories: [{ name: "Serata", icon: "🌙" }] }
];

type SeedEvent = {
  slug: string;
  title: string;
  category: string;
  organizer: string;
  dateHour: string;
  place: string;
  latitude: number;
  longitude: number;
  price: number;
  maxSeats: number | null;
  image: string;
  description: string;
  chatMode: ChatType;
  tags: string[];
  isLive: boolean;
};

const EVENTS: SeedEvent[] = [
  {
    slug: "sunset-jam",
    title: "Sunset Jam al Molo",
    category: "Concerto",
    organizer: "Officina Sonora",
    dateHour: "2026-05-29T20:30:00",
    place: "Via Molo Manfredi, Salerno",
    latitude: 40.6715,
    longitude: 14.7537,
    price: 8,
    maxSeats: 120,
    image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80",
    description:
      "Una jam session vista mare con band emergenti, area relax e canale chat per organizzarsi prima dell'ingresso.",
    chatMode: "OPEN_GROUP",
    tags: ["live", "mare", "indie"],
    isLive: false
  },
  {
    slug: "calcetto-lampo",
    title: "Calcetto lampo 5vs5",
    category: "Sport",
    organizer: "Antonio R.",
    dateHour: "2026-05-29T19:00:00",
    place: "Via Raffaele Mauri, Salerno",
    latitude: 40.6882,
    longitude: 14.7709,
    price: 6,
    maxSeats: 10,
    image: "https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&w=1200&q=80",
    description:
      "Partita veloce per completare due squadre equilibrate. La quota campo si divide in app al momento dell'adesione.",
    chatMode: "OPEN_GROUP",
    tags: ["5vs5", "sera", "amatoriale"],
    isLive: true
  },
  {
    slug: "street-food",
    title: "Street Food Tour",
    category: "Food",
    organizer: "Food Walk Salerno",
    dateHour: "2026-05-30T18:15:00",
    place: "Largo Campo, Salerno",
    latitude: 40.6782,
    longitude: 14.7589,
    price: 0,
    maxSeats: 45,
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
    description:
      "Passeggiata tra locali indipendenti, assaggi liberi e tappe consigliate dalla community.",
    chatMode: "ANNOUNCEMENTS",
    tags: ["gratis", "local", "tour"],
    isLive: false
  },
  {
    slug: "boardgame-cafe",
    title: "Boardgame Night",
    category: "Social",
    organizer: "Community Evnt",
    dateHour: "2026-05-31T21:00:00",
    place: "Piazza Matteo Luciani, Salerno",
    latitude: 40.6766,
    longitude: 14.7531,
    price: 4,
    maxSeats: 24,
    image: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=1200&q=80",
    description:
      "Tavoli misti, giochi rapidi e una chat aperta per scegliere il primo titolo prima di arrivare.",
    chatMode: "OPEN_GROUP",
    tags: ["boardgame", "nuove amicizie"],
    isLive: false
  },
  {
    slug: "notte-museo",
    title: "Notte al Museo",
    category: "Arte",
    organizer: "Musei in Rete",
    dateHour: "2026-06-02T20:00:00",
    place: "Via Mercanti 63, Salerno",
    latitude: 40.6787,
    longitude: 14.7562,
    price: 5,
    maxSeats: 60,
    image: "https://images.unsplash.com/photo-1545989253-02cc26577f88?auto=format&fit=crop&w=1200&q=80",
    description:
      "Percorso serale con guida breve, gruppo ristretto e reminder automatico un'ora prima.",
    chatMode: "ANNOUNCEMENTS",
    tags: ["cultura", "sera"],
    isLive: false
  },
  {
    slug: "hack-casual",
    title: "Hack Casual: app utili",
    category: "Tech",
    organizer: "Fablab UniSA",
    dateHour: "2026-06-04T17:30:00",
    place: "Via Allende, Baronissi",
    latitude: 40.7485,
    longitude: 14.7711,
    price: 0,
    maxSeats: 30,
    image: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80",
    description:
      "Mini laboratorio pratico per prototipare strumenti digitali utili al territorio.",
    chatMode: "OPEN_GROUP",
    tags: ["workshop", "gratis"],
    isLive: false
  }
];

// Approximate participant counts from the original mock data.
const PARTICIPANTS: Record<string, number> = {
  "sunset-jam": 74,
  "calcetto-lampo": 8,
  "street-food": 31,
  "boardgame-cafe": 18,
  "notte-museo": 42,
  "hack-casual": 16
};

async function main() {
  console.log("Seeding Evnt database...");

  // Reset (order matters for FKs)
  await prisma.chatMessage.deleteMany();
  await prisma.participation.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.event.deleteMany();
  await prisma.userInterest.deleteMany();
  await prisma.category.deleteMany();
  await prisma.interest.deleteMany();
  await prisma.user.deleteMany();

  // Interests + categories
  const categoryByName = new Map<string, number>();
  for (const t of TAXONOMY) {
    const interest = await prisma.interest.create({ data: { name: t.interest } });
    for (const c of t.categories) {
      const cat = await prisma.category.create({
        data: { name: c.name, iconCategory: c.icon, interestId: interest.id }
      });
      categoryByName.set(c.name, cat.id);
    }
  }

  const passwordHash = await bcrypt.hash("password123", 10);

  // Demo user (use this to log in from the app)
  const demo = await prisma.user.create({
    data: {
      email: "demo@evnt.app",
      name: "Mario",
      password: passwordHash,
      birthday: new Date("2002-04-12"),
      city: "Salerno",
      bio: "Esploro eventi locali e nuove amicizie.",
      interests: {
        create: [
          { interest: { connect: { name: "Musica" } } },
          { interest: { connect: { name: "Gastronomia" } } },
          { interest: { connect: { name: "Socialità" } } }
        ]
      }
    }
  });

  // Organizer accounts
  const organizers = [...new Set(EVENTS.map((e) => e.organizer))];
  const organizerByName = new Map<string, number>();
  for (const name of organizers) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
    const u = await prisma.user.create({
      data: {
        email: `${slug}@evnt.app`,
        name,
        password: passwordHash,
        birthday: new Date("1995-01-01"),
        city: "Salerno"
      }
    });
    organizerByName.set(name, u.id);
  }

  // Events + filler participations
  const eventBySlug = new Map<string, number>();
  for (const e of EVENTS) {
    const categoryId = categoryByName.get(e.category)!;
    const creatorId = organizerByName.get(e.organizer)!;
    const created = await prisma.event.create({
      data: {
        title: e.title,
        description: e.description,
        dateHour: new Date(e.dateHour),
        place: e.place,
        latitude: e.latitude,
        longitude: e.longitude,
        price: e.price,
        maxSeats: e.maxSeats,
        categoryId,
        chatType: e.chatMode,
        image: e.image,
        tags: e.tags,
        isLive: e.isLive,
        creatorId
      }
    });
    eventBySlug.set(e.slug, created.id);

    // creator participates + filler participants up to mock count
    await prisma.participation.create({ data: { eventId: created.id, userId: creatorId } });
    const target = PARTICIPANTS[e.slug] ?? 0;
    const fillers = Math.min(Math.max(target - 1, 0), 12); // cap filler accounts
    for (let i = 0; i < fillers; i++) {
      const u = await prisma.user.create({
        data: {
          email: `guest.${e.slug}.${i}@evnt.app`,
          name: `Guest ${i + 1}`,
          password: passwordHash,
          birthday: new Date("2000-06-15")
        }
      });
      await prisma.participation.create({ data: { eventId: created.id, userId: u.id } });
    }
  }

  // Demo user defaults (mirrors the app's initial state)
  await prisma.bookmark.createMany({
    data: [
      { userId: demo.id, eventId: eventBySlug.get("sunset-jam")! },
      { userId: demo.id, eventId: eventBySlug.get("street-food")! }
    ]
  });
  await prisma.participation.createMany({
    data: [{ userId: demo.id, eventId: eventBySlug.get("calcetto-lampo")! }],
    skipDuplicates: true
  });

  // Sample chat + notifications for the demo user
  await prisma.chatMessage.createMany({
    data: [
      {
        eventId: eventBySlug.get("sunset-jam")!,
        senderId: organizerByName.get("Officina Sonora")!,
        text: "Ci vediamo al molo! Cancello aperto dalle 20:00."
      },
      {
        eventId: eventBySlug.get("calcetto-lampo")!,
        senderId: organizerByName.get("Antonio R.")!,
        text: "Servono ancora 2 giocatori, chi c'è?"
      }
    ]
  });
  await prisma.notification.createMany({
    data: [
      {
        userId: demo.id,
        title: "Promemoria evento",
        message: "Sunset Jam al Molo inizia tra 1 ora.",
        isRead: false
      },
      {
        userId: demo.id,
        title: "Nuovo messaggio",
        message: "Antonio R. ha scritto nella chat di Calcetto lampo 5vs5.",
        isRead: false
      },
      {
        userId: demo.id,
        title: "Benvenuto su Evnt",
        message: "Completa il profilo e scopri eventi vicino a te.",
        isRead: true
      }
    ]
  });

  console.log("Seed complete.");
  console.log("Login: demo@evnt.app / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
