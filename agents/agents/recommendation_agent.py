from langchain_openai import ChatOpenAI
from pydantic import BaseModel
from typing import List, Dict, Any
import pandas as pd
import os
import json
from copy import deepcopy
import dotenv
from .types import AgentMessage, RecommendationMemory

dotenv.load_dotenv()


class RecommendationClassification(BaseModel):
    chain_of_thought: str
    recommendation_type: str
    parameters: List[str]


class RecommendationAgent:
    def __init__(self, apriori_recommendations_path, popular_recommendations_path):
        self.llm = ChatOpenAI(model=os.getenv("MODEL_NAME", "gpt-4o-mini"))

        with open(apriori_recommendations_path, "r") as f:
            self.apriori_recommendations = json.load(f)

        self.popular_recommendations = pd.read_csv(popular_recommendations_path)
        self.products = self.popular_recommendations["product"].tolist()
        self.product_categories = list(
            set(self.popular_recommendations["product_category"].tolist())
        )

    def get_apriori_recommendation(self, products, k=5):
        recommendation_list = []

        for product in products:
            if product in self.apriori_recommendations:
                recommendation_list.extend(self.apriori_recommendations[product])

        # Sort recommendation list by 'confidence' column
        recommendation_list.sort(key=lambda x: x["confidence"], reverse=True)

        recommendations = []
        recommendation_per_category = {}
        for recommendation in recommendation_list:
            if recommendation in recommendations:
                continue

            # Limit 2 recommendation per category
            product_category = recommendation["product_category"]
            if product_category not in recommendation_per_category:
                recommendation_per_category[product_category] = []
            if len(recommendation_per_category[product_category]) >= 2:
                continue

            # Add recommendation to the list
            recommendations.append(recommendation["product"])
            recommendation_per_category[product_category].append(
                recommendation["product"]
            )

            if len(recommendations) >= k:
                break

        return recommendations[:k]

    def get_popular_recommendations(self, product_categories=None, k=5):
        recommendation_df = self.popular_recommendations

        if isinstance(product_categories, str):
            product_categories = [product_categories]

        if product_categories:
            recommendation_df = recommendation_df[
                recommendation_df["product_category"].isin(product_categories)
            ]

        recommendation_df = recommendation_df.sort_values(
            "number_of_transactions", ascending=False
        )

        if recommendation_df.shape[0] == 0:
            return []

        return recommendation_df["product"].tolist()[:k]

    def recommendation_classification(self, messages):
        """Classify what type of recommendation to provide."""
        system_prompt = f"""
        Determine recommendation type:
        1. apriori: Based on items user mentioned
        2. popular: General popular items
        3. popular by category: Popular in specific category

        Items: {",".join(self.products)}
        Categories: {",".join(self.product_categories)}

        Output JSON:
        {{
            "chain of thought": reasoning,
            "recommendation_type": "apriori" or "popular" or "popular by category",
            "parameters": list of items or categories
        }}
        """

        input_messages = [{"role": "system", "content": system_prompt}] + messages[-3:]

        structured_llm = self.llm.with_structured_output(RecommendationClassification)
        result = structured_llm.invoke(input_messages)
        return {
            "recommendation_type": result.recommendation_type,
            "parameters": result.parameters,
        }

    def get_recommendations_from_order(self, messages, order):
        messages = deepcopy(messages)
        products = []
        for product in order:
            products.append(product["item"])

        recommendation = self.get_apriori_recommendation(products)

        if not recommendation:
            return self.postprocess_recommendation(
                "Based on your order, I don't have specific recommendations at the moment."
            )

        recommendation_str = ", ".join(recommendation)

        system_prompt = """
        You are a recommendation assistant for Version Coffee coffee shop.
        
        Your recommendation is a follow up from the order taking agent, so just recommend the items without any description.
        The order taking agent will conclude the message, so there is no need to thank the user.
        Format each product name as a separate markdown bullet point (- item).
        """

        prompt = f"""
        {messages[-1]["content"]}

        Please recommend these items: {recommendation_str}
        """

        messages[-1]["content"] = prompt
        input_messages = [{"role": "system", "content": system_prompt}] + messages[-3:]

        response = self.llm.invoke(input_messages)
        output = self.postprocess_recommendation(response.content)

        return output

    def get_response(self, messages: List[Dict[str, Any]]) -> AgentMessage:
        messages = deepcopy(messages)

        recommendation_classification = self.recommendation_classification(messages)
        recommendation_type = recommendation_classification["recommendation_type"]

        if recommendation_type == "apriori":
            recommendation = self.get_apriori_recommendation(
                recommendation_classification["parameters"]
            )

        elif recommendation_type == "popular":
            recommendation = self.get_popular_recommendations()
        elif recommendation_type == "popular by category":
            recommendation = self.get_popular_recommendations(
                recommendation_classification["parameters"]
            )

        if recommendation == []:
            return {
                "role": "assistant",
                "content": "Sorry, I couldn't find any recommendations for you.",
            }

        # Respond to user
        recommendation_str = ", ".join(recommendation)

        system_prompt = """
        You are a helpful AI assistant for a coffee shop application which serves drinks and pastries.
        your task is to recommend items to the user based on their input message. And respond in a friendly but concise way. And put it an unordered list with a very small description.

        I will provide you with a list of items to recommend to the user based on their input message.
        """

        prompt = f"""
        {messages[-1]["content"]}

        Please recommend these items: {recommendation_str}
        """

        messages[-1]["content"] = prompt
        input_messages = [{"role": "system", "content": system_prompt}] + messages[-3:]

        response = self.llm.invoke(input_messages)
        output = self.postprocess_recommendation(response.content)

        return output

    def postprocess_recommendation(self, content: str) -> AgentMessage:
        memory: RecommendationMemory = {"agent": "recommendation_agent"}
        return {
            "role": "assistant",
            "content": content,
            "memory": memory,
        }
