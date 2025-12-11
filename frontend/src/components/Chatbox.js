import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

export default function Chatbox() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, role: "assistant", text: "Welcome to Mashallah Eats! Ask me anything about our food or restaurant." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastEntryId, setLastEntryId] = useState(null);
  const [showRating, setShowRating] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message to chat
    setMessages(prev => [...prev, { id: Date.now(), role: "user", text: userMessage }]);

    // Check if logged in
    if (!user) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: "assistant",
        text: "Please log in to use the chat feature."
      }]);
      return;
    }

    setLoading(true);
    setShowRating(false);

    try {
      const response = await fetch(`${API_BASE_URL}/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: "assistant",
          text: data.error || "Sorry, I couldn't process your request."
        }]);
        return;
      }

      // Add AI response
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: "assistant",
        text: data.response,
        source: data.source,
        entryId: data.entry_id
      }]);

      // Show rating option if response came from knowledge base
      if (data.source === "knowledge_base" && data.entry_id) {
        setLastEntryId(data.entry_id);
        setShowRating(true);
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: "assistant",
        text: "Connection error. Is the server running?"
      }]);
    } finally {
      setLoading(false);
    }
  };

  const rateResponse = async (rating) => {
    if (!lastEntryId) return;

    try {
      await fetch(`${API_BASE_URL}/chat/rate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ entry_id: lastEntryId, rating }),
      });

      setMessages(prev => [...prev, {
        id: Date.now(),
        role: "system",
        text: rating === 0 ? "Flagged for review. Thank you!" : "Thanks for your feedback!"
      }]);
    } catch (error) {
      console.error("Rating failed:", error);
    }

    setShowRating(false);
    setLastEntryId(null);
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${open ? "w-80" : "w-auto"}`}>
      {open ? (
        <div className="card bg-base-100 shadow-2xl rounded-lg flex flex-col h-96">
          {/* Header */}
          <div
            className="flex justify-between items-center p-3 bg-primary text-primary-content rounded-t-lg cursor-pointer"
            onClick={() => setOpen(false)}
          >
            <span className="font-bold">Ask About Our Food</span>
            <button className="btn btn-ghost btn-xs">−</button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-base-200">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat ${msg.role === "user" ? "chat-end" : "chat-start"}`}
              >
                <div className={`chat-bubble ${
                  msg.role === "user" ? "chat-bubble-primary" :
                  msg.role === "system" ? "chat-bubble-info text-xs" :
                  ""
                }`}>
                  {msg.text}
                  {msg.source === "knowledge_base" && (
                    <span className="badge badge-xs badge-ghost ml-2">KB</span>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat chat-start">
                <div className="chat-bubble">
                  <span className="loading loading-dots loading-sm"></span>
                </div>
              </div>
            )}
          </div>

          {/* Rating Buttons */}
          {showRating && (
            <div className="p-2 bg-base-300 text-center">
              <p className="text-xs mb-2">Was this helpful?</p>
              <div className="flex justify-center gap-1">
                {[0, 1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    className={`btn btn-xs ${rating === 0 ? "btn-error" : "btn-ghost"}`}
                    onClick={() => rateResponse(rating)}
                    title={rating === 0 ? "Report as bad" : `Rate ${rating}`}
                  >
                    {rating === 0 ? "✕" : rating}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-2 flex gap-2 bg-base-100 rounded-b-lg">
            <input
              type="text"
              className="input input-bordered input-sm flex-1"
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage()}
              disabled={loading}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
            >
              Send
            </button>
          </div>
        </div>
      ) : (
        <button
          className="btn btn-primary btn-circle shadow-lg"
          onClick={() => setOpen(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}
    </div>
  );
}
