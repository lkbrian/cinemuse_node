import { PrismaClient, User, AuthType } from "@prisma/client";

// Initialize Prisma Client properly
const prisma = new PrismaClient();

// Get all users
export const findMany = async () =>
  await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      authType: true,
      createdAt: true,
      updatedAt: true,
    },
  });

// Get user by ID
export const getUserById = async (id: number) => {
  return await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
      authType: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

// Get user by email
export const getUserByEmail = async (email: string) => {
  return await prisma.user.findUnique({
    where: { email },
  });
};

// Get user by Clerk ID
export const getUserByClerkId = async (clerkId: string) => {
  return await prisma.user.findFirst({
    where: { clerkId },
  });
};

// Create user (basic version - use auth controller for registration)
export const createUser = async (data: {
  username?: string;
  email: string;
  password?: string;
  authType?: AuthType;
  clerkId?: string;
}) => {
  return await prisma.user.create({
    data,
    select: {
      id: true,
      username: true,
      email: true,
      authType: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

// Update user
export const updateUser = async (
  id: number,
  data: {
    username?: string;
    email?: string;
    password?: string;
  }
) => {
  return await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      username: true,
      email: true,
      authType: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

// Partial update user
export const partialUpdateUser = async (
  id: number,
  data: Partial<{
    username: string;
    email: string;
    password: string;
  }>
) => {
  return await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      username: true,
      email: true,
      authType: true,
      createdAt: true,
      updatedAt: true,
      // Exclude password for security
    },
  });
};

// Delete user
export const deleteUser = async (id: number) => {
  return await prisma.user.delete({
    where: { id },
  });
};
