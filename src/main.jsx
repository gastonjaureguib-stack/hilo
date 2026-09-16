import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";

import { AuthProvider } from "./context/AuthContext.jsx";
import { HiloProvider } from "./context/HiloContext.jsx";

import "./styles/global.css";
import "./styles/auth.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <HiloProvider>
        <App />
      </HiloProvider>
    </AuthProvider>
  </StrictMode>
);