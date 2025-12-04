import React, { useState } from 'react';

export default function Chatbox() {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState([
    { id: 1, user: "Admin", text: "Welcome to Mashallah Eats chat!" }
  ]);
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input) return;
    setMessages([...messages, { id: messages.length + 1, user: "You", text: input }]);
    setInput("");
  };

  return (
    <div className={`fixed bottom-4 right-4 w-80 ${open ? "" : "h-12"} transition-all`}>
      <div className="card bg-base-100 shadow-xl rounded-lg flex flex-col h-96">
        {/* Header */}
        <div className="flex justify-between items-center p-2 bg-base-200 cursor-pointer" onClick={() => setOpen(!open)}>
          <span className="font-bold">Chat</span>
          <button className="btn btn-xs">{open ? "−" : "+"}</button>
        </div>

        {open && (
          <>
            {/* Messages */}
            <div className="flex-1 p-2 overflow-y-auto space-y-2">
              {messages.map((msg) => (
                <div key={msg.id} className="text-sm">
                  <strong>{msg.user}: </strong>{msg.text}
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-2 flex gap-2">
              <input
                type="text"
                className="input input-bordered flex-1"
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button className="btn btn-primary btn-sm" onClick={sendMessage}>Send</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}