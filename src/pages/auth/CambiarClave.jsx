
import { useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext.jsx";

const CambiarClave = () => {
  const {
    loading,
    isPasswordRecovery,
    cambiarPassword,
    finalizarRecuperacion,
    logout,
  } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmPassword, setMostrarConfirmPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [completado, setCompletado] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (enviando || completado || !isPasswordRecovery) {
      return;
    }

    setError("");
    setMensaje("");

    if (!password || !confirmPassword) {
      setError("Completá ambos campos.");
      return;
    }

    if (password.length < 8) {
      setError(
        "La contraseña debe tener al menos 8 caracteres."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setEnviando(true);

      await cambiarPassword(password);

      setPassword("");
      setConfirmPassword("");
      setCompletado(true);

      finalizarRecuperacion();

      // Cerramos la sesión de recuperación para que
      // el usuario vuelva a iniciar sesión con su
      // nueva contraseña.
      try {
        await logout();
      } catch (logoutError) {
        console.error(
          "No se pudo cerrar la sesión:",
          logoutError
        );
      }

      setMensaje(
        "Tu contraseña fue actualizada correctamente. Ya podés iniciar sesión con tu nueva contraseña."
      );
    } catch (error) {
      console.error(
        "Error cambiando contraseña:",
        error
      );

      setError(
        "No pudimos cambiar tu contraseña. Verificá el enlace o solicitá uno nuevo."
      );
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <main className="auth-page">
        <div className="auth-card" role="status">
          <p>Verificando sesión...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="home-eyebrow">HILO</span>

          <h1>Nueva contraseña</h1>

          <p>
            Elegí una nueva contraseña
            para tu cuenta de Hilo.
          </p>
        </div>

        {completado ? (
          <div className="auth-form">
            <div className="auth-success" role="status">
              {mensaje}
            </div>

            <Link to="/login">
              Iniciar sesión
            </Link>
          </div>
        ) : !isPasswordRecovery ? (
          <div className="auth-form">
            <div className="auth-error" role="alert">
              No hay una solicitud de recuperación
              válida para esta sesión.
            </div>

            <Link to="/recuperar-clave">
              Solicitar un nuevo enlace
            </Link>
          </div>
        ) : (
          <form
            className="auth-form"
            onSubmit={handleSubmit}
          >
            <div className="auth-field">
              <label htmlFor="newPassword">
                Nueva contraseña
              </label>

              <div className="auth-password-wrapper">
                <input
                  id="newPassword"
                  name="password"
                  type={
                    mostrarPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Mínimo 8 caracteres"
                  disabled={enviando}
                />

                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() =>
                    setMostrarPassword((prev) => !prev)
                  }
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

            <div className="auth-field">
              <label htmlFor="confirmNewPassword">
                Confirmar contraseña
              </label>

              <div className="auth-password-wrapper">
                <input
                  id="confirmNewPassword"
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
              {enviando
                ? "Guardando..."
                : "Guardar contraseña"}
            </button>
          </form>
        )}

        {!completado && (
          <div className="auth-links">
            <Link to="/login">
              Volver al login
            </Link>
          </div>
        )}
      </div>
    </main>
  );
};

export default CambiarClave;
