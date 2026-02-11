import { NextFunction, Request, Response } from "express";
import { openai } from "../config/openai-config.js";

export const createChatCompletion = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { message } = req.body;
  if (!res.locals.user) {
    return res.status(401).json({ message: "Unauthorized, not authenticated" });
  }
  const user = res.locals.user;

  const chats = user.chats;
  const userChat = {
    role: "user",
    content: message,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  chats.push(userChat);
  user.chats = chats;

  try {
    // Set headers for Server-Sent Events (SSE)
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Create streaming completion
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chats,
      stream: true,
    });

    let fullResponse = "";

    // Stream chunks to client
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullResponse += content;
        // Send chunk as SSE
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Send completion signal
    res.write(`data: [DONE]\n\n`);

    // Save complete response to database
    const assistantChat = {
      role: "assistant",
      content: fullResponse,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    user.chats.push(assistantChat);
    await user.save();

    res.end();
  } catch (error: unknown) {
    const cause = error instanceof Error ? error.message : String(error);
    console.error("OpenAI streaming error:", error);
    res.write(
      `data: ${JSON.stringify({ error: "OpenAI request failed", cause })}\n\n`,
    );
    res.end();
  }
};

export const getUserChats = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!res.locals.user) {
    return res
      .status(401)
      .json({ message: "Unauthorized, user not found or token invalid." });
  }
  try {
    const user = res.locals.user;
    return res.status(200).json({ chats: user.chats });
  } catch (error) {
    console.error("Error in getUserChats:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
