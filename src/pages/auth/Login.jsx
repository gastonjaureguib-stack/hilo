
import { useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext.jsx";

const obtenerDestinoSeguro = (from) => {
  if (
    typeof from !== "string" ||
    !from.startsWith("/") ||
    from.startsWith("//") ||
    from.includes("\\")
  ) {
    return "/";
  }

  return from;
};

const obtenerMensajeError = (error) => {
  switch (error?.code) {
    case "invalid_credentials":
      return "El correo o la contraseña no son correctos.";

    case "email_not_confirmed":
      return "Primero tenés que confirmar tu correo electrónico.";

    default:
      break;
  }

  // Compatibilidad con mensajes de error existentes.
  if (error?.message === "Invalid login credentials") {
    return "El correo o la contraseña no son correctos.";
  }

  if (error?.message === "Email not confirmed") {
    return "Primero tenés que confirmar tu correo electrónico.";
  }

  return "No pudimos iniciar sesión. Intentá nuevamente.";
};

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { user, loading, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const destino = obtenerDestinoSeguro(location.state?.from);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (enviando) return;

    setError("");

    const emailLimpio = email.trim().toLowerCase();

    if (!emailLimpio || !password) {
      setError("Ingresá tu correo y contraseña.");
      return;
    }

    try {
      setEnviando(true);

      await login(emailLimpio, password);

      navigate(destino, { replace: true });
    } catch (error) {
      console.error("Error iniciando sesión:", error);
      setError(obtenerMensajeError(error));
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <main className="auth-page">
        <div className="auth-card" role="status">
          <p>Cargando Hilo...</p>
        </div>
      </main>
    );
  }

  if (user) {
    return <Navigate to={destino} replace />;
  }

  return (
    <main className="auth-page">
      <div className="auth-card">

        <div className="auth-brand">
          <span className="home-eyebrow">HILO</span>

          <h1>Volvé a tus clases</h1>

          <p>
            Iniciá sesión para continuar
            estudiando con Hilo.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <div className="auth-field">
            <label htmlFor="email">
              Correo electrónico
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
              placeholder="tu@email.com"
              disabled={enviando}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">
              Contraseña
            </label>

            <div className="auth-password-wrapper">
              <input
                id="password"
                name="password"
                type={mostrarPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
                placeholder="Tu contraseña"
                disabled={enviando}
              />

              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => {
                  setMostrarPassword((prev) => !prev);
                }}
                aria-label={
                  mostrarPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
                aria-pressed={mostrarPassword}
                title={
                  mostrarPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
              >
                {mostrarPassword ? "◉" : "◎"}
              </button>
            </div>
          </div>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={enviando}
          >
            {enviando ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/recuperar-clave">
            ¿Olvidaste tu contraseña?
          </Link>

          <p>
            ¿Todavía no tenés cuenta?{" "}
            <Link to="/registro">
              Crear cuenta
            </Link>
          </p>
        </div>

      </div>
    </main>
  );
};

export default Login;
