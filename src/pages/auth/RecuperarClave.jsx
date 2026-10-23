
import { useState } from "react";
import { Link } from "react-router-dom";

import { supabase } from "../../lib/supabase.js";

const MENSAJE_CONFIRMACION =
  "Si existe una cuenta asociada a ese correo, recibirás un enlace para cambiar tu contraseña.";

const RecuperarClave = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (enviando) return;

    setError("");
    setMensaje("");

    const emailLimpio = email.trim().toLowerCase();

    if (!emailLimpio) {
      setError("Ingresá tu correo electrónico.");
      return;
    }

    try {
      setEnviando(true);

      const redirectTo = new URL(
        "/cambiar-clave",
        window.location.origin
      ).toString();

      const { error: supabaseError } =
        await supabase.auth.resetPasswordForEmail(
          emailLimpio,
          { redirectTo }
        );

      if (supabaseError) {
        throw supabaseError;
      }

      setMensaje(MENSAJE_CONFIRMACION);
    } catch (error) {
      console.error(
        "Error recuperando contraseña:",
        error
      );

      if (
        error?.code === "over_email_send_rate_limit" ||
        error?.code === "over_request_rate_limit"
      ) {
        setError(
          "Demasiados intentos. Esperá unos minutos antes de solicitar otro enlace."
        );
      } else {
        setError(
          "No pudimos procesar la solicitud. Intentá nuevamente."
        );
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">

        <div className="auth-brand">
          <span className="home-eyebrow">
            HILO
          </span>

          <h1>Recuperar contraseña</h1>

          <p>
            Ingresá el correo asociado a tu
            cuenta y te enviaremos un enlace
            para crear una nueva contraseña.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <div className="auth-field">
            <label htmlFor="recoveryEmail">
              Correo electrónico
            </label>

            <input
              id="recoveryEmail"
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

          {error && (
            <div
              className="auth-error"
              role="alert"
            >
              {error}
            </div>
          )}

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
              ? "Enviando..."
              : "Enviar enlace"}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/login">
            ← Volver a iniciar sesión
          </Link>
        </div>

      </div>
    </main>
  );
};

export default RecuperarClave;
