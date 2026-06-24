# Personal AI - PDF RAG Chatbot

Personal AI is a full-stack Retrieval-Augmented Generation (RAG) application that lets users upload a PDF and ask questions about its contents through a chat-style interface. The backend processes the uploaded document, creates vector embeddings, retrieves relevant context, and uses Google Gemini to generate document-aware answers.

## Features

- Upload any PDF from the frontend before starting a chat.
- Extract, chunk, embed, and index PDF content using LangChain and FAISS.
- Ask natural-language questions about the uploaded document.
- View previous questions and answers in a clean chat history.
- FastAPI backend with dedicated upload, health, and question-answering endpoints.
- React + Vite frontend with upload-first flow and responsive chat UI.

## Tech Stack

**Frontend**

- React
- Vite
- React Icons
- CSS

**Backend**

- FastAPI
- LangChain
- FAISS
- Google Gemini / Google Generative AI
- PyPDF
- Python Multipart

## Project Structure

```text
RAG/
├── rag_be/
│   ├── main.py
│   ├── pyproject.toml
│   ├── README.md
│   └── uploads/              # Runtime PDF uploads, ignored by git
│
├── rag_fe/
│   ├── src/
│   │   ├── components/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## How It Works

1. The user uploads a PDF from the React frontend.
2. The frontend sends the file to the FastAPI backend using `POST /upload-pdf`.
3. The backend saves the PDF, extracts text, splits it into chunks, and creates vector embeddings.
4. FAISS stores the document vectors in memory for similarity search.
5. When the user asks a question, the backend retrieves the most relevant PDF chunks.
6. The retrieved context and user question are sent to Gemini.
7. The answer is returned to the frontend and displayed in the chat history.

## API Endpoints

### Health Check

```http
GET /health
```

Returns backend status and whether a PDF is currently loaded.

### Upload PDF

```http
POST /upload-pdf
```

Accepts a PDF file as multipart form data and builds the vector index.

### Ask Question

```http
POST /ask
```

Request body:

```json
{
  "query": "What projects are mentioned in this PDF?"
}
```

Response:

```json
{
  "content": "The PDF mentions..."
}
```
