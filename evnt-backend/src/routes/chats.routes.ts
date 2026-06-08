import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authRequired } from "../middleware/auth";
import { publishToUser } from "../realtime";
import { HttpError, asyncHandler } from "../utils/http";
import { notifyDirectMessage } from "../utils/notifications";

export const chatsRouter = Router();
chatsRouter.use(authRequired);

const userSelect = {
  city: true,
  email: true,
  id: true,
  image: true,
  name: true
} as const;

const startDirectChatSchema = z.object({
  email: z.string().trim().toLowerCase().email()
});

const messageSchema = z.object({
  text: z.string().trim().min(1).max(2000)
});

type SerializableUser = Parameters<typeof serializeUser>[0];
type SerializableDirectMessage = Parameters<typeof serializeDirectMessage>[0];

type SerializableConversation = {
  id: number;
  updatedAt: Date;
  userA: SerializableUser;
  userAId: number;
  userB: SerializableUser;
};

function canonicalPair(currentUserId: number, otherUserId: number) {
  return currentUserId < otherUserId
    ? { userAId: currentUserId, userBId: otherUserId }
    : { userAId: otherUserId, userBId: currentUserId };
}

function serializeUser(user: {
  city: string | null;
  email: string;
  id: number;
  image: string | null;
  name: string;
}) {
  return {
    avatar: user.image ?? undefined,
    city: user.city ?? "",
    email: user.email,
    id: user.id,
    name: user.name
  };
}

function serializeDirectMessage(message: {
  conversationId: number;
  id: number;
  sender: {
    city: string | null;
    email: string;
    id: number;
    image: string | null;
    name: string;
  };
  sentAt: Date;
  text: string;
}) {
  return {
    conversationId: message.conversationId,
    id: message.id,
    sender: serializeUser(message.sender),
    sentAt: message.sentAt.toISOString(),
    text: message.text
  };
}

function serializeConversationForUser(
  conversation: SerializableConversation,
  currentUserId: number,
  lastMessage?: SerializableDirectMessage
) {
  const participant = conversation.userAId === currentUserId ? conversation.userB : conversation.userA;
  return {
    id: conversation.id,
    lastMessage: lastMessage ? serializeDirectMessage(lastMessage) : undefined,
    participant: serializeUser(participant),
    updatedAt: conversation.updatedAt.toISOString()
  };
}

async function getConversationForUser(conversationId: number, userId: number) {
  const conversation = await prisma.directConversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ userAId: userId }, { userBId: userId }]
    },
    include: {
      userA: { select: userSelect },
      userB: { select: userSelect }
    }
  });

  if (!conversation) {
    throw new HttpError(404, "Conversazione non trovata");
  }

  return conversation;
}

chatsRouter.get(
  "/direct",
  asyncHandler(async (req, res) => {
    const conversations = await prisma.directConversation.findMany({
      where: { OR: [{ userAId: req.userId! }, { userBId: req.userId! }] },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          include: { sender: { select: userSelect } },
          orderBy: { sentAt: "desc" },
          take: 1
        },
        userA: { select: userSelect },
        userB: { select: userSelect }
      }
    });

    res.json({
      conversations: conversations.map((conversation) => {
        return serializeConversationForUser(conversation, req.userId!, conversation.messages[0]);
      })
    });
  })
);

chatsRouter.post(
  "/direct",
  asyncHandler(async (req, res) => {
    const body = startDirectChatSchema.parse(req.body);
    const otherUser = await prisma.user.findUnique({
      where: { email: body.email },
      select: userSelect
    });

    if (!otherUser || otherUser.id === req.userId) {
      throw new HttpError(404, "Utente non trovato");
    }

    const pair = canonicalPair(req.userId!, otherUser.id);
    const conversation = await prisma.directConversation.upsert({
      where: { userAId_userBId: pair },
      update: {},
      create: pair,
      include: {
        messages: {
          include: { sender: { select: userSelect } },
          orderBy: { sentAt: "desc" },
          take: 1
        },
        userA: { select: userSelect },
        userB: { select: userSelect }
      }
    });

    res.status(201).json({
      conversation: serializeConversationForUser(conversation, req.userId!, conversation.messages[0])
    });
  })
);

chatsRouter.get(
  "/direct/:id/messages",
  asyncHandler(async (req, res) => {
    const conversationId = Number(req.params.id);
    if (!Number.isInteger(conversationId)) {
      throw new HttpError(400, "Conversazione non valida");
    }

    await getConversationForUser(conversationId, req.userId!);
    const messages = await prisma.directMessage.findMany({
      where: { conversationId },
      include: { sender: { select: userSelect } },
      orderBy: { sentAt: "asc" }
    });

    res.json({ messages: messages.map(serializeDirectMessage) });
  })
);

chatsRouter.post(
  "/direct/:id/messages",
  asyncHandler(async (req, res) => {
    const conversationId = Number(req.params.id);
    if (!Number.isInteger(conversationId)) {
      throw new HttpError(400, "Conversazione non valida");
    }

    const body = messageSchema.parse(req.body);
    const conversation = await getConversationForUser(conversationId, req.userId!);
    const recipientId = conversation.userAId === req.userId ? conversation.userBId : conversation.userAId;
    const message = await prisma.directMessage.create({
      data: {
        conversationId,
        senderId: req.userId!,
        text: body.text
      },
      include: { sender: { select: userSelect } }
    });
    const updatedConversation = await prisma.directConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
      include: {
        userA: { select: userSelect },
        userB: { select: userSelect }
      }
    });
    const serializedMessage = serializeDirectMessage(message);
    [req.userId!, recipientId].forEach((userId) => {
      publishToUser(userId, {
        payload: {
          conversation: serializeConversationForUser(updatedConversation, userId, message),
          message: serializedMessage
        },
        type: "direct-message"
      });
    });
    await notifyDirectMessage(recipientId, message.sender.name);

    res.status(201).json({ message: serializedMessage });
  })
);
