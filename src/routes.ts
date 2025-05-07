import { Router } from "express";
import * as userController from "./controllers/user.controller";
import * as movieController from "./controllers/movie.controller";
import * as authController from "./controllers/auth.controller";
import { requireAuth } from "./middlewares/auth.middlewares";

const router = Router();

// home api
router.get("/", userController.home);

// authentication routes
router.post("/auth/register", authController.register);
router.post("/auth/login", authController.login);
router.post("/auth/logout", authController.logout);
router.post("/auth/clerk", authController.handleClerkUser);
router.get("/auth/me", requireAuth, authController.getCurrentUser);

//users
router.get("/users/getall", userController.getAllUsers);
router.get("/users/getsingle", userController.getUser);

//chats
router.get("/chat/getuserchats", requireAuth, movieController.getUserChats);
router.get("/chat/byid", requireAuth, movieController.getChatById);
router.get("/chat/messages", requireAuth, movieController.getChatMessages);

// ai recommended movies
router.post(
  "/groq/recommendation",
  movieController.handleNoLoginRecommendandation
);
router.post(
  "/groq/recommendation/stream",
  movieController.handleStreamedResponseNoLogin
);
router.post(
  "/chat/movie/assitant",
  requireAuth,
  movieController.handleGroqRecommendation
);

// Streaming endpoint
router.post(
  "/chat/stream",
  requireAuth,
  movieController.handleStreamingResponse
);

// ai recommended songs

export default router;
