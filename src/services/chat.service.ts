import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getChats = async () => await prisma.chat.findMany();

export const getUserChats = async (id: number) =>
  await prisma.chat.findMany({
    where: { userId: id },
  });

export const getChatById = async (id: number) =>
  await prisma.chat.findUnique({
    where: { id },
    include: {
      messages: {
        include: {
          recommendedMovies: {
            include: {
              movie: true,
            },
          },
        },
      },
    },
  });

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
