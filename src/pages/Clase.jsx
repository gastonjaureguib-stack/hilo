import {
  useEffect,
  useRef,
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
    guardarClaseEnApuntes,
    finalizarClase,
    agregarNota,
    agregarImportante,
    agregarNoEntendi,
    abrirBranch,
    cerrarBranch,
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
    mensajeImportante,
    setMensajeImportante,
  ] = useState("");

  const [
    mostrarNoEntendi,
    setMostrarNoEntendi,
  ] = useState(false);

  const [
    mostrarImportantes,
    setMostrarImportantes,
  ] = useState(false);

  const [
    mostrandoCrearBranch,
    setMostrandoCrearBranch,
  ] = useState(false);

  const [
    nombreBranch,
    setNombreBranch,
  ] = useState("");

  const [
    guardandoClase,
    setGuardandoClase,
  ] = useState(false);

  const [
    mensajeGuardado,
    setMensajeGuardado,
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

  const [
    siguiendoVivo,
    setSiguiendoVivo,
  ] = useState(true);

  const transcripcionScrollRef =
    useRef(null);


  const irAlVivo =
    () => {
      const contenedor =
        transcripcionScrollRef.current;

      if (!contenedor) {
        return;
      }

      setSiguiendoVivo(true);

      contenedor.scrollTo({
        top:
          contenedor.scrollHeight,
        behavior: "smooth",
      });
    };


  const controlarScrollTranscripcion =
    () => {
      const contenedor =
        transcripcionScrollRef.current;

      if (!contenedor) {
        return;
      }

      const distanciaAlFinal =
        contenedor.scrollHeight -
        contenedor.scrollTop -
        contenedor.clientHeight;

      const estaCercaDelFinal =
        distanciaAlFinal <= 80;

      setSiguiendoVivo(
        estaCercaDelFinal
      );
    };


  useEffect(() => {
    if (!siguiendoVivo) {
      return;
    }

    const contenedor =
      transcripcionScrollRef.current;

    if (!contenedor) {
      return;
    }

    const frame =
      window.requestAnimationFrame(
        () => {
          contenedor.scrollTop =
            contenedor.scrollHeight;
        }
      );

    return () => {
      window.cancelAnimationFrame(
        frame
      );
    };
  }, [
    hiloActual.transcripcion.length,
    textoParcial,
    siguiendoVivo,
  ]);


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
      const momento =
        agregarImportante();

      setMensajeImportante(
        momento?.tiempoTexto
          ? `✓ Marcado en ${momento.tiempoTexto}`
          : "✓ Momento guardado"
      );

      window.setTimeout(
        () => {
          setMensajeImportante("");
        },
        2200
      );
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

  const branchActivo =
    (hiloActual.branches || [])
      .find(
        (branch) =>
          branch.abierto
      ) || null;


  const confirmarAbrirBranch =
    () => {
      const nombre =
        nombreBranch.trim();

      if (!nombre) {
        return;
      }

      abrirBranch(
        nombre
      );

      setNombreBranch("");
      setMostrandoCrearBranch(
        false
      );
    };


  const finalizarBranch =
    () => {
      cerrarBranch();

      setMostrandoCrearBranch(
        false
      );

      setNombreBranch("");
    };


  const guardarClaseManual =
    async () => {
      if (guardandoClase) {
        return;
      }

      setGuardandoClase(true);
      setMensajeGuardado("");

      try {
        await guardarClaseEnApuntes();

        setMensajeGuardado(
          "✓ Clase guardada"
        );

        window.setTimeout(
          () => {
            setMensajeGuardado("");
          },
          2500
        );
      } catch (error) {
        console.error(
          "No se pudo guardar la clase:",
          error
        );

        setMensajeGuardado(
          "⚠ No se pudo guardar"
        );
      } finally {
        setGuardandoClase(false);
      }
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


        await finalizarClase();


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


        <div className="console-save-group">

          <button
            type="button"
            className="console-finish console-save"
            onClick={
              guardarClaseManual
            }
            disabled={
              guardandoClase ||
              finalizando
            }
          >
            {
              guardandoClase
                ? "Guardando..."
                : "💾 Guardar clase"
            }
          </button>

          {
            mensajeGuardado && (
              <span className="console-save-feedback">
                {mensajeGuardado}
              </span>
            )
          }

          <button
            type="button"
            className="console-finish"
            onClick={
              terminarClase
            }
            disabled={
              finalizando ||
              guardandoClase
            }
          >
            {
              finalizando
                ? "Finalizando..."
                : "Finalizar clase"
            }
          </button>

        </div>

      </header>


      <div className="console-body">

        {/* Panel principal */}

        <main
          className="console-transcript"
          style={{ position: "relative" }}
        >

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

          <div
            className="console-transcript-scroll"
            ref={
              transcripcionScrollRef
            }
            onScroll={
              controlarScrollTranscripcion
            }
          >

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

                          const filtrarMarcasDelBloque =
                            (lista = []) =>
                              lista.filter(
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

                          const marcasNoEntendi =
                            filtrarMarcasDelBloque(
                              hiloActual.noEntendi || []
                            );

                          const marcasImportantes =
                            filtrarMarcasDelBloque(
                              hiloActual.importantes || []
                            );


                          const branches =
                            hiloActual.branches || [];


                          const branchEnBloque =
                            branches.find(
                              (branch) => {
                                const inicio =
                                  Number(
                                    branch.inicioSegundos
                                  );

                                const fin =
                                  branch.abierto
                                    ? Infinity
                                    : Number(
                                        branch.finSegundos
                                      );

                                if (
                                  !Number.isFinite(
                                    inicio
                                  ) ||
                                  !Number.isFinite(
                                    tiempoBloque
                                  )
                                ) {
                                  return false;
                                }

                                const finValido =
                                  Number.isFinite(
                                    fin
                                  )
                                    ? fin
                                    : Infinity;

                                return (
                                  tiempoBloque >=
                                    inicio &&
                                  tiempoBloque <=
                                    finValido
                                );
                              }
                            );


                          const iniciosBranch =
                            branches.filter(
                              (branch) => {
                                const inicio =
                                  Number(
                                    branch.inicioSegundos
                                  );

                                if (
                                  !Number.isFinite(
                                    inicio
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
                                    inicio >=
                                      tiempoBloque &&
                                    inicio <
                                      tiempoSiguiente
                                  );
                                }

                                return (
                                  inicio >=
                                  tiempoBloque
                                );
                              }
                            );


                          const finalesBranch =
                            branches.filter(
                              (branch) => {
                                if (
                                  branch.abierto
                                ) {
                                  return false;
                                }

                                const fin =
                                  Number(
                                    branch.finSegundos
                                  );

                                if (
                                  !Number.isFinite(
                                    fin
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
                                    fin >=
                                      tiempoBloque &&
                                    fin <
                                      tiempoSiguiente
                                  );
                                }

                                return (
                                  fin >=
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
                              <article
                                className="console-transcript-row"
                                style={
                                  branchEnBloque
                                    ? {
                                        borderLeft:
                                          "3px solid #5f8f68",
                                        paddingLeft:
                                          "10px",
                                      }
                                    : undefined
                                }
                              >

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
                                iniciosBranch.map(
                                  (
                                    branch,
                                    branchIndex
                                  ) => (
                                    <div
                                      className="console-lost-marker"
                                      key={
                                        branch.id
                                          ? `branch-inicio-${branch.id}`
                                          : `branch-inicio-${index}-${branchIndex}`
                                      }
                                      style={{
                                        borderLeftColor:
                                          "#5f8f68",
                                      }}
                                    >
                                      <span>
                                        🌿 Branch · {branch.nombre || "Tema de foco"}
                                      </span>

                                      <time>
                                        {branch.inicioTexto || ""}
                                      </time>
                                    </div>
                                  )
                                )
                              }


                              {
                                marcasNoEntendi.map(
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

                              {
                                marcasImportantes.map(
                                  (
                                    momento,
                                    marcaIndex
                                  ) => (
                                    <div
                                      className="console-lost-marker"
                                      key={
                                        momento.id ||
                                        `importante-${index}-${marcaIndex}`
                                      }
                                      style={{
                                        borderLeftColor: "#b98929",
                                      }}
                                    >
                                      <span>
                                        📌 Importante
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


                              {
                                finalesBranch.map(
                                  (
                                    branch,
                                    branchIndex
                                  ) => (
                                    <div
                                      className="console-lost-marker"
                                      key={
                                        branch.id
                                          ? `branch-fin-${branch.id}`
                                          : `branch-fin-${index}-${branchIndex}`
                                      }
                                      style={{
                                        borderLeftColor:
                                          "#5f8f68",
                                        opacity: 0.78,
                                      }}
                                    >
                                      <span>
                                        🌿 Fin branch · {branch.nombre || "Tema de foco"}
                                      </span>

                                      <time>
                                        {branch.finTexto || ""}
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

          {
            !siguiendoVivo &&
            (
              hiloActual.transcripcion.length > 0 ||
              textoParcial
            ) && (
              <button
                type="button"
                onClick={
                  irAlVivo
                }
                aria-label="Volver a la transcripción en vivo"
                style={{
                  position: "absolute",
                  right: "18px",
                  bottom: "18px",
                  zIndex: 5,
                  border: "1px solid rgba(255, 255, 255, 0.16)",
                  borderRadius: "999px",
                  padding: "8px 13px",
                  background: "rgba(18, 24, 33, 0.94)",
                  color: "#ffffff",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.22)",
                  backdropFilter: "blur(8px)",
                }}
              >
                ↓ Volver al vivo
              </button>
            )
          }

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


          <div className="controller-tools-scroll">

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

            {(hiloActual.noEntendi || []).length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setMostrarNoEntendi(
                      (prev) => !prev
                    )
                  }
                  style={{
                    width: "100%",
                    marginTop: "8px",
                    padding: "7px 9px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    border: "1px solid rgba(255,255,255,.09)",
                    borderRadius: "9px",
                    background: "rgba(255,255,255,.035)",
                    color: "inherit",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <span>
                    {(hiloActual.noEntendi || []).length} para revisar
                  </span>
                  <span>
                    {mostrarNoEntendi ? "▲" : "▼"}
                  </span>
                </button>

                {mostrarNoEntendi && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      maxHeight: "145px",
                      overflowY: "auto",
                      marginTop: "7px",
                    }}
                  >
                    {[...(hiloActual.noEntendi || [])]
                      .reverse()
                      .map((momento, index) => (
                        <div
                          key={momento.id || `no-entendi-panel-${index}`}
                          style={{
                            padding: "7px 9px",
                            borderLeft: "3px solid var(--color-primary)",
                            borderRadius: "7px",
                            background: "rgba(255,255,255,.025)",
                          }}
                        >
                          <strong style={{ fontSize: "0.72rem" }}>
                            🧵 {momento.tiempoTexto || "Momento marcado"}
                          </strong>
                          {(momento.contexto || momento.texto) && (
                            <p
                              style={{
                                margin: "4px 0 0",
                                fontSize: "0.7rem",
                                lineHeight: 1.35,
                                opacity: 0.78,
                              }}
                            >
                              {
                                      typeof momento.contexto === "string"
                                        ? momento.contexto
                                        : momento.contexto?.texto ||
                                          momento.texto ||
                                          "Sin contexto disponible."
                                    }
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}

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


            {
              mensajeImportante && (
                <span className="controller-feedback">
                  {mensajeImportante}
                </span>
              )
            }

            {(hiloActual.importantes || []).length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setMostrarImportantes(
                      (prev) => !prev
                    )
                  }
                  style={{
                    width: "100%",
                    marginTop: "8px",
                    padding: "7px 9px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    border: "1px solid rgba(255,255,255,.09)",
                    borderRadius: "9px",
                    background: "rgba(255,255,255,.035)",
                    color: "inherit",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <span>
                    {(hiloActual.importantes || []).length} importantes
                  </span>
                  <span>
                    {mostrarImportantes ? "▲" : "▼"}
                  </span>
                </button>

                {mostrarImportantes && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      maxHeight: "145px",
                      overflowY: "auto",
                      marginTop: "7px",
                    }}
                  >
                    {[...(hiloActual.importantes || [])]
                      .reverse()
                      .map((momento, index) => (
                        <div
                          key={momento.id || `importante-panel-${index}`}
                          style={{
                            padding: "7px 9px",
                            borderLeft: "3px solid #b98929",
                            borderRadius: "7px",
                            background: "rgba(255,255,255,.025)",
                          }}
                        >
                          <strong style={{ fontSize: "0.72rem" }}>
                            📌 {momento.tiempoTexto || "Momento marcado"}
                          </strong>
                          {(momento.contexto || momento.texto) && (
                            <p
                              style={{
                                margin: "4px 0 0",
                                fontSize: "0.7rem",
                                lineHeight: 1.35,
                                opacity: 0.78,
                              }}
                            >
                              {
                                      typeof momento.contexto === "string"
                                        ? momento.contexto
                                        : momento.contexto?.texto ||
                                          momento.texto ||
                                          "Sin contexto disponible."
                                    }
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}

          </section>


          {/* Branch de foco */}

          <section className="controller-module branch-module">

            <div className="controller-module-heading">

              <span className="controller-icon">
                🌿
              </span>

              <div>

                <strong>
                  Branch de foco
                </strong>

                <small>
                  Aislá un tema puntual
                </small>

              </div>

            </div>

            {branchActivo ? (
              <div className="branch-active-box">

                <div className="branch-active-label">
                  ● BRANCH ACTIVO
                </div>

                <strong className="branch-active-name">
                  {branchActivo.nombre}
                </strong>

                <small className="branch-active-meta">
                  desde {branchActivo.inicioTexto || "ahora"} ·{" "}
                  {(branchActivo.transcripcion || []).length} fragmentos
                </small>

                <button
                  type="button"
                  className="controller-secondary"
                  onClick={finalizarBranch}
                >
                  Cerrar branch
                </button>

              </div>
            ) : (
              <button
                type="button"
                className="controller-secondary branch-placeholder-button"
                onClick={() => {
                  setMostrandoCrearBranch(false);
                  setNombreBranch("");
                }}
              >
                🌿 Abrir branch
              </button>
            )}

            {(hiloActual.branches || []).length > 0 && !branchActivo && (
              <small className="branch-saved-count">
                {(hiloActual.branches || []).length}{" "}
                {(hiloActual.branches || []).length === 1
                  ? "branch guardado"
                  : "branches guardados"}
              </small>
            )}

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

          </div>

        </aside>

      </div>


    </section>
  );
};


export default Clase;