import { useNavigate } from "react-router-dom";
import { useHilo } from "../context/HiloContext.jsx";
import "../styles/apuntes.css";

const Apuntes = () => {
  const navigate = useNavigate();
  const { hiloActual } = useHilo();

  const hayClase = Boolean(hiloActual.clase.nombre);

  return (
    <section className="notes-page">

      {/* =========================
          ENCABEZADO
      ========================= */}

      <div className="notes-header">
        <div>
          <span className="home-eyebrow">
            BIBLIOTECA
          </span>

          <h1>Mis apuntes</h1>

          <p>
            Todo lo que trabajás con Hilo queda organizado
            para que puedas volver cuando lo necesites.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => navigate("/clase")}
        >
          Nueva clase
        </button>
      </div>


      {/* =========================
          BUSCADOR
      ========================= */}

      <div className="notes-search">
        <input
          type="text"
          placeholder="Buscar por clase, tema o docente..."
        />

        <select defaultValue="todas">
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


      {/* =========================
          CONTENIDO
      ========================= */}

      {!hayClase ? (

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
            Cuando termines una clase, sus notas,
            preguntas y momentos importantes van a
            aparecer acá.
          </p>

          <button
            className="btn btn-primary"
            onClick={() => navigate("/clase")}
          >
            Empezar una clase
          </button>

        </section>

      ) : (

        <div className="notes-library">

          <div className="notes-library-header">
            <div>
              <span className="panel-label">
                CLASES
              </span>

              <h2>Clases recientes</h2>
            </div>

            <span className="notes-count">
              1 clase
            </span>
          </div>


          {/* CLASE ACTUAL */}

          <article className="class-note-card">

            <div className="class-note-content">

              <div className="class-note-top">

                <span className="class-note-status">
                  Clase guardada
                </span>

              </div>

              <h3>
                {hiloActual.clase.nombre}
              </h3>

              {hiloActual.clase.tema && (
                <p className="class-note-topic">
                  {hiloActual.clase.tema}
                </p>
              )}

              {hiloActual.clase.docente && (
                <p className="class-note-teacher">
                  Docente: {hiloActual.clase.docente}
                </p>
              )}

            </div>


            {/* RESUMEN */}

            <div className="class-note-stats">

              <div>
                <strong>
                  {hiloActual.notas.length}
                </strong>

                <span>Notas</span>
              </div>

              <div>
                <strong>
                  {hiloActual.preguntas.length}
                </strong>

                <span>Preguntas</span>
              </div>

              <div>
                <strong>
                  {hiloActual.importantes.length}
                </strong>

                <span>Importantes</span>
              </div>

              <div>
                <strong>
                  {hiloActual.noEntendi.length}
                </strong>

                <span>Para revisar</span>
              </div>

            </div>


            {/* ACCIÓN */}

            <div className="class-note-action">

              <button
                className="btn btn-secondary"
                onClick={() => navigate("/taller")}
              >
                Abrir clase →
              </button>

            </div>

          </article>

        </div>

      )}

    </section>
  );
};

export default Apuntes;