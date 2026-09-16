import { useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";

import { supabase } from "../../lib/supabase.js";

const CambiarClave = () => {
  const navigate = useNavigate();

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
  // CAMBIAR CONTRASEÑA
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMensaje("");

    if (!password || !confirmPassword) {
      setError(
        "Completá ambos campos."
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

      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) {
        throw error;
      }

      setPassword("");
      setConfirmPassword("");

      setMensaje(
        "Tu contraseña fue actualizada correctamente."
      );

      setTimeout(() => {
        navigate("/login", {
          replace: true,
        });
      }, 1500);
    } catch (error) {
      console.error(
        "Error cambiando contraseña:",
        error
      );

      setError(
        "No pudimos cambiar tu contraseña. El enlace puede haber vencido o no ser válido."
      );
    } finally {
      setEnviando(false);
    }
  };

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

          <h1>Nueva contraseña</h1>

          <p>
            Elegí una nueva contraseña
            para tu cuenta de Hilo.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >

          {/* NUEVA CONTRASEÑA */}

          <div className="auth-field">
            <label htmlFor="newPassword">
              Nueva contraseña
            </label>

            <div className="auth-password-wrapper">
              <input
                id="newPassword"
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
                title={
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

          {/* CONFIRMAR CONTRASEÑA */}

          <div className="auth-field">
            <label htmlFor="confirmNewPassword">
              Confirmar contraseña
            </label>

            <div className="auth-password-wrapper">
              <input
                id="confirmNewPassword"
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
                title={
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

          {/* GUARDAR */}

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={enviando}
          >
            {enviando
              ? "Guardando..."
              : "Guardar contraseña"}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/login">
            Volver al login
          </Link>
        </div>

      </div>
    </main>
  );
};

export default CambiarClave;