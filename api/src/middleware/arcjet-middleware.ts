import aj from "../utils/arcjet.js";
import { isSpoofedBot } from "@arcjet/inspect";
import { NextFunction, Request, Response } from "express";

export const arcjetProtection = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const decision = await aj.protect(req, {
      requested: 1, // Number of tokens to consume (default: 1)
    });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return res.status(429).json({
          message: "Too Many Requests. Please try again later.",
        });
      } else if (decision.reason.isBot()) {
        return res.status(403).json({ message: "No bots allowed" });
      } else {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    // check for spoofed bots
    if (decision.results.some(isSpoofedBot)) {
      return res.status(403).json({ message: "No spoofed bots allowed" });
    }

    next();
  } catch (error) {
    console.log("Arcjet protection error:", error.message);
    next();
  }
};
