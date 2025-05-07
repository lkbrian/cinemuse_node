// controllers/groqController.ts

import { NextFunction, Request, Response } from "express";
import * as movieService from "../services/movies.service";
import { genre } from "../utils/types";
import removeMd from "remove-markdown";
import * as chatService from "../services/chat.service";

/**
 * Handle streaming response from Groq API
 */
const handleStreamingResponse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { message, mode, chatId, userId, limit } = req.body;

  if (!message) {
    res.status(400).json({ error: "User message is required." });
    return;
  }

  try {
    // Set headers for streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Create or get chat
    const chat = await chatService.createOrGetChat({ chatId, userId });
    if (!chat) {
      res.write(
        `data: ${JSON.stringify({
          error: "Chat not found or could not be created.",
        })}\n\n`
      );
      res.end();
      return;
    }

    await chatService.addMessageToChat(chat.id, message, "user");

    const stream = await movieService.getGroqResponse(message, mode, true);

    let fullResponse = "";

    // Process the stream
    stream.data.on("data", (chunk: Buffer) => {
      const chunkText = chunk.toString();

      try {
        // The response comes as multiple JSON objects separated by newlines
        const lines = chunkText
          .split("\n")
          .filter((line) => line.trim() !== "");

        for (const line of lines) {
          // Skip "data: [DONE]" messages
          if (line === "data: [DONE]") continue;

          const jsonStr = line.startsWith("data: ") ? line.slice(6) : line;

          try {
            const json = JSON.parse(jsonStr);
            if (
              json.choices &&
              json.choices[0] &&
              json.choices[0].delta &&
              json.choices[0].delta.content
            ) {
              const content = json.choices[0].delta.content;
              fullResponse += content;

              res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
          } catch (e) {
            console.error("Error parsing JSON from chunk:", jsonStr, e);
          }
        }
      } catch (e) {
        console.error("Error processing chunk:", e);
      }
    });

    stream.data.on("end", async () => {
      try {
        const assistantMessage = await chatService.addMessageToChat(
          chat.id,
          fullResponse,
          "assistant"
        );

        if (mode === "recommend" && fullResponse) {
          const genres: genre[] = await movieService.fetchGenres();

          const matchedGenres = genres.filter((genre) =>
            fullResponse.toLowerCase().includes(genre.name.toLowerCase())
          );

          if (matchedGenres.length) {
            const genreIds = matchedGenres.map((g) => g.id);
            const movies = await movieService.fetchMovieByGenre(
              genreIds,
              limit
            );

            if (assistantMessage) {
              await movieService.saveMovieRecommendations(
                assistantMessage.id,
                movies
              );
            }

            res.write(
              `data: ${JSON.stringify({
                complete: true,
                genres: matchedGenres.map((g) => g.name),
                movies,
              })}\n\n`
            );
          }
        }

        res.write(`data: ${JSON.stringify({ complete: true })}\n\n`);
        res.end();
      } catch (error) {
        console.error("Error saving response:", error);
        res.write(
          `data: ${JSON.stringify({ error: "Error saving response" })}\n\n`
        );
        res.end();
      }
    });

    stream.data.on("error", (err: Error) => {
      console.error("Stream error:", err);
      res.write(
        `data: ${JSON.stringify({ error: "Stream error occurred" })}\n\n`
      );
      res.end();
    });
  } catch (error) {
    console.error("Error setting up stream:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Error setting up stream" });
    } else {
      res.write(
        `data: ${JSON.stringify({ error: "Error setting up stream" })}\n\n`
      );
      res.end();
    }
  }
};
const handleStreamedResponseNoLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const limit = 3;
  const { message, mode } = req.body;
  if (!message) {
    res.status(400).json({ error: "User message is required" });
    return;
  }
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await movieService.getGroqResponse(message, mode, true);
    let fullResponse = " ";
    stream.data.on("data", (chunk: Buffer) => {
      const chunckText = chunk.toString();
      try {
        const lines = chunckText
          .split("\n")
          .filter((line) => line.trim() !== "");
        for (const line of lines) {
          if (line === "data: [DONE]") continue;
          const jsonString = line.startsWith("data: ") ? line.slice(6) : line;
          try {
            const json = JSON.parse(jsonString);
            if (
              json.choices &&
              json.choices[0] &&
              json.choices[0].delta &&
              json.choices[0].delta.content
            ) {
              const content = json.choices[0].delta.content;
              fullResponse += content;

              res.write(`data: ${JSON.stringify({ content })}`);
            }
          } catch (error) {
            console.error("Error parsing JSON from chunk:", jsonString, error);
            next(error);
          }
        }
      } catch (error) {
        console.error("Error processing chunk", error);
        next(error);
      }
    });
    stream.data.on("end", async () => {
      try {
        if (mode === "recommend" && fullResponse) {
          const genres: genre[] = await movieService.fetchGenres();
          const matchedGenres = genres.filter((genre) =>
            fullResponse.toLowerCase().includes(genre.name.toLowerCase())
          );
          if (matchedGenres.length) {
            const genreIds = matchedGenres.map((g) => g.id);
            const movies = movieService.fetchMovieByGenre(genreIds, limit);
            res.write(
              `data: ${JSON.stringify({
                completed: true,
                genres: matchedGenres.map((g) => g.name),
                movies,
              })}\n\n`
            );
          }
        }
        res.write(`data: ${JSON.stringify({ completed: true })}`);
        res.end();
      } catch (error) {
        console.error("Error saving response:", error);
        res.write(
          `data: ${JSON.stringify({ error: "Error saving response" })}\n\n`
        );
        res.end();
        next(error);
      }
    });

    stream.data.om("error", (error: Error) => {
      console.error("Error saving response:", error);
      res.write(
        `data: ${JSON.stringify({ error: "Error saving response" })}\n\n`
      );
      res.end();
    });
  } catch (error) {
    console.error("Error setting up stream:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Error setting up stream" });
    } else {
      res.write(
        `data: ${JSON.stringify({ error: "Error setting up stream" })}\n\n`
      );
      res.end();
    }
  }
};
const handleNoLoginRecommendandation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { message, mode } = req.body;
  const limit = 3;
  if (!message) {
    res.status(400).json({ error: "User message is required." });
    return;
  }

  try {
    const groqResponse = await movieService.getGroqResponse(message, mode);
    const groqText = removeMd(groqResponse)
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();

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
      const movies = await movieService.fetchMovieByGenre(genreIds, limit);

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
    const groqText = removeMd(groqResponse)
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();

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
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = parseInt(req.query.userId as string);
    const chats = await chatService.getUserChats(userId);
    res.status(200).json({ chats });
    return;
  } catch (error) {
    next(error);
  }
};

const getChatById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const messageLimit = req.query.limit
      ? parseInt(req.query.limit as string)
      : 50;
    const chatId = Number(req.query.chatId);
    const chat = await chatService.getChatById(chatId, messageLimit);
    res.status(200).json({ chat });
  } catch (error) {
    next(error);
  }
};

/**
 * Get messages for a specific chat with optional pagination
 */
const getChatMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const chatId = parseInt(req.query.chatId as string);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    if (isNaN(chatId)) {
      res.status(400).json({ error: "Valid chatId is required" });
      return;
    }

    const messages = await chatService.getMessagesByChatId(
      chatId,
      limit,
      offset
    );
    res.status(200).json({ messages });
  } catch (error) {
    next(error);
  }
};

export {
  handleNoLoginRecommendandation,
  handleGroqRecommendation,
  handleStreamingResponse,
  getUserChats,
  getChatById,
  getChatMessages,
  handleStreamedResponseNoLogin,
};
