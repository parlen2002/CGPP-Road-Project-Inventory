import React from "react";
import ReactDOM from "react-dom/client";
import "leaflet/dist/leaflet.css"; // Leaflet core layout — must precede our overrides
import "./index.css";
import App from "./App.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
