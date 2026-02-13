from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agent_controller import AgentController
import os
import uvicorn

PORT = int(os.getenv("PORT", 8000))

app = FastAPI(title="Version Coffee Agents")

# CORS — allow the Node.js API to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("API_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

agent_controller = AgentController()


class Message(BaseModel):
    role: str
    content: str
    memory: dict | None = None


class ChatRequest(BaseModel):
    messages: list[Message]


class ChatResponse(BaseModel):
    role: str
    content: str
    memory: dict


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        messages = [msg.model_dump() for msg in request.messages]
        response = agent_controller.get_response(messages)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)
