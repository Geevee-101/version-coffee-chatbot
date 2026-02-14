from langchain_openai import ChatOpenAI, OpenAIEmbeddings
import os
from copy import deepcopy
from pymongo import MongoClient
import dotenv
from typing import List, Dict, Any
from .types import AgentMessage, DetailsMemory

dotenv.load_dotenv()


class DetailsAgent:
    def __init__(self):
        self.llm = ChatOpenAI(model=os.getenv("MODEL_NAME", "gpt-4o-mini"))
        self.embeddings = OpenAIEmbeddings(model=os.getenv("EMBEDDING_MODEL"))
        self.client = MongoClient(os.getenv("MONGODB_URI"))
        self.db = self.client["test"]

    def vector_search(self, collection_name, index_name, query_vector, k=5):
        collection = self.db[collection_name]
        pipeline = [
            {
                "$vectorSearch": {
                    "index": index_name,
                    "path": "embedding",
                    "queryVector": query_vector,
                    "numCandidates": k * 10,
                    "limit": k,
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "embedding": 0,
                    "score": {"$meta": "vectorSearchScore"},
                }
            },
        ]
        return list(collection.aggregate(pipeline))

    def get_response(self, messages: List[Dict[str, Any]]) -> AgentMessage:
        messages = deepcopy(messages)

        user_message = messages[-1]["content"]
        query_vector = self.embeddings.embed_query(user_message)

        # Search both collections
        product_results = self.vector_search(
            "products", "ProductsIndex", query_vector, k=5
        )
        about_results = self.vector_search("about", "AboutIndex", query_vector, k=1)

        # Build context from product results
        product_texts = []
        for doc in product_results:
            product_texts.append(doc.get("text_for_embedding", ""))

        # Build context from about results
        about_texts = []
        for doc in about_results:
            about_texts.append(doc.get("content", ""))

        source_knowledge = "\n".join(product_texts + about_texts)

        system_prompt = f"""
        You are an assistant for Version Coffee coffee shop.
        Answer based on this context:
        
        Context: {source_knowledge}
        Question: {user_message}
        """

        messages[-1]["content"] = system_prompt

        input_messages = [{"role": "system", "content": system_prompt}]
        input_messages += messages[1:]

        response = self.llm.invoke(input_messages)
        output = self.postprocess(response.content)

        return output

    def postprocess(self, output: str) -> AgentMessage:
        memory: DetailsMemory = {"agent": "details_agent"}
        return {
            "role": "assistant",
            "content": output,
            "memory": memory,
        }
