import { Router } from "express";
import userRoutes from "./auth-routes.js";
import chatsRoutes from "./chats-routes.js";
import databaseRoutes from "./database-routes.js";

const appRouter = Router();

appRouter.use("/auth", userRoutes);
appRouter.use("/chats", chatsRoutes);
appRouter.use("/database", databaseRoutes);

export default appRouter;
