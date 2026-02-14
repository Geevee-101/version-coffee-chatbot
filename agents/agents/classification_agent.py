from langchain_openai import ChatOpenAI
from pydantic import BaseModel
import os
from copy import deepcopy
import dotenv
from typing import List, Dict, Any
from .types import AgentMessage, ClassificationMemory

dotenv.load_dotenv()


class ClassificationDecision(BaseModel):
    chain_of_thought: str
    decision: str
    message: str


class ClassificationAgent:
    def __init__(self):
        self.llm = ChatOpenAI(model=os.getenv("MODEL_NAME", "gpt-4o-mini"))

    def get_response(self, messages: List[Dict[str, Any]]) -> AgentMessage:
        messages = deepcopy(messages)
        system_prompt = """
            You are a router for a coffee shop chatbot. Choose the right agent:
      
            1. details_agent: Questions about Version Coffee (general info, location, hours, delivery, menu details, about us)
            2. order_taking_agent: Taking and managing orders
            3. recommendation_agent: Product recommendations

            Output JSON:
            {
                "chain of thought": reasoning about which agent fits,
                "decision": "details_agent" or "order_taking_agent" or "recommendation_agent",
                "message": ""
            }
        """

        input_messages = [{"role": "system", "content": system_prompt}]
        # Gives context by appending all messages including the current user message
        input_messages += messages

        structured_llm = self.llm.with_structured_output(ClassificationDecision)
        result = structured_llm.invoke(input_messages)
        output = self.postprocess(result)

        return output

    def postprocess(self, result) -> AgentMessage:
        """Convert Pydantic model to message dict."""
        memory: ClassificationMemory = {
            "agent": "classification",
            "decision": result.decision,
        }
        return {
            "role": "assistant",
            "content": result.message,
            "memory": memory,
        }
