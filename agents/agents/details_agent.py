from langchain_openai import ChatOpenAI, OpenAIEmbeddings
import os
from copy import deepcopy
from pinecone import Pinecone
import dotenv
from typing import List, Dict, Any
from .types import AgentMessage, DetailsMemory

dotenv.load_dotenv()


class DetailsAgent:
    def __init__(self):
        self.llm = ChatOpenAI(model=os.getenv("MODEL_NAME", "gpt-4o-mini"))
        self.embeddings = OpenAIEmbeddings(model=os.getenv("EMBEDDING_MODEL"))
        self.pinecone = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        self.index_name = os.getenv("PINECONE_INDEX_NAME")
        self.namespace = os.getenv("PINECONE_NAMESPACE", "ns1")

    def get_closest_results(self, index_name, input_embeddings, k: int = 5):
        index = self.pinecone.Index(index_name)
        results = index.query(
            namespace=self.namespace,
            vector=input_embeddings,
            top_k=k,
            include_values=False,
            include_metadata=True,
        )
        return results

    def get_response(self, messages: List[Dict[str, Any]]) -> AgentMessage:
        messages = deepcopy(messages)

        user_message = messages[-1]["content"]
        embeddings = self.embeddings.embed_query(user_message)
        result = self.get_closest_results(self.index_name, embeddings)
        source_knowledge = "\n".join(
            [item["metadata"]["text"] for item in result["matches"]]
        )

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
