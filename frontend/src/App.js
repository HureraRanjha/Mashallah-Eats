import logo from './logo.svg';
import './App.css';
import { useEffect } from "react";

function App() {
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/index/")
      .then((res) => res.text())
      .then((data) => {
        console.log("Backend says:", data);
      })
      .catch((err) => {
        console.error("Error calling backend:", err);
      });
  }, []); // [] = run once on page load
  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center">
      <div className="flex flex-col gap-4">
        <button className="btn btn-primary">Test Button</button>
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Plain Tailwind Button
        </button>
      </div>
    </div>
  );
}

export default App;
