import "./App.css";
import Navbar from "./components/Navbar";
import InputFeild from "./components/InputFeild";
import WelcomeMessege from "./components/WelcomeMessege";
import { useState } from "react";
import TradeMark from "./components/TradeMark";

const API_BASE_URL = "http://localhost:8000";

function App() {
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isAsking, setIsAsking] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      setUploadStatus("Choose a PDF first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    setIsUploading(true);
    setUploadStatus("Processing PDF...");

    try {
      const response = await fetch(`${API_BASE_URL}/upload-pdf`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Upload failed.");
      }

      setPdfLoaded(true);
      setMessages([]);
      setUploadStatus(`${data.filename} is ready.`);
    } catch (error) {
      setUploadStatus(error.message || "Could not upload the PDF.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e.key === "Enter" && e.target.value.trim()) {
      const question = e.target.value.trim();
      e.target.value = "";
      setIsAsking(true);
      setMessages((currentMessages) => [
        ...currentMessages,
        { role: "user", text: question },
      ]);

      try {
        const response = await fetch(`${API_BASE_URL}/ask`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: question }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Backend request failed.");
        }

        let extractedText = "";

        if (Array.isArray(data.content)) {
          const textBlock = data.content.find((block) => block.type === "text");
          extractedText = textBlock ? textBlock.text : "No text response found.";
        } else if (typeof data.content === "object" && data.content !== null) {
          extractedText = data.content.text || "No text content available.";
        } else {
          extractedText = data.content;
        }

        setMessages((currentMessages) => [
          ...currentMessages,
          { role: "assistant", text: extractedText },
        ]);
      } catch (error) {
        setMessages((currentMessages) => [
          ...currentMessages,
          { role: "assistant", text: error.message || "Could not reach the RAG backend." },
        ]);
      } finally {
        setIsAsking(false);
      }
    }
  };

  if (!pdfLoaded) {
    return (
      <>
        <Navbar></Navbar>
        <main className="upload-page">
          <form className="upload-panel" onSubmit={handleUpload}>
            <h1>Upload your PDF</h1>
            <p>Select a PDF document to build the RAG index before asking questions.</p>
            <label className="file-picker">
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setSelectedFile(e.target.files[0] || null)}
              />
              <span>{selectedFile ? selectedFile.name : "Choose PDF"}</span>
            </label>
            <button type="submit" className="upload-btn" disabled={isUploading}>
              {isUploading ? "Processing..." : "Load PDF"}
            </button>
            {uploadStatus && <p className="upload-status">{uploadStatus}</p>}
          </form>
        </main>
        <TradeMark />
      </>
    );
  }

  return (
    <>
      <Navbar></Navbar>
      <main className="chat-page">
        {messages.length === 0 ? (
          <WelcomeMessege />
        ) : (
          <div className="message-list">
            {messages.map((message, index) => (
              <div className={`message-row ${message.role}`} key={`${message.role}-${index}`}>
                <div className="message-label">
                  {message.role === "user" ? "You" : "Personal AI"}
                </div>
                <pre className="message-bubble">{message.text}</pre>
              </div>
            ))}
            {isAsking && (
              <div className="message-row assistant">
                <div className="message-label">Personal AI</div>
                <pre className="message-bubble thinking">Thinking...</pre>
              </div>
            )}
          </div>
        )}
      </main>
      <InputFeild handleSubmit={handleSubmit} disabled={isAsking} />
      <TradeMark />
    </>
  );
}
export default App;
