
import { useState } from "react";
import {
  Link,
  Navigate,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext.jsx";

const obtenerMensajeError = (error) => {
  switch (error?.code) {
    case "user_already_exists":
    case "email_exists":
      return "Ya existe una cuenta con ese correo.";

    case "weak_password":
      return "La contraseña no cumple los requisitos de seguridad.";

    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Demasiados intentos. Esperá unos minutos y volvé a intentar.";

    default:
      break;
  }

  const mensaje = error?.message?.toLowerCase() ?? "";

  if (mensaje.includes("already registered")) {
    return "Ya existe una cuenta con ese correo.";
  }

  if (mensaje.includes("password")) {
    return "La contraseña no cumple los requisitos de seguridad.";
  }

  return "No pudimos crear la cuenta. Intentá nuevamente.";
};

const Registro = () => {
  const navigate = useNavigate();
  const { user, loading, register } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmPassword, setMostrarConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (enviando) return;

    setError("");
    setMensaje("");

    const nombreLimpio = fullName.trim();
    const emailLimpio = email.trim().toLowerCase();

    if (
      !nombreLimpio ||
      !emailLimpio ||
      !password ||
      !confirmPassword
    ) {
      setError("Completá todos los campos.");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setEnviando(true);

      const data = await register(
        emailLimpio,
        password,
        nombreLimpio
      );

      if (!data?.session) {
        setMensaje(
          "Si el registro se completó, revisá tu correo para confirmar tu cuenta antes de iniciar sesión."
        );

        setPassword("");
        setConfirmPassword("");
        return;
      }

      navigate("/", { replace: true });
    } catch (error) {
      console.error("Error registrando usuario:", error);
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
    return <Navigate to="/" replace />;
  }

  return (
    <main className="auth-page">
      <div className="auth-card">

        <div className="auth-brand">
          <span className="home-eyebrow">HILO</span>

          <h1>Creá tu cuenta</h1>

          <p>
            Guardá tus clases, apuntes y
            momentos para continuar desde
            cualquier dispositivo.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          {/* NOMBRE */}

          <div className="auth-field">
            <label htmlFor="fullName">
              Nombre
            </label>

            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              maxLength={100}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Tu nombre"
              disabled={enviando}
            />
          </div>

          {/* CORREO */}

          <div className="auth-field">
            <label htmlFor="registerEmail">
              Correo electrónico
            </label>

            <input
              id="registerEmail"
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@email.com"
              disabled={enviando}
            />
          </div>

          {/* CONTRASEÑA */}

          <div className="auth-field">
            <label htmlFor="registerPassword">
              Contraseña
            </label>

            <div className="auth-password-wrapper">
              <input
                id="registerPassword"
                name="password"
                type={mostrarPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo 8 caracteres"
                disabled={enviando}
              />

              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setMostrarPassword((prev) => !prev)}
                aria-label={
                  mostrarPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
                aria-pressed={mostrarPassword}
                disabled={enviando}
              >
                {mostrarPassword ? "◉" : "◎"}
              </button>
            </div>
          </div>

          {/* CONFIRMAR CONTRASEÑA */}

          <div className="auth-field">
            <label htmlFor="confirmPassword">
              Confirmar contraseña
            </label>

            <div className="auth-password-wrapper">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={
                  mostrarConfirmPassword
                    ? "text"
                    : "password"
                }
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Repetí tu contraseña"
                disabled={enviando}
              />

              <button
                type="button"
                className="auth-password-toggle"
                onClick={() =>
                  setMostrarConfirmPassword((prev) => !prev)
                }
                aria-label={
                  mostrarConfirmPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
                aria-pressed={mostrarConfirmPassword}
                disabled={enviando}
              >
                {mostrarConfirmPassword ? "◉" : "◎"}
              </button>
            </div>
          </div>

          {/* MENSAJES */}

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          {mensaje && (
            <div className="auth-success" role="status">
              {mensaje}
            </div>
          )}

          {/* ENVIAR */}

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={enviando}
          >
            {enviando ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <div className="auth-links">
          <p>
            ¿Ya tenés una cuenta?{" "}
            <Link to="/login">
              Iniciar sesión
            </Link>
          </p>
        </div>

      </div>
    </main>
  );
};

export default Registro;
