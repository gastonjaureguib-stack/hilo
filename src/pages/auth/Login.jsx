import { useState } from "react";

import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext.jsx";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    user,
    loading,
    login,
  } = useAuth();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    mostrarPassword,
    setMostrarPassword,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [enviando, setEnviando] =
    useState(false);

  // =========================================================
  // DESTINO DESPUÉS DEL LOGIN
  // =========================================================

  const destino =
    location.state?.from || "/";

  // =========================================================
  // SI YA ESTÁ LOGUEADO
  // =========================================================

  if (!loading && user) {
    return (
      <Navigate
        to={destino}
        replace
      />
    );
  }

  // =========================================================
  // LOGIN
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    const emailLimpio =
      email.trim().toLowerCase();

    if (!emailLimpio || !password) {
      setError(
        "Ingresá tu correo y contraseña."
      );

      return;
    }

    try {
      setEnviando(true);

      await login(
        emailLimpio,
        password
      );

      navigate(
        destino,
        {
          replace: true,
        }
      );
    } catch (error) {
      console.error(
        "Error iniciando sesión:",
        error
      );

      if (
        error?.message ===
        "Invalid login credentials"
      ) {
        setError(
          "El correo o la contraseña no son correctos."
        );
      } else if (
        error?.message ===
        "Email not confirmed"
      ) {
        setError(
          "Primero tenés que confirmar tu correo electrónico."
        );
      } else {
        setError(
          "No pudimos iniciar sesión. Intentá nuevamente."
        );
      }
    } finally {
      setEnviando(false);
    }
  };

  // =========================================================
  // CARGANDO SESIÓN
  // =========================================================

  if (loading) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <p>
            Cargando Hilo...
          </p>
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

        {/* MARCA */}

        <div className="auth-brand">

          <span className="home-eyebrow">
            HILO
          </span>

          <h1>
            Volvé a tus clases
          </h1>

          <p>
            Iniciá sesión para continuar
            estudiando con Hilo.
          </p>

        </div>

        {/* FORMULARIO */}

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >

          {/* EMAIL */}

          <div className="auth-field">

            <label htmlFor="email">
              Correo electrónico
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              placeholder="tu@email.com"
              disabled={enviando}
            />

          </div>

          {/* CONTRASEÑA */}

          <div className="auth-field">

            <label htmlFor="password">
              Contraseña
            </label>

            <div className="auth-password-wrapper">

              <input
                id="password"
                type={
                  mostrarPassword
                    ? "text"
                    : "password"
                }
                autoComplete="current-password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Tu contraseña"
                disabled={enviando}
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

          {/* ERROR */}

          {error && (
            <div
              className="auth-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* BOTÓN */}

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={enviando}
          >
            {enviando
              ? "Ingresando..."
              : "Iniciar sesión"}
          </button>

        </form>

        {/* LINKS */}

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