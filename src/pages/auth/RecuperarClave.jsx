import { useState } from "react";
import { Link } from "react-router-dom";

import { supabase } from "../../lib/supabase.js";

const RecuperarClave = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  // =========================================================
  // ENVIAR CORREO DE RECUPERACIÓN
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMensaje("");

    const emailLimpio =
      email.trim().toLowerCase();

    if (!emailLimpio) {
      setError(
        "Ingresá tu correo electrónico."
      );

      return;
    }

    try {
      setEnviando(true);

      const redirectTo =
        `${window.location.origin}/cambiar-clave`;

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          emailLimpio,
          {
            redirectTo,
          }
        );

      if (error) {
        throw error;
      }

      /*
       * No confirmamos si el correo existe.
       * Es mejor desde el punto de vista de
       * seguridad no revelar qué emails
       * tienen una cuenta en Hilo.
       */

      setMensaje(
        "Si existe una cuenta asociada a ese correo, recibirás un enlace para cambiar tu contraseña."
      );
    } catch (error) {
      console.error(
        "Error recuperando contraseña:",
        error
      );

      setError(
        "No pudimos enviar el correo de recuperación. Intentá nuevamente."
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

          {/* EMAIL */}

          <div className="auth-field">
            <label htmlFor="recoveryEmail">
              Correo electrónico
            </label>

            <input
              id="recoveryEmail"
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

          {/* ERROR */}

          {error && (
            <div
              className="auth-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* MENSAJE */}

          {mensaje && (
            <div
              className="auth-success"
              role="status"
            >
              {mensaje}
            </div>
          )}

          {/* ENVIAR */}

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