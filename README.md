# Version Coffee Chatbot

A full-stack AI-powered coffee shop application with an intelligent chatbot that can answer questions, take orders, and provide personalized recommendations.

## Features

- ☕ **Product Store** - Browse the full Version Coffee menu with categories, descriptions, and prices
- 🤖 **AI Chatbot** - Multi-agent chatbot powered by OpenAI GPT-4o-mini
- 🔍 **Semantic Search** - MongoDB Atlas Vector Search for product and shop info retrieval
- 📋 **Order Taking** - Place orders through the chatbot with real-time UI sync
- 💡 **Smart Recommendations** - Apriori-based and popularity-based product recommendations
- 🔐 **Authentication** - Secure JWT-based auth with HTTP-only cookies
- 🛡️ **Security** - Arcjet integration (rate limiting, bot detection, shield protection)
- 🎨 **Modern UI** - Radix UI components with dark/light theme support
- 📱 **Responsive Design** - Mobile-first design with Tailwind CSS v4

## AI Agent Architecture

The chatbot uses a multi-agent pipeline:

1. **GuardAgent** - Filters out off-topic or disallowed requests
2. **ClassificationAgent** - Routes the user's message to the appropriate agent
3. **DetailsAgent** - Answers questions about Version Coffee using MongoDB Atlas Vector Search across `products` and `about` collections
4. **OrderTakingAgent** - Manages the order flow (take order, validate, confirm, checkout)
5. **RecommendationAgent** - Provides recommendations using apriori association rules or popularity data

## Tech Stack

### Frontend

- **React 19** with TypeScript
- **React Query** for server state management
- **React Router** for navigation
- **Radix UI / shadcn/ui** for accessible components
- **Tailwind CSS v4** for styling
- **Vite** for build tooling

### API (Node.js)

- **Express.js** with TypeScript
- **MongoDB** with Mongoose (Product, User models)
- **JWT** for authentication
- **Arcjet** for security (rate limiting, bot detection)
- **bcrypt** for password hashing

### Agents (Python)

- **FastAPI** with Uvicorn
- **LangChain + OpenAI** (GPT-4o-mini for chat, embeddings for vector search)
- **MongoDB Atlas Vector Search** for semantic retrieval
- **Pandas** for recommendation data processing

## Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- MongoDB Atlas account (with Vector Search indexes)
- OpenAI API key
- Arcjet account (optional, for security features)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Geevee-101/ai-chat-type.git
cd ai-chat-type
```

### 2. API Setup

```bash
cd api
npm install
```

Create a `.env` file in the `api` directory:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=your-mongodb-atlas-uri
JWT_SECRET=your-jwt-secret
COOKIE_SECRET=your-cookie-secret
ARCJET_KEY=your-arcjet-key
CLIENT_URL=http://localhost:5173
AGENTS_URL=http://localhost:8000
```

### 3. Agents Setup

```bash
cd agents
pip install -r requirements.txt
```

Create a `.env` file in the `agents` directory:

```env
OPENAI_API_KEY=your-openai-api-key
MONGODB_URI=your-mongodb-atlas-uri
EMBEDDING_MODEL=text-embedding-3-large
MODEL_NAME=gpt-4o-mini
API_URL=http://localhost:3000
```

### 4. Frontend Setup

```bash
cd frontend
npm install
```

### 5. Seed the Database

From the `agents` directory, run the seed script to populate MongoDB with product data (with embeddings) and about us content:

```bash
python products/seed_mongodb.py
```

This will:
- Drop and re-create `test.products` with 18 products (each with vector embeddings)
- Drop and re-create `test.about` with the Version Coffee about us content (with vector embedding)

### 6. Create MongoDB Atlas Vector Search Indexes

In MongoDB Atlas, create the following vector search indexes:

**`ProductsIndex`** on `test.products`:
```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 3072,
      "similarity": "cosine"
    }
  ]
}
```

**`AboutIndex`** on `test.about`:
```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 3072,
      "similarity": "cosine"
    }
  ]
}
```

## Running the Application

### Start API (from api directory)

```bash
npm run dev
```

Server runs on http://localhost:3000

### Start Agents (from agents directory)

```bash
python main.py
```

Agents server runs on http://localhost:8000

### Start Frontend (from frontend directory)

```bash
npm run dev
```

Frontend runs on http://localhost:5173

## Project Structure

```
version-coffee-chatbot/
├── api/
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/       # Auth, Arcjet protection
│   │   ├── models/          # MongoDB schemas (User, Product)
│   │   ├── routes/          # API routes
│   │   ├── utils/           # Helpers, validators
│   │   ├── db/              # Database connection
│   │   ├── app.ts           # Express app setup
│   │   └── index.ts         # Entry point
│   └── package.json
│
├── agents/
│   ├── agents/
│   │   ├── guard_agent.py           # Input filtering
│   │   ├── classification_agent.py  # Message routing
│   │   ├── details_agent.py         # Vector search Q&A
│   │   ├── order_taking_agent.py    # Order management
│   │   ├── recommendation_agent.py  # Product recommendations
│   │   ├── agent_protocol.py        # Agent interface
│   │   └── types.py                 # Type definitions
│   ├── data/
│   │   ├── apriori_recommendations.json
│   │   └── popularity_recommendation.csv
│   ├── products/
│   │   ├── products.jsonl               # Product catalog
│   │   ├── version_coffee_about_us.txt  # About us content
│   │   └── seed_mongodb.py              # Database seed script
│   ├── agent_controller.py   # Agent orchestration
│   ├── main.py               # FastAPI entry point
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/             # API client functions
│   │   ├── components/      # React components (ChatBox, etc.)
│   │   ├── context/         # Auth context
│   │   ├── lib/             # Axios instance
│   │   ├── pages/           # Route pages (Store)
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # Entry point
│   └── package.json
│
├── render.yaml              # Render deployment config
└── README.md
```

## API Endpoints

### Authentication

- `POST /api/v1/auth/signup` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/verify` - Verify JWT token

### Products

- `GET /api/v1/products` - Get all products

### Chats

- `POST /api/v1/chats` - Send message to chatbot and get AI response

## Security Features

- **JWT Authentication** with HTTP-only signed cookies
- **Arcjet Protection**:
  - Token bucket rate limiting
  - Bot detection and blocking
  - Shield protection against common attacks
- **Password Hashing** with bcrypt
- **Input Validation** with express-validator
- **CORS** configured for specific origin

## Deployment

The project is configured for deployment on **Render** via `render.yaml`:

- **version-coffee-api** - Node.js web service
- **version-coffee-agents** - Python web service

## Author

**Aidi Khalid**

- GitHub: [@Geevee-101](https://github.com/Geevee-101)
- LinkedIn: [Aidi Khalid](https://www.linkedin.com/in/aidikhalid/)

## License

This project is open source and available under the MIT License.
