import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Error one:", err.stack);
  console.error(`[${new Date().toISOString()}] Error two:`, err);

  // Check if headers have already been sent
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({
    message: "Something went wrong",
    error:
      process.env.NODE_ENV === "development" ? err.message : "Internal error",
  });
};

export default errorHandler;
