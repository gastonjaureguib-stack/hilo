import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import TallerClase from "../components/TallerClase.jsx";

import {
  obtenerClaseTerminada,
} from "../utils/hiloStorage.js";

import {
  useAuth,
} from "../context/AuthContext.jsx";


const ClaseDetalle = () => {
  const { id } = useParams();

  const navigate =
    useNavigate();

  const {
    user,
    loading,
  } = useAuth();


  const [clase, setClase] =
    useState(null);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");


  useEffect(() => {
    let activo = true;


    const cargarClase =
      async () => {

        // Esperamos a que Supabase
        // termine de recuperar la sesión.
        if (loading) {
          return;
        }


        if (!user?.id) {
          if (activo) {
            setClase(null);

            setError(
              "Necesitás iniciar sesión para abrir esta clase."
            );

            setCargando(false);
          }

          return;
        }


        try {
          setCargando(true);

          setError("");


          const resultado =
            await obtenerClaseTerminada(
              id,
              user.id
            );


          if (!activo) {
            return;
          }


          if (!resultado) {
            setClase(null);

            setError(
              "No encontramos esta clase guardada."
            );

            return;
          }


          setClase(
            resultado
          );

        } catch (error) {

          console.error(
            "No se pudo cargar la clase guardada:",
            error
          );


          if (activo) {
            setClase(null);

            setError(
              "No pudimos cargar esta clase."
            );
          }

        } finally {

          if (activo) {
            setCargando(false);
          }

        }
      };


    cargarClase();


    return () => {
      activo = false;
    };

  }, [
    id,
    user?.id,
    loading,
  ]);


  if (
    loading ||
    cargando
  ) {
    return (
      <section className="workshop-empty">

        <span className="home-eyebrow">
          MIS APUNTES
        </span>

        <h1>
          Abriendo clase...
        </h1>

      </section>
    );
  }


  if (
    error ||
    !clase
  ) {
    return (
      <section className="workshop-empty">

        <span className="home-eyebrow">
          MIS APUNTES
        </span>

        <h1>
          No pudimos abrir la clase.
        </h1>

        <p>
          {error}
        </p>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            navigate(
              "/apuntes"
            )
          }
        >
          Volver a Mis apuntes
        </button>

      </section>
    );
  }


  return (
    <TallerClase
      clase={clase}
      modoHistorico
    />
  );
};


export default ClaseDetalle;