import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  obtenerClasesTerminadas,
  eliminarClaseTerminada,
} from "../utils/hiloStorage.js";

import "../styles/apuntes.css";

const Apuntes = () => {
  const navigate = useNavigate();

  const [clases, setClases] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todas");

  // =========================================================
  // CARGAR CLASES GUARDADAS
  // =========================================================

  useEffect(() => {
    const cargarClases = async () => {
      try {
        setCargando(true);
        setError("");

        const guardadas =
          await obtenerClasesTerminadas();

        setClases(guardadas || []);
      } catch (error) {
        console.error(
          "No se pudieron cargar los apuntes:",
          error
        );

        setError(
          "No pudimos cargar tus clases guardadas."
        );
      } finally {
        setCargando(false);
      }
    };

    cargarClases();
  }, []);

  // =========================================================
  // FORMATEAR FECHA
  // =========================================================

  const formatearFecha = (clase) => {
    const fecha =
      clase.guardadaEn ||
      clase.finalizadaEn ||
      clase.iniciadaEn;

    if (!fecha) {
      return "";
    }

    try {
      return new Intl.DateTimeFormat(
        "es-UY",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      ).format(new Date(fecha));
    } catch {
      return "";
    }
  };

  // =========================================================
  // FORMATEAR DURACIÓN
  // =========================================================

  const formatearDuracion = (segundos) => {
    const total = Number(segundos);

    if (
      !Number.isFinite(total) ||
      total <= 0
    ) {
      return "";
    }

    const horas =
      Math.floor(total / 3600);

    const minutos =
      Math.floor(
        (total % 3600) / 60
      );

    if (horas > 0) {
      return `${horas} h ${minutos} min`;
    }

    if (minutos > 0) {
      return `${minutos} min`;
    }

    return `${Math.floor(total)} seg`;
  };

  // =========================================================
  // FILTRAR CLASES
  // =========================================================

  const clasesFiltradas =
    useMemo(() => {
      const texto =
        busqueda
          .trim()
          .toLowerCase();

      let resultado = [...clases];

      if (texto) {
        resultado =
          resultado.filter(
            (clase) => {
              const nombre =
                clase.clase?.nombre ||
                "";

              const tema =
                clase.clase?.tema ||
                "";

              const docente =
                clase.clase?.docente ||
                "";

              const contenido =
                `${nombre} ${tema} ${docente}`
                  .toLowerCase();

              return contenido.includes(
                texto
              );
            }
          );
      }

      if (filtro === "notas") {
        resultado =
          resultado.filter(
            (clase) =>
              (clase.notas || [])
                .length > 0
          );
      }

      if (filtro === "preguntas") {
        resultado =
          resultado.filter(
            (clase) =>
              (clase.preguntas || [])
                .length > 0
          );
      }

      if (filtro === "recientes") {
        resultado.sort(
          (a, b) => {
            const fechaA =
              new Date(
                a.guardadaEn ||
                a.finalizadaEn ||
                a.iniciadaEn ||
                0
              ).getTime();

            const fechaB =
              new Date(
                b.guardadaEn ||
                b.finalizadaEn ||
                b.iniciadaEn ||
                0
              ).getTime();

            return fechaB - fechaA;
          }
        );
      }

      return resultado;
    }, [
      clases,
      busqueda,
      filtro,
    ]);

  // =========================================================
  // ABRIR CLASE
  // =========================================================

  const abrirClase = (clase) => {
    if (!clase?.id) {
      return;
    }

    navigate(
      `/clases/${clase.id}`
    );
  };

  // =========================================================
  // ELIMINAR CLASE
  // =========================================================

  const eliminarClase = async (clase) => {
    if (!clase?.id) {
      return;
    }

    const nombre =
      clase.clase?.nombre ||
      "esta clase";

    const confirmar =
      window.confirm(
        `¿Querés eliminar "${nombre}"?\n\nEsta acción no se puede deshacer.`
      );

    if (!confirmar) {
      return;
    }

    try {
      await eliminarClaseTerminada(
        clase.id
      );

      setClases((prev) =>
        prev.filter(
          (item) =>
            item.id !== clase.id
        )
      );
    } catch (error) {
      console.error(
        "No se pudo eliminar la clase:",
        error
      );

      window.alert(
        "No pudimos eliminar la clase."
      );
    }
  };

  return (
    <section className="notes-page">

      {/* ENCABEZADO */}

      <div className="notes-header">
        <div>
          <span className="home-eyebrow">
            BIBLIOTECA
          </span>

          <h1>Mis apuntes</h1>

          <p>
            Todo lo que trabajás con Hilo queda
            organizado para que puedas volver
            cuando lo necesites.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            navigate("/clase")
          }
        >
          Nueva clase
        </button>
      </div>

      {/* BUSCADOR */}

      <div className="notes-search">
        <input
          type="text"
          value={busqueda}
          onChange={(event) =>
            setBusqueda(
              event.target.value
            )
          }
          placeholder="Buscar por clase, tema o docente..."
        />

        <select
          value={filtro}
          onChange={(event) =>
            setFiltro(
              event.target.value
            )
          }
        >
          <option value="todas">
            Todas las clases
          </option>

          <option value="recientes">
            Más recientes
          </option>

          <option value="notas">
            Con notas
          </option>

          <option value="preguntas">
            Con preguntas
          </option>
        </select>
      </div>

      {/* CARGANDO */}

      {cargando && (
        <section className="notes-library-empty">
          <div className="notes-empty-icon">
            🧵
          </div>

          <span className="panel-label">
            BIBLIOTECA
          </span>

          <h2>
            Cargando tus clases...
          </h2>
        </section>
      )}

      {/* ERROR */}

      {!cargando && error && (
        <section className="notes-library-empty">
          <div className="notes-empty-icon">
            ⚠️
          </div>

          <h2>
            No pudimos cargar tus apuntes.
          </h2>

          <p>{error}</p>
        </section>
      )}

      {/* BIBLIOTECA VACÍA */}

      {!cargando &&
        !error &&
        clases.length === 0 && (
          <section className="notes-library-empty">
            <div className="notes-empty-icon">
              📚
            </div>

            <span className="panel-label">
              TU BIBLIOTECA
            </span>

            <h2>
              Todavía no tenés clases guardadas.
            </h2>

            <p>
              Cuando guardes o termines una clase,
              sus notas, preguntas y momentos
              importantes van a aparecer acá.
            </p>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                navigate("/clase")
              }
            >
              Empezar una clase
            </button>
          </section>
        )}

      {/* SIN RESULTADOS */}

      {!cargando &&
        !error &&
        clases.length > 0 &&
        clasesFiltradas.length === 0 && (
          <section className="notes-library-empty">
            <div className="notes-empty-icon">
              🔎
            </div>

            <span className="panel-label">
              BÚSQUEDA
            </span>

            <h2>
              No encontramos clases.
            </h2>

            <p>
              Probá con otro nombre,
              tema, docente o filtro.
            </p>
          </section>
        )}

      {/* CLASES GUARDADAS */}

      {!cargando &&
        !error &&
        clasesFiltradas.length > 0 && (
          <div className="notes-library">

            <div className="notes-library-header">
              <div>
                <span className="panel-label">
                  CLASES
                </span>

                <h2>
                  Clases recientes
                </h2>
              </div>

              <span className="notes-count">
                {clasesFiltradas.length}{" "}
                {clasesFiltradas.length === 1
                  ? "clase"
                  : "clases"}
              </span>
            </div>

            {clasesFiltradas.map(
              (clase) => {
                const datos =
                  clase.clase || {};

                const notas =
                  clase.notas || [];

                const preguntas =
                  clase.preguntas || [];

                const importantes =
                  clase.importantes || [];

                const noEntendi =
                  clase.noEntendi || [];

                const fecha =
                  formatearFecha(
                    clase
                  );

                const duracion =
                  formatearDuracion(
                    clase.duracionSegundos
                  );

                return (
                  <article
                    className="class-note-card"
                    key={clase.id}
                  >
                    <div className="class-note-content">

                      <div className="class-note-top">
                        <span className="class-note-status">
                          {clase.estado ===
                          "taller"
                            ? "Clase finalizada"
                            : "Clase guardada"}
                        </span>
                      </div>

                      <h3>
                        {datos.nombre ||
                          "Clase sin nombre"}
                      </h3>

                      {datos.tema && (
                        <p className="class-note-topic">
                          {datos.tema}
                        </p>
                      )}

                      {datos.docente && (
                        <p className="class-note-teacher">
                          Docente:{" "}
                          {datos.docente}
                        </p>
                      )}

                      {(fecha ||
                        duracion) && (
                        <p className="class-note-teacher">
                          {fecha}

                          {fecha &&
                            duracion &&
                            " · "}

                          {duracion}
                        </p>
                      )}
                    </div>

                    {/* RESUMEN */}

                    <div className="class-note-stats">
                      <div>
                        <strong>
                          {notas.length}
                        </strong>
                        <span>Notas</span>
                      </div>

                      <div>
                        <strong>
                          {preguntas.length}
                        </strong>
                        <span>
                          Preguntas
                        </span>
                      </div>

                      <div>
                        <strong>
                          {importantes.length}
                        </strong>
                        <span>
                          Importantes
                        </span>
                      </div>

                      <div>
                        <strong>
                          {noEntendi.length}
                        </strong>
                        <span>
                          Para revisar
                        </span>
                      </div>
                    </div>

                    {/* ACCIONES */}

                    <div className="class-note-action">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() =>
                          abrirClase(clase)
                        }
                      >
                        Abrir clase →
                      </button>

                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() =>
                          eliminarClase(clase)
                        }
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
    </section>
  );
};

export default Apuntes;