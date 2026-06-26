import "dotenv/config";
import { ChatType, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const demoPassword = "password123";
const subcategoryTagPrefix = "subcategory:";
const cityTagPrefix = "city:";

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

const profileImage = (name: string, background: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${background}&color=fff&size=256&bold=true`;

const futureDate = (daysFromNow: number, hour: number, minute = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const minutesAgo = (minutes: number) => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - minutes);
  return date;
};

const demoUsers = [
  {
    key: "mario",
    bio: "Organizzo partite, serate tranquille e uscite all'aperto. Mi piace creare gruppi spontanei con persone nuove.",
    birthday: new Date("2001-01-15"),
    city: "Luogosano",
    email: "mariodigregorio@evnt.app",
    image: profileImage("Mario Di Gregorio", "111827"),
    interests: ["Sport", "Socialità", "Gastronomia"],
    name: "Mario Di Gregorio"
  },
  {
    key: "laura",
    bio: "Amo trekking, musica dal vivo e posti in cui si chiacchiera bene. Sono sempre alla ricerca di eventi semplici ma curati.",
    birthday: new Date("2000-09-22"),
    city: "Summonte",
    email: "lauranigro@evnt.app",
    image: profileImage("Laura Nigro", "B42318"),
    interests: ["Benessere", "Musica", "Cultura"],
    name: "Laura Nigro"
  },
  {
    key: "riccardo",
    bio: "Sportivo, competitivo il giusto e appassionato di basket e calcetto. Se manca una persona in squadra, chiamatemi.",
    birthday: new Date("1999-05-09"),
    city: "Eboli",
    email: "riccardolaporta@evnt.app",
    image: profileImage("Riccardo Laporta", "047857"),
    interests: ["Sport", "Gaming", "Tecnologia"],
    name: "Riccardo Laporta"
  },
  {
    key: "simone",
    bio: "Mi piacciono concerti, giochi da tavolo e serate leggere. Porto sempre playlist e idee per far partire la conversazione.",
    birthday: new Date("2001-11-03"),
    city: "Pagani",
    email: "simonesquitieri@evnt.app",
    image: profileImage("Simone Squitieri", "0369A1"),
    interests: ["Socialità", "Nightlife", "Cinema"],
    name: "Simone Squitieri"
  }
] as const;

const demoEvents = [
  {
    key: "mario-calcetto",
    creator: "mario",
    participantKeys: ["mario", "riccardo", "simone"],
    category: "Sport",
    subcategory: "Calcetto 5v5",
    title: "Calcetto 5v5 a Grottaminarda",
    description: "Partita tranquilla ma organizzata: ci vediamo al campo, facciamo squadre equilibrate e poi pizza per chi resta.",
    dateHour: futureDate(5, 20, 30),
    place: "Centro Sportivo Irpinia",
    address: "Via Aldo Moro, Grottaminarda",
    city: "Grottaminarda",
    province: "Avellino",
    region: "Campania",
    postcode: "83035",
    countryCode: "IT",
    latitude: 41.0696,
    longitude: 15.0588,
    price: 6,
    maxSeats: 10,
    image: "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1200&q=80",
    tags: ["sport", "squadra"]
  },
  {
    key: "laura-trekking",
    creator: "laura",
    participantKeys: ["laura", "mario", "simone"],
    category: "Benessere",
    subcategory: "Trekking leggero",
    title: "Passeggiata a Montevergine",
    description: "Trekking facile con ritmo rilassato, pausa panoramica e caffe ad Avellino al rientro. Adatto anche a chi inizia.",
    dateHour: futureDate(7, 9, 15),
    place: "Santuario di Montevergine",
    address: "Via Santuario, Mercogliano",
    city: "Mercogliano",
    province: "Avellino",
    region: "Campania",
    postcode: "83013",
    countryCode: "IT",
    latitude: 40.9366,
    longitude: 14.7298,
    price: 0,
    maxSeats: 12,
    image: "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=80",
    tags: ["outdoor", "panorama"]
  },
  {
    key: "riccardo-basket",
    creator: "riccardo",
    participantKeys: ["riccardo", "mario", "laura"],
    category: "Sport",
    subcategory: "Basket 3vs3",
    title: "Basket 3vs3 a Battipaglia",
    description: "Mini torneo serale, squadre miste e partite rapide. Porta una maglia chiara e una scura.",
    dateHour: futureDate(9, 19, 0),
    place: "Pala Schiavo",
    address: "Via Serroni Alto, Battipaglia",
    city: "Battipaglia",
    province: "Salerno",
    region: "Campania",
    postcode: "84091",
    countryCode: "IT",
    latitude: 40.6087,
    longitude: 14.9865,
    price: 4,
    maxSeats: 9,
    image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80",
    tags: ["basket", "torneo"]
  },
  {
    key: "simone-boardgame",
    creator: "simone",
    participantKeys: ["simone", "laura", "riccardo"],
    category: "Gaming",
    subcategory: "Giochi da tavolo",
    title: "Board game night a Pagani",
    description: "Serata giochi da tavolo: scegliamo al momento tra party game e strategici leggeri. Tavolo aperto anche ai principianti.",
    dateHour: futureDate(6, 21, 0),
    place: "Caffe Letterario Pagani",
    address: "Corso Ettore Padovano, Pagani",
    city: "Pagani",
    province: "Salerno",
    region: "Campania",
    postcode: "84016",
    countryCode: "IT",
    latitude: 40.7412,
    longitude: 14.6148,
    price: 3,
    maxSeats: null,
    image: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=1200&q=80",
    tags: ["giochi", "social"]
  }
] as const;

const groupMessages = {
  "mario-calcetto": [
    { sender: "mario", text: "Ho bloccato il campo per le 20:30, arrivate dieci minuti prima." },
    { sender: "riccardo", text: "Perfetto, porto io un pallone di riserva." },
    { sender: "simone", text: "Ci sono, dopo partita mi fermo anche per la pizza." }
  ],
  "laura-trekking": [
    { sender: "laura", text: "Percorso facile: scarpe comode e acqua nello zaino." },
    { sender: "mario", text: "Ottimo, parto da Luogosano e posso passare da Avellino." },
    { sender: "simone", text: "Io ci sono, porto anche una power bank." }
  ],
  "riccardo-basket": [
    { sender: "riccardo", text: "Facciamo gironi veloci, cosi giochiamo tutti di piu." },
    { sender: "mario", text: "Io porto maglia chiara e scura." },
    { sender: "laura", text: "Mi unisco volentieri, livello tranquillo vero?" }
  ],
  "simone-boardgame": [
    { sender: "simone", text: "Porto Dixit, Ticket to Ride e un paio di party game." },
    { sender: "laura", text: "Dixit approvato, serata perfetta." },
    { sender: "riccardo", text: "Io voto per qualcosa di competitivo ma rapido." }
  ]
} as const;

const privateChats = [
  {
    users: ["mario", "laura"],
    messages: [
      { sender: "mario", text: "Ciao Laura, per Montevergine quanti km sono piu o meno?" },
      { sender: "laura", text: "Pochi, voglio tenerla leggera cosi viene anche chi non cammina spesso." },
      { sender: "mario", text: "Perfetto, allora mi iscrivo e condivido l'evento con gli altri." }
    ]
  },
  {
    users: ["mario", "riccardo"],
    messages: [
      { sender: "riccardo", text: "Mario, per il calcetto ti manca ancora qualcuno?" },
      { sender: "mario", text: "Si, un paio di posti liberi. Se conosci qualcuno aggiungilo pure." },
      { sender: "riccardo", text: "Grande, sento due amici e ti aggiorno." }
    ]
  },
  {
    users: ["laura", "simone"],
    messages: [
      { sender: "simone", text: "Laura, dopo il trekking posso proporti la serata board game?" },
      { sender: "laura", text: "Assolutamente si, mi sembra un bel weekend Evnt." }
    ]
  },
  {
    users: ["riccardo", "simone"],
    messages: [
      { sender: "simone", text: "Riccardo, per basket 3vs3 posso venire anche se non sono fortissimo?" },
      { sender: "riccardo", text: "Certo, l'idea e divertirsi. Squadre equilibrate e zero pressione." }
    ]
  }
] as const;

async function clearDatabase() {
  await prisma.chatMessage.deleteMany();
  await prisma.directMessage.deleteMany();
  await prisma.directConversation.deleteMany();
  await prisma.participation.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.event.deleteMany();
  await prisma.userInterest.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
  await prisma.interest.deleteMany();
}

async function createTaxonomy() {
  const categories = new Map<string, number>();
  const interests = new Map<string, number>();

  for (const item of TAXONOMY) {
    const interest = await prisma.interest.create({ data: { name: item.interest } });
    interests.set(item.interest, interest.id);

    for (const category of item.categories) {
      const createdCategory = await prisma.category.create({
        data: {
          iconCategory: category.icon,
          interestId: interest.id,
          name: category.name
        }
      });
      categories.set(category.name, createdCategory.id);
    }
  }

  return { categories, interests };
}

async function createUsers(interestIds: Map<string, number>) {
  const password = await bcrypt.hash(demoPassword, 10);
  const users = new Map<(typeof demoUsers)[number]["key"], number>();

  for (const account of demoUsers) {
    const user = await prisma.user.create({
      data: {
        bio: account.bio,
        birthday: account.birthday,
        city: account.city,
        email: account.email,
        image: account.image,
        name: account.name,
        password,
        interests: {
          create: account.interests.map((interest) => ({
            interestId: interestIds.get(interest)!
          }))
        }
      }
    });
    users.set(account.key, user.id);
  }

  return users;
}

async function createEvents(userIds: Map<string, number>, categoryIds: Map<string, number>) {
  const events = new Map<(typeof demoEvents)[number]["key"], number>();

  for (const item of demoEvents) {
    const event = await prisma.event.create({
      data: {
        address: item.address,
        categoryId: categoryIds.get(item.category)!,
        chatType: ChatType.OPEN_GROUP,
        city: item.city,
        countryCode: item.countryCode,
        creatorId: userIds.get(item.creator)!,
        dateHour: item.dateHour,
        description: item.description,
        image: item.image,
        latitude: item.latitude,
        longitude: item.longitude,
        maxSeats: item.maxSeats,
        place: item.place,
        postcode: item.postcode,
        price: item.price,
        province: item.province,
        region: item.region,
        tags: [...item.tags, `${subcategoryTagPrefix}${item.subcategory}`, `${cityTagPrefix}${item.city}`],
        title: item.title,
        participations: {
          create: item.participantKeys.map((userKey) => ({ userId: userIds.get(userKey)! }))
        }
      }
    });
    events.set(item.key, event.id);
  }

  return events;
}

async function createGroupChats(
  userIds: Map<string, number>,
  eventIds: Map<(typeof demoEvents)[number]["key"], number>
) {
  let messageOffset = 360;

  for (const [eventKey, messages] of Object.entries(groupMessages)) {
    for (const message of messages) {
      await prisma.chatMessage.create({
        data: {
          eventId: eventIds.get(eventKey as (typeof demoEvents)[number]["key"])!,
          senderId: userIds.get(message.sender)!,
          sentAt: minutesAgo(messageOffset),
          text: message.text
        }
      });
      messageOffset -= 8;
    }
  }
}

async function createPrivateChats(userIds: Map<string, number>) {
  let conversationOffset = 240;

  for (const chat of privateChats) {
    const [firstKey, secondKey] = chat.users;
    const firstUserId = userIds.get(firstKey)!;
    const secondUserId = userIds.get(secondKey)!;
    const [userAId, userBId] =
      firstUserId < secondUserId ? [firstUserId, secondUserId] : [secondUserId, firstUserId];
    const createdAt = minutesAgo(conversationOffset + chat.messages.length * 4);
    const conversation = await prisma.directConversation.create({
      data: {
        createdAt,
        updatedAt: createdAt,
        userAId,
        userBId
      }
    });

    let messageOffset = conversationOffset;
    for (const message of chat.messages) {
      await prisma.directMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: userIds.get(message.sender)!,
          sentAt: minutesAgo(messageOffset),
          text: message.text
        }
      });
      messageOffset -= 4;
    }

    await prisma.directConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: minutesAgo(messageOffset + 4) }
    });
    conversationOffset -= 35;
  }
}

async function createBookmarks(userIds: Map<string, number>, eventIds: Map<(typeof demoEvents)[number]["key"], number>) {
  await prisma.bookmark.createMany({
    data: [
      { eventId: eventIds.get("laura-trekking")!, userId: userIds.get("mario")! },
      { eventId: eventIds.get("mario-calcetto")!, userId: userIds.get("riccardo")! },
      { eventId: eventIds.get("simone-boardgame")!, userId: userIds.get("laura")! },
      { eventId: eventIds.get("riccardo-basket")!, userId: userIds.get("simone")! }
    ]
  });
}

async function main() {
  console.log("Reinizializzazione database Evnt...");
  await clearDatabase();
  const { categories, interests } = await createTaxonomy();
  const users = await createUsers(interests);
  const events = await createEvents(users, categories);
  await createGroupChats(users, events);
  await createPrivateChats(users);
  await createBookmarks(users, events);

  console.log("Seed completo. Vecchi dati rimossi e dati demo ricreati.");
  console.log(`Password demo per tutti gli account: ${demoPassword}`);
  for (const account of demoUsers) {
    console.log(`${account.email} / ${demoPassword}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
