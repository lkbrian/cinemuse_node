import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getChats = async () => await prisma.chat.findMany();

export const getUserChats = async (id: number) =>
  await prisma.chat.findMany({
    where: { userId: id },
    include: {
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

export const getChatById = async (id: number, messageLimit: number = 50) =>
  await prisma.chat.findUnique({
    where: { id },
  });

export const getMessagesByChatId = async (
  chatId: number,
  limit: number = 50,
  offset: number = 0
) => {
  return await prisma.message.findMany({
    where: { chatId },
    include: {
      recommendedMovies: {
        include: {
          movie: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    skip: offset,
    take: limit,
  });
};

export const createOrGetChat = async ({
  chatId,
  userId,
}: {
  chatId?: number;
  userId?: number;
}) => {
  if (chatId && !userId) {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
    });
    if (!chat) {
      throw new Error("Chat not found");
    }
    return chat;
  }
  if (typeof userId == "number") {
    return await prisma.chat.create({ data: { userId: userId } });
  }
  return null;
};

export const addMessageToChat = async (
  chatId: number,
  content: string,
  role: "user" | "assistant" = "assistant"
) => {
  return await prisma.message.create({
    data: {
      chatId,
      role,
      content,
    },
  });
};
