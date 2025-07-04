import { genre } from "./../utils/types";
import axios from "axios";
import { PrismaClient } from "@prisma/client";
import { Groq } from "groq-sdk"; // Assuming you have a Groq API client
require("dotenv").config();

const prisma = new PrismaClient();
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY, // This is the default and can be omitted
});

const fetchGenres = async () => {
  try {
    const res = await axios.get(
      `https://api.themoviedb.org/3/genre/movie/list`,
      {
        params: {
          api_key: process.env.TMDB_API_KEY,
          language: "en-US",
        },
      }
    );
    return res.data.genres;
  } catch (error) {
    console.log("error", error);
  }
};

const fetchMovieByGenre = async (genreId: number[], limit: number = 10) => {
  try {
    const res = await axios.get(`https://api.themoviedb.org/3/discover/movie`, {
      params: {
        api_key: process.env.TMDB_API_KEY,
        language: "en-US",
        with_genres: genreId.join(", "),
      },
    });
    return res.data.results.slice(0, Math.min(limit, 20));
  } catch (error) {
    console.log("error", error);
  }
};

const getGroqResponse = async (
  userMessage: string,
  mode = "recommend",
  stream = false
) => {
  const genres: genre[] = await fetchGenres();
  const systemPrompt =
    mode === "chat"
      ? `You are a helpful assistant who only answers questions about movies. If the question is unrelated to movies, politely remind the user to stick to movie topics.`
      : `You are a movie recommendation assistant. Based on this user's mood, match it with appropriate genres from this list: ${genres
          .map((g) => g.name)
          .join(", ")}.
      
Guidelines:
    1. Identify the user's mood based on their message.
    2. Suggest 1-2 genres that match the mood.
    3. Provide a brief explanation (1–2 sentences) for why the genres fit.
    4. Keep the response under 6 sentences.
    5. If only one mood is mentioned, suggest one genre. If multiple moods are mentioned, balance the genres.
    6. Use a polite, positive, and empathetic tone.
    7. Ask for clarification if the mood is unclear.
    8. Be sensitive to various moods (happy, sad, adventurous, relaxed, etc.).
    9. Offer realistic and specific genre suggestions.
    10. Adapt to ambiguous contexts and refocus the user on mood-based requests.
    11. Encourage the user to explore genres they may not have considered that could bring their mood back.
    12. Provide a concise, focused recommendation, avoiding generic responses.`;

  try {
    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "gemma2-9b-it",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        stream: stream,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        responseType: stream ? "stream" : "json",
      }
    );

    if (stream) {
      return res; // Return the stream directly
    }

    // Non-streaming response handling
    if (
      res.data &&
      res.data.choices &&
      res.data.choices[0] &&
      res.data.choices[0].message
    ) {
      return res.data.choices[0].message.content.trim();
    } else {
      console.error("Unexpected Groq API response structure:", res.data);
      return "Sorry, I couldn't process your request.";
    }
  } catch (err) {
    console.error("Groq API Error:", err);
    return "Sorry, I couldn't process your request.";
  }
};

export const saveMovieRecommendations = async (
  messageId: number,
  movies: any[]
) => {
  // First, ensure all movies exist in the database
  const savedMovies = await Promise.all(
    movies.map(async (movieData) => {
      // Check if movie already exists by TMDB ID
      let movie = await prisma.movie.findUnique({
        where: { tmdbId: movieData.id },
      });

      // If not, create it
      if (!movie) {
        movie = await prisma.movie.create({
          data: {
            tmdbId: movieData.id,
            title: movieData.title,
            overview: movieData.overview || null,
            releaseDate: movieData.release_date
              ? new Date(movieData.release_date)
              : null,
            posterPath: movieData.poster_path || null,
            backdropPath: movieData.backdrop_path || null,
            voteAverage: movieData.vote_average || null,
            voteCount: movieData.vote_count || null,
            genres: movieData.genre_ids || [],
          },
        });
      }

      return movie;
    })
  );

  // Now link these movies to the message as recommendations
  const recommendations = await Promise.all(
    savedMovies.map((movie) =>
      prisma.recommendedMovie.create({
        data: {
          messageId,
          movieId: movie.id,
        },
      })
    )
  );

  return recommendations;
};

export { getGroqResponse, fetchGenres, fetchMovieByGenre };
