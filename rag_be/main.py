import os
import shutil
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pydantic import BaseModel


BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"

load_dotenv(BASE_DIR / ".env")
API_KEY = os.getenv("API_KEY")

app = FastAPI(title="RAG Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Question(BaseModel):
    query: str


def build_vectorstore(pdf_path: Path):
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    loader = PyPDFLoader(str(pdf_path))
    documents = loader.load()
    if not documents:
        raise ValueError("The PDF did not contain readable text.")

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    chunks = splitter.split_documents(documents)
    if not chunks:
        raise ValueError("The PDF did not contain enough readable text to index.")

    embedding_model = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=API_KEY,
    )
    return FAISS.from_documents(chunks, embedding_model)


def extract_response_text(content):
    if isinstance(content, list):
        text_blocks = [
            block.get("text", "")
            for block in content
            if isinstance(block, dict) and block.get("type") == "text"
        ]
        return "\n".join(text_blocks).strip()

    if isinstance(content, dict):
        return content.get("text", "")

    return str(content)


llm = ChatGoogleGenerativeAI(
    model="gemini-3-flash-preview",
    temperature=0,
    google_api_key=API_KEY,
)
vectorstore = None
active_pdf_name = None


@app.get("/health")
def health():
    return {
        "status": "ok",
        "pdf_loaded": vectorstore is not None,
        "active_pdf": active_pdf_name,
    }


@app.post("/upload-pdf")
def upload_pdf(file: UploadFile = File(...)):
    global vectorstore, active_pdf_name

    if file.content_type != "application/pdf" and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")

    UPLOAD_DIR.mkdir(exist_ok=True)
    uploaded_path = UPLOAD_DIR / "active.pdf"

    try:
        with uploaded_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        vectorstore = build_vectorstore(uploaded_path)
        active_pdf_name = file.filename
    except Exception as exc:
        vectorstore = None
        active_pdf_name = None
        if uploaded_path.exists():
            uploaded_path.unlink()
        raise HTTPException(status_code=500, detail=f"Could not process PDF: {exc}") from exc
    finally:
        file.file.close()

    return {"message": "PDF uploaded and indexed.", "filename": active_pdf_name}


@app.post("/ask")
def ask_pdf(question: Question):
    if not question.query.strip():
        raise HTTPException(status_code=400, detail="Query is required.")

    if vectorstore is None:
        raise HTTPException(status_code=400, detail="Upload a PDF before asking questions.")

    docs = vectorstore.similarity_search(question.query, k=5)
    context = "\n\n".join(doc.page_content for doc in docs)
    prompt = (
        "You are a helpful assistant. Use the context below to answer the question.\n"
        f"Context:\n{context}\n\n"
        f"Question: {question.query}"
    )

    response = llm.invoke(prompt)
    return {"content": extract_response_text(response.content)}
