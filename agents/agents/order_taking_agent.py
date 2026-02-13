import os
from langchain_openai import ChatOpenAI
from copy import deepcopy
from pydantic import BaseModel
from typing import List, Dict, Any
import dotenv
from .types import AgentMessage, OrderTakingMemory, OrderItem as OrderItemType

dotenv.load_dotenv()


class OrderItem(BaseModel):
    item: str
    quantity: int
    price: float


class OrderTakingDecision(BaseModel):
    chain_of_thought: str
    step_number: str
    order: List[OrderItem]
    response: str


class OrderTakingAgent:
    def __init__(self, recommendation_agent):
        self.llm = ChatOpenAI(model=os.getenv("MODEL_NAME", "gpt-4o-mini"))
        self.recommendation_agent = recommendation_agent

    def get_response(self, messages: List[Dict[str, Any]]) -> AgentMessage:
        messages = deepcopy(messages)

        system_prompt = """
            You are a customer support bot for Version Coffee coffee shop.

            Menu:
            - Cappuccino - $4.50
            - Jumbo Savory Scone - $3.25
            - Latte - $4.75
            - Chocolate Chip Biscotti - $2.50
            - Espresso shot - $2.00
            - Hazelnut Biscotti - $2.75
            - Chocolate Croissant - $3.75
            - Dark chocolate (Drinking Chocolate) - $5.00
            - Cranberry Scone - $3.50
            - Croissant - $3.25
            - Almond Croissant - $4.00
            - Ginger Biscotti - $2.50
            - Oatmeal Scone - $3.25
            - Ginger Scone - $3.50
            - Chocolate syrup - $1.50
            - Hazelnut syrup - $1.50
            - Caramel syrup - $1.50
            - Sugar Free Vanilla syrup - $1.50
            - Dark chocolate (Packaged Chocolate) - $3.00

            Process:
            1. Take the order
            2. Validate items are on menu
            3. Ask if they need anything else
            4. When done, list items, calculate total, tell the user to press the 'Check Out' button to finalise the order, and thank them

            Output JSON:
            {
                "chain of thought": your reasoning,
                "step_number": current step,
                "order": [{"item": "name", "quantity": 1, "price": 4.50}],
                "response": message to user
            }
        """

        # Find previous order state from conversation history
        last_order_taking_status = ""
        asked_recommendation_before = False
        for message_index in range(len(messages) - 1, 0, -1):
            message = messages[message_index]
            agent_name = (message.get("memory") or {}).get("agent", "")
            if message["role"] == "assistant" and agent_name == "order_taking_agent":
                step_number = message["memory"]["step_number"]
                order = message["memory"]["order"]
                asked_recommendation_before = message["memory"].get(
                    "asked_recommendation_before", False
                )
                last_order_taking_status = f"""
                step number: {step_number}
                order: {order}
                """
                break

        # Prepend order context to user message
        if last_order_taking_status:
            messages[-1]["content"] = (
                last_order_taking_status + "\n" + messages[-1]["content"]
            )

        input_messages = [{"role": "system", "content": system_prompt}] + messages

        structured_llm = self.llm.with_structured_output(OrderTakingDecision)
        result = structured_llm.invoke(input_messages)
        output = self.postprocess(result, messages, asked_recommendation_before)

        return output

    def postprocess(
        self, result, messages: List[Dict[str, Any]], asked_recommendation_before: bool
    ) -> AgentMessage:
        """Convert Pydantic model to message dict."""
        # Convert OrderItem objects to dicts
        order_list: List[OrderItemType] = [item.model_dump() for item in result.order]

        if not asked_recommendation_before and len(order_list) > 0:
            recommendation_output = (
                self.recommendation_agent.get_recommendations_from_order(
                    messages, order_list
                )
            )
            result.response = (
                result.response
                + "\nHere's my recommendation based on your order:\n"
                + recommendation_output["content"]
            )
            asked_recommendation_before = True

        memory: OrderTakingMemory = {
            "agent": "order_taking_agent",
            "step_number": result.step_number,
            "order": order_list,
            "asked_recommendation_before": asked_recommendation_before,
        }
        return {
            "role": "assistant",
            "content": result.response,
            "memory": memory,
        }
