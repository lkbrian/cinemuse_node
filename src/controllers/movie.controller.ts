// controllers/groqController.ts

import { NextFunction, Request, Response } from "express";
import * as movieService from "../services/movies.service";
import { genre } from "../utils/types";
import removeMd from "remove-markdown";
import * as chatService from "../services/chat.service";
const handleGroqRecommendation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { message, mode, chatId, userId, role } = req.body;

  if (!message) {
    res.status(400).json({ error: "User message is required." });
    return;
  }

  try {
    const chat = await chatService.createOrGetChat({ chatId, userId });
    if (!chat) {
      return next(new Error("Chat not found or could not be created."));
    }

    // add user message
    try {
      if (chat) {
        await chatService.addMessageToChat(chat.id, message, "user");
      }
    } catch (error) {
      next(error);
    }
    const groqResponse = await movieService.getGroqResponse(message, mode);
    const groqText = removeMd(groqResponse);
    let assistantMessage;
    try {
      if (chat) {
        assistantMessage = await chatService.addMessageToChat(
          chat.id,
          groqText,
          "assistant"
        );
      }
    } catch (error) {
      next(error);
    }

    if (mode === "recommend") {
      const genres: genre[] = await movieService.fetchGenres();

      const matchedGenres = genres.filter((genre) =>
        groqText.toLowerCase().includes(genre.name.toLowerCase())
      );

      if (!matchedGenres.length) {
        res.status(200).json({
          message: groqText,
          recommendations: [],
          note: "No genres could be matched to TMDB IDs from the AI response.",
        });
        return;
      }

      const genreIds = matchedGenres.map((g) => g.id);
      const movies = await movieService.fetchMovieByGenre(genreIds);
      if (assistantMessage) {
        await movieService.saveMovieRecommendations(
          assistantMessage.id,
          movies
        );
      }
      res.status(200).json({
        message: groqText,
        genres: matchedGenres.map((g) => g.name),
        movies,
      });
    } else {
      res.status(200).json({
        message: groqText,
      });
    }
  } catch (error) {
    next(error);
  }
};

const getUserChats = async (
  userId: number,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const chats = await chatService.getUserChats(userId);
    res.status(200).json({ chats });
    return;
  } catch (error) {
    next(error);
  }
};

const getChatById = async (
  chatId: number,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const chat = await chatService.getChatById(chatId);
    res.status(200).json({ chat });
  } catch (error) {
    next(error);
  }
};

export { handleGroqRecommendation, getUserChats, getChatById };
