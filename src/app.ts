import express from "express";
import { requireAuth } from "./middlewares/auth.middlewares";
import { errorHandler } from "./middlewares/error.middlewares";
import router from "./routes";
import cors from "cors";

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("/api/v1", router);
app.use(errorHandler);

export default app;
