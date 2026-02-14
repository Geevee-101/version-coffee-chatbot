from langchain_openai import ChatOpenAI
from pydantic import BaseModel
import os
from copy import deepcopy
import dotenv
from typing import List, Dict, Any
from .types import AgentMessage, GuardMemory

dotenv.load_dotenv()


class GuardDecision(BaseModel):
    chain_of_thought: str
    decision: str
    message: str


class GuardAgent:
    def __init__(self):
        self.llm = ChatOpenAI(model=os.getenv("MODEL_NAME", "gpt-4o-mini"))

    def get_response(self, messages: List[Dict[str, Any]]) -> AgentMessage:
        messages = deepcopy(messages)
        system_prompt = """
        You are a guard agent for a coffee shop application.
        
        The coffee shop is called "Version Coffee".
        
        The user is allowed to ask for:
        - General questions about Version Coffee (the shop)
        - Menu items, prices, ingredients
        - Recommendations
        - Shop info (location, hours, delivery, about us)
        - Placing/completing orders
        - Confirming items ("that's all", "yes please")
        
        NOT allowed:
        - Unrelated content
        - Staff questions or recipes

        Output JSON:
        {
            "chain of thought": your reasoning,
            "decision": "allowed" or "not allowed",
            "message": "" if allowed, else rejection message
        }
        """

        input_message = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": messages[-1]["content"]},
        ]

        structured_llm = self.llm.with_structured_output(GuardDecision)
        result = structured_llm.invoke(input_message)
        output = self.postprocess(result)

        return output

    def postprocess(self, result) -> AgentMessage:
        """Convert Pydantic model to message dict."""
        memory: GuardMemory = {"agent": "guard", "decision": result.decision}
        return {
            "role": "assistant",
            "content": result.message,
            "memory": memory,
        }
