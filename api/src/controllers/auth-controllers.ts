import { NextFunction, Request, Response } from "express";
import { hash, compare } from "bcrypt";
import { generateToken } from "../utils/token-manager.js";
import { COOKIE_NAME } from "../utils/constants.js";
import User from "../models/User.js";

export const userSignup = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }
    const hashedPassword = await hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });

    // create and store the token
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    });

    const token = generateToken(user._id.toString(), user.email, "7d");

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      signed: true,
    });

    return res.status(201).json({
      message: "User created successfully",
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error("Error in userSignup:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const userLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // create and store the token
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    });

    const token = generateToken(user._id.toString(), user.email, "7d");

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      signed: true,
    });

    return res.status(200).json({
      message: "User logged in successfully",
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error("Error in userLogin:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const userLogout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    });

    return res.status(200).json({
      message: "User logged out successfully",
    });
  } catch (error) {
    console.error("Error in userLogout:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
