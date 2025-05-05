import { genre } from "./../utils/types";
import axios from "axios";
import { PrismaClient } from "@prisma/client";
require("dotenv").config();

const prisma = new PrismaClient();

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

const fetchMovieByGenre = async (genreId: number[]) => {
  try {
    const res = await axios.get(`https://api.themoviedb.org/3/discover/movie`, {
      params: {
        api_key: process.env.TMDB_API_KEY,
        language: "en-US",
        with_genres: genreId.join(", "),
      },
    });
    return res.data.results;
  } catch (error) {
    console.log("error", error);
  }
};

const getGroqResponse = async (userMessage: string, mode = "recommend") => {
  const genres: genre[] = await fetchGenres();
  const systemPrompt =
    mode === "chat"
      ? `You are a helpful assistant who only answers questions about movies. If the question is unrelated to movies, politely remind the user to stick to movie topics.`
      : `You are a movie recommendation assistant. Based on this user's mood, match it with appropriate genres from this list: ${genres
          .map((g) => g.name)
          .join(", ")}.
      
Guidelines:
1. Identify the user's mood.
2. Suggest 1–2 genres that match the mood.
3. Mention why those genres are a good fit.
4. Keep the answer under 3 sentences.
5. if a user suggests one mood give them one mood`;

  try {
    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        stream: false, // Changed to false to get a complete response
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Check if response has the expected structure
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
