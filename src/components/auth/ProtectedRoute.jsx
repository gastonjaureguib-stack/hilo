import {
  Navigate,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext.jsx";

const ProtectedRoute = ({ children }) => {
  const {
    user,
    loading,
  } = useAuth();

  const location = useLocation();

  // Mientras Supabase comprueba la sesión
  if (loading) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <p>Cargando Hilo...</p>
        </div>
      </main>
    );
  }

  // Si no hay usuario, enviamos al login
  // y recordamos a dónde quería entrar.
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname +
            location.search,
        }}
      />
    );
  }

  return children;
};

export default ProtectedRoute;