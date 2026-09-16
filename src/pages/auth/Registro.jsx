import { useState } from "react";
import {
  Link,
  Navigate,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext.jsx";

const Registro = () => {
  const navigate = useNavigate();

  const {
    user,
    loading,
    register,
  } = useAuth();

  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [
    mostrarPassword,
    setMostrarPassword,
  ] = useState(false);

  const [
    mostrarConfirmPassword,
    setMostrarConfirmPassword,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  const [enviando, setEnviando] =
    useState(false);

  // =========================================================
  // USUARIO YA LOGUEADO
  // =========================================================

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  // =========================================================
  // REGISTRO
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMensaje("");

    const nombreLimpio =
      fullName.trim();

    const emailLimpio =
      email.trim().toLowerCase();

    if (
      !nombreLimpio ||
      !emailLimpio ||
      !password ||
      !confirmPassword
    ) {
      setError(
        "Completá todos los campos."
      );

      return;
    }

    if (password.length < 8) {
      setError(
        "La contraseña debe tener al menos 8 caracteres."
      );

      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Las contraseñas no coinciden."
      );

      return;
    }

    try {
      setEnviando(true);

      const data =
        await register(
          emailLimpio,
          password,
          nombreLimpio
        );

      /*
       * Si Supabase requiere confirmación
       * por correo, puede crear el usuario
       * sin iniciar sesión todavía.
       */

      if (!data?.session) {
        setMensaje(
          "Cuenta creada. Revisá tu correo para confirmar tu cuenta antes de iniciar sesión."
        );

        setPassword("");
        setConfirmPassword("");

        return;
      }

      navigate("/", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Error registrando usuario:",
        error
      );

      if (
        error?.message
          ?.toLowerCase()
          .includes("already registered")
      ) {
        setError(
          "Ya existe una cuenta con ese correo."
        );
      } else if (
        error?.message
          ?.toLowerCase()
          .includes("password")
      ) {
        setError(
          "La contraseña no cumple los requisitos."
        );
      } else {
        setError(
          "No pudimos crear la cuenta. Intentá nuevamente."
        );
      }
    } finally {
      setEnviando(false);
    }
  };

  // =========================================================
  // CARGANDO
  // =========================================================

  if (loading) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <p>Cargando Hilo...</p>
        </div>
      </main>
    );
  }

  // =========================================================
  // VISTA
  // =========================================================

  return (
    <main className="auth-page">
      <div className="auth-card">

        <div className="auth-brand">
          <span className="home-eyebrow">
            HILO
          </span>

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
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(event) =>
                setFullName(
                  event.target.value
                )
              }
              placeholder="Tu nombre"
            />
          </div>

          {/* EMAIL */}

          <div className="auth-field">
            <label htmlFor="registerEmail">
              Correo electrónico
            </label>

            <input
              id="registerEmail"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              placeholder="tu@email.com"
            />
          </div>

          {/* PASSWORD */}

          <div className="auth-field">
            <label htmlFor="registerPassword">
              Contraseña
            </label>

            <div className="auth-password-wrapper">
              <input
                id="registerPassword"
                type={
                  mostrarPassword
                    ? "text"
                    : "password"
                }
                autoComplete="new-password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Mínimo 8 caracteres"
              />

              <button
                type="button"
                className="auth-password-toggle"
                onClick={() =>
                  setMostrarPassword(
                    (prev) => !prev
                  )
                }
                aria-label={
                  mostrarPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
              >
                {mostrarPassword
                  ? "◉"
                  : "◎"}
              </button>
            </div>
          </div>

          {/* CONFIRMAR PASSWORD */}

          <div className="auth-field">
            <label htmlFor="confirmPassword">
              Confirmar contraseña
            </label>

            <div className="auth-password-wrapper">
              <input
                id="confirmPassword"
                type={
                  mostrarConfirmPassword
                    ? "text"
                    : "password"
                }
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                placeholder="Repetí tu contraseña"
              />

              <button
                type="button"
                className="auth-password-toggle"
                onClick={() =>
                  setMostrarConfirmPassword(
                    (prev) => !prev
                  )
                }
                aria-label={
                  mostrarConfirmPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
              >
                {mostrarConfirmPassword
                  ? "◉"
                  : "◎"}
              </button>
            </div>
          </div>

          {/* ERROR */}

          {error && (
            <div
              className="auth-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* ÉXITO */}

          {mensaje && (
            <div
              className="auth-success"
              role="status"
            >
              {mensaje}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={enviando}
          >
            {enviando
              ? "Creando cuenta..."
              : "Crear cuenta"}
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