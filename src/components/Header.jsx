import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";

import "../styles/header.css";

const Header = () => {
  const navigate = useNavigate();

  const {
    user,
    profile,
    loading,
    logout,
    isAdmin,
  } = useAuth();

  const [menuAbierto, setMenuAbierto] =
    useState(false);

  const menuRef = useRef(null);

  // =========================================================
  // NOMBRE DEL USUARIO
  // =========================================================

  const nombreUsuario =
    profile?.full_name?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "Usuario";

  const primerNombre =
    nombreUsuario.split(" ")[0];

  // =========================================================
  // CERRAR MENÚ AL HACER CLICK AFUERA
  // =========================================================

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setMenuAbierto(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  // =========================================================
  // CERRAR SESIÓN
  // =========================================================

  const handleLogout = async () => {
    try {
      setMenuAbierto(false);

      await logout();

      navigate("/", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Error cerrando sesión:",
        error
      );
    }
  };

  // =========================================================
  // VISTA
  // =========================================================

  return (
    <header>

      {/* LOGO */}

      <div>
        <Link to="/">
          <img
            src="/logohilo.png"
            alt="Hilo - Seguí tus clases"
          />
        </Link>
      </div>

      {/* NAVEGACIÓN */}

      <nav>
        <Link to="/">
          Inicio
        </Link>

        <Link to="/clase">
          En clase
        </Link>

        <Link to="/taller">
          Taller
        </Link>

        <Link to="/apuntes">
          Apuntes
        </Link>
      </nav>

      {/* USUARIO */}

      <div className="header-auth">

        {!loading && !user && (
          <Link
            to="/login"
            className="header-login"
          >
            Iniciar sesión
          </Link>
        )}

        {!loading && user && (
          <div
            className="header-user"
            ref={menuRef}
          >
            <button
              type="button"
              className="header-user-button"
              onClick={() =>
                setMenuAbierto(
                  (prev) => !prev
                )
              }
              aria-expanded={menuAbierto}
              aria-haspopup="menu"
            >
              <span>
                Hola, {primerNombre}
              </span>

              <span
                className={
                  menuAbierto
                    ? "header-user-arrow open"
                    : "header-user-arrow"
                }
              >
                ▾
              </span>
            </button>

            {menuAbierto && (
              <div
                className="header-user-menu"
                role="menu"
              >

                {/* ADMIN */}

                {isAdmin && (
                  <button
                    type="button"
                    className="header-menu-item"
                    onClick={() => {
                      setMenuAbierto(false);
                      navigate("/admin");
                    }}
                  >
                    Administración
                  </button>
                )}

                {/* CERRAR SESIÓN */}

                <button
                  type="button"
                  className="header-menu-item header-logout"
                  onClick={handleLogout}
                >
                  Cerrar sesión
                </button>

              </div>
            )}
          </div>
        )}

      </div>

    </header>
  );
};

export default Header;