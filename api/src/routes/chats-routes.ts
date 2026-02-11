import { Router } from "express";
import { chatCompletionValidator, validate } from "../utils/validators.js";
import {
  createChatCompletion,
  deleteUserChats,
  getUserChats,
} from "../controllers/chat-controllers.js";
import {
  authenticateToken,
  authenticateUser,
} from "../middleware/auth-middleware.js";
import { arcjetProtection } from "../middleware/arcjet-middleware.js";

const chatsRoutes = Router();

chatsRoutes.use(arcjetProtection);

chatsRoutes.post(
  "/",
  validate(chatCompletionValidator()),
  authenticateToken,
  authenticateUser,
  createChatCompletion,
);
chatsRoutes.get("/", authenticateToken, authenticateUser, getUserChats);
chatsRoutes.delete("/", authenticateToken, authenticateUser, deleteUserChats);

export default chatsRoutes;
