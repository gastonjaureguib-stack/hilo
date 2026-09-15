import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import MainLayout from "../layouts/MainLayout.jsx";

import Home from "../pages/Home.jsx";
import Clase from "../pages/Clase.jsx";
import Taller from "../pages/Taller.jsx";
import ClaseDetalle from "../pages/ClaseDetalle.jsx";
import Apuntes from "../pages/Apuntes.jsx";

const AppRouter = () => {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/clase" element={<Clase />} />
          <Route path="/taller" element={<Taller />} />
          <Route
            path="/clases/:id"
            element={<ClaseDetalle />}
          />
          <Route
            path="/apuntes"
            element={<Apuntes />}
          />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
};

export default AppRouter;