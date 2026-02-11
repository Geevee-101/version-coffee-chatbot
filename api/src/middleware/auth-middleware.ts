import { NextFunction, Request, Response } from "express";
import User from "../models/User.js";
import { COOKIE_NAME } from "../utils/constants.js";
import jwt from "jsonwebtoken";

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.signedCookies[`${COOKIE_NAME}`];
    if (!token || token.trim() === "") {
      return res.status(401).json({ message: "Unauthorized, token missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as jwt.JwtPayload;

    if (!decoded || !decoded.id) {
      return res.status(401).json({ message: "Unauthorized, token invalid" });
    }

    // Store decoded token data for use in route handlers
    res.locals.jwtData = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized, token invalid" });
  }
};

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!res.locals.jwtData?.id) {
    return res
      .status(401)
      .json({ message: "Unauthorized, token missing or invalid" });
  }
  try {
    const user = await User.findById(res.locals.jwtData.id).select("-password");
    if (!user) {
      return res
        .status(401)
        .json({ message: "Unauthorized, user not found or token invalid" });
    }
    res.locals.user = user;
    next();
  } catch (error) {
    console.error("Error in authenticateUser:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
