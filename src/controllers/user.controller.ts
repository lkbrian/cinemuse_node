import { NextFunction, Request, Response } from "express";
import * as userService from "../services/user.service";

const home = (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({ message: "CinèMuse let's get you something" });
  } catch (error) {
    next(error);
  }
};

// Get all users
const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const users = await userService.findMany();
    res.json(users); // Sending response here
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error });
  }
};

// Get a single user by ID
const getUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { id } = req.params;
  try {
    const user = await userService.getUserById(Number(id));
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// Create a new user
const createUser = async (req: Request, res: Response): Promise<void> => {
  const { username, email } = req.body;
  try {
    const user = await userService.createUser({ username, email });
    res.status(201).json(user); // Successful creation
  } catch (error) {
    res.status(500).json({ message: "Error creating user", error });
  }
};

// Update user (PUT) - Full update
const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { id } = req.params;
  const { username, email } = req.body;

  try {
    const user = await userService.updateUser(Number(id), { username, email });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};
// Partially update user (PATCH)
const partialUpdateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { id } = req.params;
  const { username, email } = req.body;
  try {
    const user = await userService.partialUpdateUser(Number(id), {
      username,
      email,
    });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json(user); // Sending updated user as response
  } catch (error) {
    next(error);
  }
};

// Delete user
const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { id } = req.params;
  try {
    const user = await userService.deleteUser(Number(id));
    if (!user) {
      res.status(404).json({ message: "User not found" });
    }
    res.status(204).send(); // No content to send on successful deletion
  } catch (error) {
    next(error);
  }
};
export {
  deleteUser,
  updateUser,
  partialUpdateUser,
  createUser,
  getUser,
  getAllUsers,
  home,
};
