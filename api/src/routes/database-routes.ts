import { Router } from "express";
import { arcjetProtection } from "../middleware/arcjet-middleware.js";
import { resetDatabase } from "../controllers/database-controllers.js";

const databaseRoutes = Router();

databaseRoutes.use(arcjetProtection);

databaseRoutes.post("/reset", resetDatabase);

export default databaseRoutes;
