import {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useHilo,
} from "../context/HiloContext.jsx";

import {
  useClassAudio,
} from "../hooks/useClassAudio.js";

import {
  mejorarPregunta,
} from "../services/questionService.js";

import "../styles/clase.css";


const Clase = () => {
  const navigate =
    useNavigate();


  const {
    hiloActual,
    iniciarNuevaClase,
    finalizarClase,
    agregarNota,
    agregarImportante,
    agregarNoEntendi,
  } = useHilo();


  const {
    estadoGrabacion,
    estadoTranscripcion,
    fuenteAudio,
    textoParcial,
    errorAudio,
    errorTranscripcion,
    iniciarMicrofono,
    iniciarComputadora,
    pausarAudio,
    reanudarAudio,
    detenerAudio,
  } = useClassAudio();


  const [
    datosClase,
    setDatosClase,
  ] = useState({
    nombre: "",
    tema: "",
    docente: "",
  });


  const [
    nota,
    setNota,
  ] = useState("");


  const [
    duda,
    setDuda,
  ] = useState("");


  const [
    preguntaSugerida,
    setPreguntaSugerida,
  ] = useState("");


  const [
    mensajeNoEntendi,
    setMensajeNoEntendi,
  ] = useState("");

  const [
    mejorandoPregunta,
    setMejorandoPregunta,
  ] = useState(false);

  const [
    errorPregunta,
    setErrorPregunta,
  ] = useState("");

  const [
    finalizando,
    setFinalizando,
  ] = useState(false);


  const handleChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;


      setDatosClase(
        (prev) => ({
          ...prev,
          [name]: value,
        })
      );
    };


  const iniciarClase =
    (event) => {
      event.preventDefault();


      if (
        !datosClase.nombre
          .trim()
      ) {
        return;
      }


      iniciarNuevaClase(
        datosClase
      );
    };


  const guardarNota =
    () => {
      if (!nota.trim()) {
        return;
      }


      agregarNota(
        nota
      );


      setNota("");
    };


  const marcarImportante =
    () => {
      agregarImportante();
    };


  const marcarNoEntendi =
    () => {
      const momento =
        agregarNoEntendi();

      setMensajeNoEntendi(
        momento?.tiempoTexto
          ? `✓ Marcado en ${momento.tiempoTexto}`
          : "✓ Momento guardado"
      );

      window.setTimeout(
        () => {
          setMensajeNoEntendi("");
        },
        2200
      );
    };

  const obtenerContextoPregunta =
    () => {
      const bloques =
        hiloActual.transcripcion || [];

      if (bloques.length === 0) {
        return "";
      }

      const tiemposValidos =
        bloques
          .map((bloque) =>
            Number(bloque.tiempo)
          )
          .filter(
            (tiempo) =>
              Number.isFinite(tiempo)
          );

      if (tiemposValidos.length === 0) {
        return bloques
          .slice(-6)
          .map(
            (bloque) =>
              bloque.texto
          )
          .filter(Boolean)
          .join("\n");
      }

      const ultimoTiempo =
        Math.max(
          ...tiemposValidos
        );

      const desde =
        Math.max(
          0,
          ultimoTiempo - 90
        );

      return bloques
        .filter((bloque) => {
          const tiempo =
            Number(
              bloque.tiempoSegundos ??
              bloque.tiempo
            );

          return (
            Number.isFinite(tiempo) &&
            tiempo >= desde
          );
        })
        .map(
          (bloque) =>
            bloque.texto
        )
        .filter(Boolean)
        .join("\n");
    };

  const prepararPregunta =
    async () => {
      if (
        !duda.trim() ||
        mejorandoPregunta
      ) {
        return;
      }

      setMejorandoPregunta(
        true
      );

      setPreguntaSugerida(
        ""
      );

      setErrorPregunta(
        ""
      );

      try {
        const pregunta =
          await mejorarPregunta({
            duda:
              duda.trim(),

            contexto:
              obtenerContextoPregunta(),

            clase:
              hiloActual.clase,
          });

        setPreguntaSugerida(
          pregunta
        );
      } catch (error) {
        console.error(
          "No se pudo mejorar la pregunta:",
          error
        );

        setErrorPregunta(
          error?.message ||
            "No pude mejorar la pregunta ahora."
        );
      } finally {
        setMejorandoPregunta(
          false
        );
      }
    };

  const terminarClase =
    async () => {
      if (finalizando) {
        return;
      }


      setFinalizando(
        true
      );


      try {
        if (
          estadoGrabacion ===
            "grabando" ||
          estadoGrabacion ===
            "pausado" ||
          estadoGrabacion ===
            "deteniendo"
        ) {
          await detenerAudio();
        }


        finalizarClase();


        navigate(
          "/taller"
        );

      } catch (error) {
        console.error(
          "No se pudo finalizar la clase:",
          error
        );


        setFinalizando(
          false
        );
      }
    };


  const textoEstadoGrabacion = {
    inactivo:
      "○ Audio sin iniciar",

    solicitando:
      "… Elegí qué compartir",

    grabando:
      "● Grabando",

    pausado:
      "⏸ Audio pausado",

    deteniendo:
      "… Guardando",

    finalizado:
      "✓ Audio guardado",

    error:
      "⚠ Error de audio",
  };


  const textoEstadoTranscripcion = {
    inactivo:
      "○ Transcripción sin iniciar",

    conectando:
      "… Conectando",

    activo:
      "● Transcribiendo",

    pausado:
      "⏸ Transcripción pausada",

    reconectando:
      "⚠ Reconectando",

    deteniendo:
      "… Cerrando",

    finalizado:
      "✓ Finalizada",

    error:
      "⚠ Interrumpida",
  };


  // Nueva clase

  if (
    hiloActual.estado !==
    "enClase"
  ) {
    return (
      <section className="new-class-page">

        <div className="new-class-intro">

          <span className="home-eyebrow">
            NUEVA CLASE
          </span>


          <h1>
            ¿Qué clase vas a seguir?
          </h1>


          <p>
            Contale a Hilo qué estás estudiando.
            Vamos a usar esta información para
            organizar la clase y ayudarte después
            en el Taller.
          </p>

        </div>


        <form
          className="new-class-form"
          onSubmit={
            iniciarClase
          }
        >

          <div className="form-group">

            <label htmlFor="nombre">
              Nombre de la clase
            </label>


            <input
              id="nombre"
              name="nombre"
              type="text"
              value={
                datosClase.nombre
              }
              onChange={
                handleChange
              }
              placeholder="Ej: Backend II, Inglés, Derecho..."
              required
            />

          </div>


          <div className="form-group">

            <label htmlFor="tema">
              Tema de hoy
            </label>


            <input
              id="tema"
              name="tema"
              type="text"
              value={
                datosClase.tema
              }
              onChange={
                handleChange
              }
              placeholder="Opcional"
            />

          </div>


          <div className="form-group">

            <label htmlFor="docente">
              Docente
            </label>


            <input
              id="docente"
              name="docente"
              type="text"
              value={
                datosClase.docente
              }
              onChange={
                handleChange
              }
              placeholder="Opcional"
            />

          </div>


          <button
            type="submit"
            className="btn btn-primary"
          >
            Comenzar clase
          </button>

        </form>

      </section>
    );
  }


  // Consola en vivo

  return (
    <section className="live-console">

      <header className="console-header">

        <div className="console-class">

          <div className="console-title">

            <span className="live-indicator">

              <span className="live-indicator-dot">
              </span>

              EN CLASE

            </span>


            <h1>
              {
                hiloActual
                  .clase
                  .nombre
              }
            </h1>

          </div>


          <div className="console-class-meta">

            {
              hiloActual
                .clase
                .tema && (
                <span>
                  {
                    hiloActual
                      .clase
                      .tema
                  }
                </span>
              )
            }


            {
              hiloActual
                .clase
                .docente && (
                <span>
                  {
                    hiloActual
                      .clase
                      .docente
                  }
                </span>
              )
            }

          </div>

        </div>


        <div className="console-status">

          <span
            className={
              `status-pill audio-${estadoGrabacion}`
            }
          >
            {
              textoEstadoGrabacion[
                estadoGrabacion
              ] ||
              estadoGrabacion
            }
          </span>


          <span
            className={
              `status-pill transcription-${estadoTranscripcion}`
            }
          >
            {
              textoEstadoTranscripcion[
                estadoTranscripcion
              ] ||
              estadoTranscripcion
            }
          </span>

        </div>


        <button
          type="button"
          className="console-finish"
          onClick={
            terminarClase
          }
          disabled={
            finalizando
          }
        >
          {
            finalizando
              ? "Finalizando..."
              : "Finalizar clase"
          }
        </button>

      </header>


      <div className="console-body">

        {/* Panel principal */}

        <main className="console-transcript">

          <div className="console-panel-header">

            <div>

              <span className="console-label">
                TRANSCRIPCIÓN EN VIVO
              </span>


              <h2>
                Seguí la clase
              </h2>

            </div>


            {
              (
                estadoGrabacion ===
                  "grabando" ||
                estadoGrabacion ===
                  "pausado"
              ) && (
                <div className="console-audio-controls">

                  {
                    estadoGrabacion ===
                      "grabando" ? (
                      <button
                        type="button"
                        onClick={
                          pausarAudio
                        }
                      >
                        ⏸ Pausar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={
                          reanudarAudio
                        }
                      >
                        ▶ Reanudar
                      </button>
                    )
                  }


                  <button
                    type="button"
                    onClick={
                      detenerAudio
                    }
                  >
                    ■ Detener
                  </button>

                </div>
              )
            }

          </div>


          {/* Inicio del audio */}

          {
            estadoGrabacion ===
              "inactivo" && (
              <div className="console-source">

                <div className="console-source-text">

                  <strong>
                    Iniciar audio
                  </strong>


                  <span>
                    Elegí de dónde viene la clase.
                  </span>

                </div>


                <button
                  type="button"
                  className="source-button"
                  onClick={
                    iniciarComputadora
                  }
                >

                  <span>
                    💻
                  </span>


                  <div>

                    <strong>
                      Computadora
                    </strong>

                    <small>
                      Zoom · Meet · YouTube
                    </small>

                  </div>

                </button>


                <button
                  type="button"
                  className="source-button"
                  onClick={
                    iniciarMicrofono
                  }
                >

                  <span>
                    🎙️
                  </span>


                  <div>

                    <strong>
                      Micrófono
                    </strong>

                    <small>
                      Clase presencial
                    </small>

                  </div>

                </button>

              </div>
            )
          }


          {
            estadoGrabacion ===
              "solicitando" && (
              <div className="console-notice">
                💻 Elegí la pestaña o pantalla
                y activá <strong>Compartir audio</strong>.
              </div>
            )
          }


          {
            (
              estadoGrabacion ===
                "grabando" ||
              estadoGrabacion ===
                "pausado"
            ) && (
              <div className="console-capture">

                <span>
                  {
                    fuenteAudio ===
                      "computadora"
                      ? "💻"
                      : "🎙️"
                  }
                </span>


                <strong>
                  {
                    estadoGrabacion ===
                      "pausado"
                      ? "Clase pausada"
                      : fuenteAudio ===
                          "computadora"
                        ? "Escuchando computadora"
                        : "Escuchando micrófono"
                  }
                </strong>


                <span>
                  {
                    estadoGrabacion ===
                      "pausado"
                      ? "Audio y transcripción pausados"
                      : "Grabación local activa"
                  }
                </span>

              </div>
            )
          }


          {
            estadoGrabacion ===
              "finalizado" && (
              <div className="console-success">
                ✓ Audio guardado.
              </div>
            )
          }


          {
            errorAudio && (
              <div className="console-error">
                {errorAudio}
              </div>
            )
          }


          {
            errorTranscripcion && (
              <div className="console-error">
                {errorTranscripcion}
                {" "}
                El audio continúa guardándose.
              </div>
            )
          }


          {/* Texto */}

          <div className="console-transcript-scroll">

            {
              hiloActual
                .transcripcion
                .length === 0 &&
              !textoParcial ? (
                <div className="console-empty">

                  <div className="console-empty-icon">
                    ≋
                  </div>


                  <strong>
                    Transcripción preparada
                  </strong>


                  <span>
                    El texto aparecerá acá
                    cuando comience la clase.
                  </span>

                </div>
              ) : (
                <>
                  {
                    hiloActual
                      .transcripcion
                      .map(
                        (
                          bloque,
                          index
                        ) => {
                          const tiempoBloque =
                            Number(
                              bloque.tiempo
                            );

                          const tiempoSiguiente =
                            Number(
                              hiloActual
                                .transcripcion[
                                  index + 1
                                ]?.tiempo
                            );

                          const marcas =
                            (
                              hiloActual
                                .noEntendi ||
                              []
                            ).filter(
                              (momento) => {
                                const tiempoMarca =
                                  Number(
                                    momento.tiempoSegundos ??
                                    momento.tiempo
                                  );

                                if (
                                  !Number.isFinite(
                                    tiempoMarca
                                  ) ||
                                  !Number.isFinite(
                                    tiempoBloque
                                  )
                                ) {
                                  return false;
                                }

                                if (
                                  Number.isFinite(
                                    tiempoSiguiente
                                  )
                                ) {
                                  return (
                                    tiempoMarca >=
                                      tiempoBloque &&
                                    tiempoMarca <
                                      tiempoSiguiente
                                  );
                                }

                                return (
                                  tiempoMarca >=
                                  tiempoBloque
                                );
                              }
                            );

                          return (
                            <div
                              key={
                                bloque.id ||
                                `transcripcion-${index}`
                              }
                            >
                              <article className="console-transcript-row">

                                <time>
                                  {
                                    bloque.tiempoTexto ||
                                    bloque.hora ||
                                    "00:00"
                                  }
                                </time>

                                <p>
                                  {
                                    bloque.texto
                                  }
                                </p>

                              </article>

                              {
                                marcas.map(
                                  (
                                    momento,
                                    marcaIndex
                                  ) => (
                                    <div
                                      className="console-lost-marker"
                                      key={
                                        momento.id ||
                                        `no-entendi-${index}-${marcaIndex}`
                                      }
                                    >
                                      <span>
                                        🧵 No entendí
                                      </span>

                                      <time>
                                        {
                                          momento.tiempoTexto ||
                                          ""
                                        }
                                      </time>
                                    </div>
                                  )
                                )
                              }
                            </div>
                          );
                        }
                      )
                  }


                  {
                    textoParcial && (
                      <article className="console-transcript-row partial">

                        <time>
                          •••
                        </time>


                        <p>
                          {
                            textoParcial
                          }
                        </p>

                      </article>
                    )
                  }

                </>
              )
            }

          </div>

        </main>


        {/* Controlador Hilo */}

        <aside className="hilo-controller">

          <div className="controller-heading">

            <div>

              <span className="console-label">
                CONTROLADOR HILO
              </span>


              <h2>
                Herramientas
              </h2>

            </div>


            <span className="controller-online">
              ● listo
            </span>

          </div>


          {/* Perdí el hilo */}

          <section className="controller-module lost-module">

            <div className="controller-module-heading">

              <span className="controller-icon">
                🧵
              </span>

              <div>

                <strong>
                  Perdí el hilo
                </strong>

                <small>
                  Guarda el último minuto
                </small>

              </div>

            </div>


            <button
              type="button"
              className="controller-primary"
              onClick={
                marcarNoEntendi
              }
            >
              No entendí
            </button>


            {
              mensajeNoEntendi && (
                <span className="controller-feedback">
                  {mensajeNoEntendi}
                </span>
              )
            }

          </section>


          {/* Pregunta */}

          <section className="controller-module question-module">

            <div className="controller-module-heading">

              <span className="controller-icon">
                💬
              </span>


              <div>

                <strong>
                  Preguntar al docente
                </strong>

                <small>
                  Hilo mejora tu pregunta
                </small>

              </div>

            </div>


            <textarea
              value={
                duda
              }
              onChange={
                (event) => {
                  setDuda(
                    event.target.value
                  );


                  setPreguntaSugerida(
                    ""
                  );

                  setErrorPregunta(
                    ""
                  );
                }
              }
              placeholder="Escribí tu duda..."
            />


            <button
              type="button"
              className="controller-secondary"
              onClick={
                prepararPregunta
              }
              disabled={
                mejorandoPregunta ||
                !duda.trim()
              }
            >
              {
                mejorandoPregunta
                  ? "Mejorando pregunta..."
                  : "Mejorar pregunta"
              }
            </button>


            {
              errorPregunta && (
                <div className="controller-question-error">
                  {errorPregunta}
                </div>
              )
            }

            {
              preguntaSugerida && (
                <div className="controller-question-result">

                  <span>
                    PREGUNTA SUGERIDA
                  </span>


                  <p>
                    {
                      preguntaSugerida
                    }
                  </p>

                </div>
              )
            }

          </section>


          {/* Importante */}

          <section className="controller-module important-module">

            <div className="controller-module-heading">

              <span className="controller-icon">
                📌
              </span>


              <div>

                <strong>
                  Momento importante
                </strong>

                <small>
                  Guarda este punto
                </small>

              </div>

            </div>


            <button
              type="button"
              className="controller-secondary"
              onClick={
                marcarImportante
              }
            >
              Marcar importante
            </button>

          </section>


          {/* Nota */}

          <section className="controller-module note-module">

            <div className="controller-module-heading">

              <span className="controller-icon">
                📝
              </span>


              <div>

                <strong>
                  Nota rápida
                </strong>

                <small>
                  Algo que quieras recordar
                </small>

              </div>

            </div>


            <textarea
              value={
                nota
              }
              onChange={
                (event) =>
                  setNota(
                    event.target.value
                  )
              }
              placeholder="Escribí una nota..."
            />


            <button
              type="button"
              className="controller-secondary"
              onClick={
                guardarNota
              }
            >
              Guardar nota
            </button>

          </section>

        </aside>

      </div>


    </section>
  );
};


export default Clase;