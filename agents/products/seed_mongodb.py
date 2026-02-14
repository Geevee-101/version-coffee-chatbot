"""
Seed MongoDB with product data (with embeddings) and about us content.

Usage:
    python products/seed_mongodb.py

Requires env vars: MONGODB_URI, EMBEDDING_MODEL, OPENAI_API_KEY
"""

import os
import json
import dotenv
from pymongo import MongoClient
from langchain_openai import OpenAIEmbeddings

dotenv.load_dotenv()

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

client = MongoClient(os.getenv("MONGODB_URI"))
db = client["test"]
embeddings = OpenAIEmbeddings(model=os.getenv("EMBEDDING_MODEL"))


def seed_products():
    """Load products.jsonl, generate embeddings, and replace test.products."""
    collection = db["products"]

    products = []
    path = os.path.join(SCRIPT_DIR, "products.jsonl")
    with open(path, "r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            products.append(json.loads(line))

    # Build text for embedding per product
    texts = []
    for p in products:
        text = (
            f"{p['name']} - {p['category']}: "
            f"{p['description']} "
            f"Ingredients: {', '.join(p['ingredients'])}. "
            f"Price: ${p['price']:.2f}. Rating: {p['rating']}."
        )
        texts.append(text)

    print(f"Generating embeddings for {len(products)} products...")
    vectors = embeddings.embed_documents(texts)
    print("Done generating embeddings.")

    # Add embedding and text_for_embedding to each product doc
    for i, product in enumerate(products):
        product["embedding"] = vectors[i]
        product["text_for_embedding"] = texts[i]

    # Drop and re-insert
    collection.drop()
    print("Dropped test.products collection.")
    collection.insert_many(products)
    print(f"Inserted {len(products)} products into test.products.")


def seed_about():
    """Load version_coffee_about_us.txt, generate embedding, and replace test.about."""
    collection = db["about"]

    path = os.path.join(SCRIPT_DIR, "version_coffee_about_us.txt")
    with open(path, "r") as f:
        content = f.read().strip()

    print("Generating embedding for about us content...")
    vector = embeddings.embed_documents([content])[0]
    print("Done generating embedding.")

    doc = {
        "title": "Version Coffee - About Us",
        "content": content,
        "embedding": vector,
    }

    # Drop and re-insert
    collection.drop()
    print("Dropped test.about collection.")
    collection.insert_one(doc)
    print("Inserted 1 document into test.about.")


def main():
    print("=== Seeding test.products ===")
    seed_products()
    print()
    print("=== Seeding test.about ===")
    seed_about()
    print()
    print("All done!")


if __name__ == "__main__":
    main()
