// src/middleware/auth.middlewares.ts
import { requireAuth as ClerkExpressRequireAuth } from "@clerk/express";
import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Environment variables for JWT (should be in your .env file)
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"; // Replace with actual secret in production

// Interface for JWT payload
interface JwtPayload {
  userId: number;
  email: string;
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        authType: "email" | "clerk";
        clerkId?: string;
      };
    }
  }
}

// Clerk authentication middleware
export const requireClerkAuth: RequestHandler = ClerkExpressRequireAuth({});

// Email authentication middleware
export const requireEmailAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    // Attach user to request object
    req.user = {
      id: user.id,
      email: user.email,
      authType: "email",
      clerkId: user.clerkId || undefined,
    };

    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }
};

// Combined auth middleware that checks both authentication methods
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Check for JWT token first (email auth)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return requireEmailAuth(req, res, next);
  }

  // If no JWT token, try Clerk auth
  return requireClerkAuth(req, res, next);
};
