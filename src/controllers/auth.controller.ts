// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from "express";
import { PrismaClient, AuthType } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt, { Secret, SignOptions } from "jsonwebtoken";

const prisma = new PrismaClient();

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET; // Replace with actual secret in production
const options: SignOptions = {
  algorithm: "HS256",
  expiresIn: "7d",
};
// Register a new user with email/password
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, username } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({ message: "User already exists with this email" });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        authType: "email" as AuthType,
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET as string,
      options
    );

    // Return user info (excluding password) and token
    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

// Login with email/password
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Check if user exists and password is correct
    if (!user || !user.password) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET as Secret,
      options
    );

    // Return user info and token
    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

// Logout (for email auth)
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // JWT is stateless, so we don't need to do anything server-side
  // The client should remove the token from storage
  res.status(200).json({ message: "Logged out successfully" });
};

// Handle Clerk user creation/linking
export const handleClerkUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { clerkId, email, username } = req.body;

    if (!clerkId || !email) {
      res.status(400).json({ message: "Clerk ID and email are required" });
      return;
    }

    // Check if user already exists with this email
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // If user exists but doesn't have clerkId, update it
      if (!user.clerkId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            clerkId,
            authType: "clerk" as AuthType,
          },
        });
      }
    } else {
      // Create new user with Clerk ID
      user = await prisma.user.create({
        data: {
          email,
          username,
          clerkId,
          authType: "clerk" as AuthType,
        },
      });
    }

    res.status(200).json({
      message: "Clerk user processed successfully",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get current user info
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // User should be attached to request by auth middleware
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        authType: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};
