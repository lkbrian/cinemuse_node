# CineMuse

A movie recommendation and chat application that helps users discover films based on their preferences.

## Features

- User authentication (Email/Password and Google via Clerk)
- Movie recommendations
- Chat interface for movie discussions
- TMDb integration for movie data

## Authentication System

CineMuse supports two authentication methods:

1. **Email/Password Authentication**: Traditional authentication using JWT tokens
2. **Clerk Authentication**: OAuth/Social login via Google using Clerk

For detailed information about the authentication implementation, see [Authentication Documentation](./auth.md).

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL  (pg+15)
- Prisma for orm
- Clerk account (for OAuth/social login)

### Installation

1. Clone the repository
   ```
   git clone git@github.com:lkbrian/cinemuse_node.git
   cd cinemuse_node
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables
   ```
   cp .env.example .env
   ```
   Then edit the `.env` file with your database and Clerk credentials.

4. Generate database schema
   ```
   npx prisma generate 
   ```
5. Run database migrations
   ```
   npx prisma migrate dev
   ```

6. Start the development server
   ```
   npm run dev
   ```

## API Endpoints

### Authentication

- `POST /auth/register` - Register with email/password
- `POST /auth/login` - Login with email/password
- `POST /auth/logout` - Logout
- `POST /auth/clerk` - Handle Clerk user creation/linking
- `GET /auth/me` - Get current user info (protected)

### Users

- `GET /users` - Get all users (admin only)
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Movies

- `GET /movie/assistant` - Get movie recommendations
- `GET /movies/:id` - Get movie details

### Chats

- `GET /chats` - Get user's chats
- `GET /chats/:id` - Get chat by ID

## Tech Stack

- **Backend**: Node.js, Express, Prisma
- **Database**: PostgreSQL
- **Authentication**: JWT, Clerk
- **External APIs**: TMDb (The Movie Database)

## License

This project is licensed under the MIT License - see the LICENSE file for details.
