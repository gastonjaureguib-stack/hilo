import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import MainLayout from "../layouts/MainLayout.jsx";

import ProtectedRoute from "../components/auth/ProtectedRoute.jsx";

// PÁGINAS HILO

import Home from "../pages/Home.jsx";
import Clase from "../pages/Clase.jsx";
import Taller from "../pages/Taller.jsx";
import ClaseDetalle from "../pages/ClaseDetalle.jsx";
import Apuntes from "../pages/Apuntes.jsx";

// AUTENTICACIÓN

import Login from "../pages/auth/Login.jsx";
import Registro from "../pages/auth/Registro.jsx";
import RecuperarClave from "../pages/auth/RecuperarClave.jsx";
import CambiarClave from "../pages/auth/CambiarClave.jsx";

const AppRouter = () => {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>

          {/* =============================================== */}
          {/* RUTAS PÚBLICAS */}
          {/* =============================================== */}

          <Route
            path="/"
            element={<Home />}
          />

          <Route
            path="/taller"
            element={<Taller />}
          />

          <Route
            path="/apuntes"
            element={<Apuntes />}
          />

          {/* =============================================== */}
          {/* AUTENTICACIÓN */}
          {/* =============================================== */}

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/registro"
            element={<Registro />}
          />

          <Route
            path="/recuperar-clave"
            element={<RecuperarClave />}
          />

          <Route
            path="/cambiar-clave"
            element={<CambiarClave />}
          />

          {/* =============================================== */}
          {/* RUTAS PROTEGIDAS */}
          {/* =============================================== */}

          <Route
            path="/clase"
            element={
              <ProtectedRoute>
                <Clase />
              </ProtectedRoute>
            }
          />

          <Route
            path="/clases/:id"
            element={
              <ProtectedRoute>
                <ClaseDetalle />
              </ProtectedRoute>
            }
          />

        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
};

export default AppRouter;