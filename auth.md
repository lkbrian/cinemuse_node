# CineMuse Authentication Implementation

## Overview

This document outlines the authentication system implemented for CineMuse, which supports two authentication methods:

1. **Email/Password Authentication**: Traditional authentication using JWT tokens
2. **Clerk Authentication**: OAuth/Social login via Google using Clerk

## Schema Changes

The Prisma schema has been updated to use a single `User` model that can handle both authentication methods:

```prisma
model User {
  id            Int       @id @default(autoincrement())
  username      String?
  email         String    @unique
  password      String?   // Hashed password for email auth users
  authType      AuthType  @default(email)
  clerkId       String?   // Optional link to Clerk ID if they use Google/Clerk
  chats         Chat[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

enum AuthType {
  email
  clerk
}
```

## Authentication Middleware

Three middleware functions have been implemented:

1. `requireEmailAuth`: Validates JWT tokens for email/password users
2. `requireClerkAuth`: Uses Clerk's middleware for OAuth/social login users
3. `requireAuth`: Combined middleware that checks both authentication methods

## Authentication Controllers

The following endpoints have been implemented:

- `POST /auth/register`: Register with email/password
- `POST /auth/login`: Login with email/password
- `POST /auth/logout`: Logout (client-side token removal)
- `POST /auth/clerk`: Handle Clerk user creation/linking
- `GET /auth/me`: Get current user info (protected route)

## User Flow

### Email Authentication Flow:

1. User registers with email/password
2. Backend hashes password and stores user in database
3. JWT token is returned to client
4. Client includes token in Authorization header for subsequent requests
5. `requireAuth` middleware validates the token

### Clerk Authentication Flow:

1. User authenticates with Google via Clerk in the frontend
2. Frontend gets Clerk user data and sends to `/auth/clerk` endpoint
3. Backend creates or links a User record with the Clerk ID
4. Clerk session is managed by Clerk's frontend SDK
5. `requireAuth` middleware validates the Clerk session

## Implementation Notes

- Password hashing is handled with bcrypt
- JWT tokens are used for email authentication
- Clerk handles OAuth/social login authentication
- A single User model simplifies data relationships while supporting both auth methods
