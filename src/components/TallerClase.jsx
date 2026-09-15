import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  construirPromptEstudio,
} from "../utils/promptBuilder.js";

import "../styles/taller.css";


const TallerClase = ({
  clase,
  modoHistorico = false,
}) => {
  const navigate =
    useNavigate();


  const [
    audioUrl,
    setAudioUrl,
  ] = useState(
    clase?.audio?.url || null
  );


  useEffect(() => {
    const blob =
      clase?.audio?.blob;

    if (
      blob instanceof Blob
    ) {
      const nuevaUrl =
        URL.createObjectURL(blob);

      setAudioUrl(nuevaUrl);

      return () => {
        URL.revokeObjectURL(
          nuevaUrl
        );
      };
    }

    setAudioUrl(
      clase?.audio?.url || null
    );

    return undefined;
  }, [clase]);


  const hiloActual =
    useMemo(() => ({
      ...(clase || {}),
      clase:
        clase?.clase || {
          nombre: "",
          tema: "",
          docente: "",
        },
      transcripcion:
        clase?.transcripcion || [],
      notas:
        clase?.notas || [],
      preguntas:
        clase?.preguntas || [],
      importantes:
        clase?.importantes || [],
      noEntendi:
        clase?.noEntendi || [],
      branches:
        clase?.branches || [],
      audio:
        clase?.audio
          ? {
              ...clase.audio,
              url: audioUrl,
            }
          : null,
    }), [clase, audioUrl]);


  const [
    promptEstudio,
    setPromptEstudio,
  ] = useState("");


  const [
    copiado,
    setCopiado,
  ] = useState(false);


  const [
    momentoAbierto,
    setMomentoAbierto,
  ] = useState(null);


  const noHayClase =
    !hiloActual.clase.nombre ||
    hiloActual.estado ===
      "nuevo";


  // Momentos de la clase

  const momentos =
    useMemo(() => {
      const notas =
        (
          hiloActual.notas ||
          []
        ).map(
          (
            item,
            index
          ) => ({
            ...item,

            id:
              item.id ||
              `nota-${index}`,

            tipo:
              "nota",

            icono:
              "📝",

            etiqueta:
              "Nota",

            tiempoSegundos:
              item.tiempoSegundos ??
              0,
          })
        );


      const importantes =
        (
          hiloActual.importantes ||
          []
        ).map(
          (
            item,
            index
          ) => ({
            ...item,

            id:
              item.id ||
              `importante-${index}`,

            tipo:
              "importante",

            icono:
              "📌",

            etiqueta:
              "Importante",

            tiempoSegundos:
              item.tiempoSegundos ??
              0,
          })
        );


      const perdidos =
        (
          hiloActual.noEntendi ||
          []
        ).map(
          (
            item,
            index
          ) => ({
            ...item,

            id:
              item.id ||
              `no-entendi-${index}`,

            tipo:
              "noEntendi",

            icono:
              "🧵",

            etiqueta:
              "Perdiste el hilo",

            tiempoSegundos:
              item.tiempoSegundos ??
              0,
          })
        );


      const branches =
        (
          hiloActual.branches ||
          []
        ).map(
          (
            item,
            index
          ) => {
            const fragmentos =
              item.transcripcion ||
              [];

            const textoBranch =
              fragmentos
                .map(
                  (bloque) => {
                    const tiempo =
                      bloque.tiempoTexto ||
                      bloque.hora ||
                      "";

                    const texto =
                      bloque.texto ||
                      bloque.text ||
                      "";

                    return tiempo
                      ? `[${tiempo}] ${texto}`
                      : texto;
                  }
                )
                .filter(Boolean)
                .join("\n\n");

            return {
              ...item,

              id:
                item.id ||
                `branch-${index}`,

              tipo:
                "branch",

              icono:
                "🌿",

              etiqueta:
                item.nombre ||
                "Branch de foco",

              tiempoSegundos:
                item.inicioSegundos ??
                0,

              tiempoTexto:
                item.inicioTexto ||
                "",

              texto:
                textoBranch ||
                "Este branch no tiene transcripción guardada.",

              cantidadFragmentos:
                fragmentos.length,
            };
          }
        );


      return [
        ...notas,
        ...importantes,
        ...perdidos,
        ...branches,
      ].sort(
        (
          a,
          b
        ) =>
          (
            a.tiempoSegundos ||
            0
          ) -
          (
            b.tiempoSegundos ||
            0
          )
      );

    }, [
      hiloActual.notas,
      hiloActual.importantes,
      hiloActual.noEntendi,
      hiloActual.branches,
    ]);


  // Preview corto

  const crearPreview =
    (
      texto,
      maximo = 150
    ) => {
      if (!texto) {
        return (
          "Sin contexto disponible."
        );
      }


      const limpio =
        texto
          .replace(
            /\[\d{2}:\d{2}(?::\d{2})?\]\s*/g,
            ""
          )
          .replace(
            /\s+/g,
            " "
          )
          .trim();


      if (
        limpio.length <=
        maximo
      ) {
        return limpio;
      }


      return (
        `${limpio
          .slice(
            0,
            maximo
          )
          .trim()}…`
      );
    };


  // Preparar sesión de estudio

  const prepararSesion =
    () => {
      const prompt =
        construirPromptEstudio({
          hiloActual,
        });


      setPromptEstudio(
        prompt
      );


      setCopiado(
        false
      );


      window.setTimeout(
        () => {
          document
            .getElementById(
              "sesion-estudio"
            )
            ?.scrollIntoView({
              behavior:
                "smooth",

              block:
                "start",
            });
        },
        50
      );
    };


  // Copiar contexto

  const copiarPrompt =
    async () => {
      if (!promptEstudio) {
        return;
      }


      try {
        await navigator
          .clipboard
          .writeText(
            promptEstudio
          );


        setCopiado(
          true
        );


        window.setTimeout(
          () => {
            setCopiado(
              false
            );
          },
          2000
        );

      } catch (error) {
        console.error(
          "No se pudo copiar el contexto:",
          error
        );
      }
    };


  // Continuar en ChatGPT

  const continuarEnChatGPT =
    async () => {
      if (!promptEstudio) {
        return;
      }


      try {
        await navigator
          .clipboard
          .writeText(
            promptEstudio
          );


        setCopiado(
          true
        );


        window.open(
          "https://chatgpt.com/",
          "_blank",
          "noopener,noreferrer"
        );


        window.setTimeout(
          () => {
            setCopiado(
              false
            );
          },
          2500
        );

      } catch (error) {
        console.error(
          "No se pudo preparar ChatGPT:",
          error
        );
      }
    };


  // Descargar transcripción

  const descargarTranscripcion =
    () => {
      if (
        hiloActual
          .transcripcion
          .length === 0
      ) {
        return;
      }


      const texto =
        hiloActual
          .transcripcion
          .map(
            (item) => {
              const tiempo =
                item.tiempoTexto ||
                item.hora ||
                "00:00";


              return (
                `[${tiempo}] ${item.texto}`
              );
            }
          )
          .join(
            "\n\n"
          );


      const encabezado =
        [
          hiloActual
            .clase
            .nombre,

          hiloActual
            .clase
            .tema,

          hiloActual
            .clase
            .docente
            ? `Docente: ${
                hiloActual
                  .clase
                  .docente
              }`
            : "",
        ]
          .filter(Boolean)
          .join("\n");


      const contenido =
        `${encabezado}\n\n${texto}`;


      const blob =
        new Blob(
          [
            contenido,
          ],
          {
            type:
              "text/plain;charset=utf-8",
          }
        );


      const url =
        URL.createObjectURL(
          blob
        );


      const enlace =
        document
          .createElement(
            "a"
          );


      enlace.href =
        url;


      enlace.download =
        `${
          hiloActual
            .clase
            .nombre
            .replace(
              /[^a-z0-9áéíóúñü]+/gi,
              "-"
            )
            .toLowerCase()
        }-transcripcion.txt`;


      enlace.click();


      URL.revokeObjectURL(
        url
      );
    };


  // Descargar audio

  const descargarAudio =
    () => {
      const url =
        hiloActual
          .audio
          ?.url;


      if (!url) {
        return;
      }


      const enlace =
        document
          .createElement(
            "a"
          );


      enlace.href =
        url;


      enlace.download =
        `${
          hiloActual
            .clase
            .nombre
            .replace(
              /[^a-z0-9áéíóúñü]+/gi,
              "-"
            )
            .toLowerCase()
        }-audio.webm`;


      enlace.click();
    };


  // Sin clase

  if (noHayClase) {
    return (
      <section className="workshop-empty">

        <span className="home-eyebrow">
          TALLER
        </span>


        <h1>
          Todavía no hay una clase para repasar.
        </h1>


        <p>
          Cuando termines una clase,
          Hilo va a dejar acá la
          transcripción, el audio,
          tus notas y los momentos
          que marcaste.
        </p>


        <button
          className="btn btn-primary"
          onClick={() =>
            navigate(
              "/clase"
            )
          }
        >
          Empezar una clase
        </button>

      </section>
    );
  }


  return (
    <section className="workshop-page">

      {/* Encabezado */}

      <header className="workshop-header">

        <div>

          <span className="home-eyebrow">
            {modoHistorico
              ? "MIS APUNTES"
              : "TALLER"}
          </span>


          <h1>
            {
              hiloActual
                .clase
                .nombre
            }
          </h1>


          {
            hiloActual
              .clase
              .tema && (
              <h2 className="workshop-topic">
                {
                  hiloActual
                    .clase
                    .tema
                }
              </h2>
            )
          }


          {
            hiloActual
              .clase
              .docente && (
              <p className="workshop-teacher">
                Docente:{" "}
                {
                  hiloActual
                    .clase
                    .docente
                }
              </p>
            )
          }


          <p className="workshop-description">
            Tu clase quedó organizada.
            Volvé a escucharla, recorré
            la transcripción y revisá
            los momentos que marcaste.
          </p>

        </div>


        <button
          className={
            modoHistorico
              ? "btn btn-secondary"
              : "btn btn-primary"
          }
          onClick={() =>
            navigate(
              modoHistorico
                ? "/apuntes"
                : "/clase"
            )
          }
        >
          {modoHistorico
            ? "← Mis apuntes"
            : "Nueva clase"}
        </button>

      </header>


      {/* Audio */}

      <div className="workshop-overview">

        <section className="workshop-card workshop-audio-card workshop-audio-full">

          <div className="workshop-section-heading">

            <div>

              <span className="panel-label">
                AUDIO DE LA CLASE
              </span>


              <h2>
                Volvé a escuchar
              </h2>

            </div>


            {
              hiloActual
                .audio
                ?.url && (
                <button
                  type="button"
                  className="text-button"
                  onClick={
                    descargarAudio
                  }
                >
                  Descargar
                </button>
              )
            }

          </div>


          {
            hiloActual
              .audio
              ?.url ? (
              <audio
                className="workshop-audio"
                controls
                src={
                  hiloActual
                    .audio
                    .url
                }
              >
                Tu navegador no puede
                reproducir este audio.
              </audio>
            ) : (
              <p className="workshop-muted">
                No hay audio disponible
                para esta clase.
              </p>
            )
          }

        </section>

      </div>


      {/* Espacio de trabajo */}

      <div className="workshop-content-grid">

        {/* Transcripción */}

        <section className="workshop-card workshop-transcript">

          <div className="workshop-section-heading">

            <div>

              <span className="panel-label">
                TRANSCRIPCIÓN
              </span>


              <h2>
                Lo que pasó en clase
              </h2>

            </div>


            {
              hiloActual
                .transcripcion
                .length > 0 && (
                <button
                  type="button"
                  className="text-button"
                  onClick={
                    descargarTranscripcion
                  }
                >
                  Descargar
                </button>
              )
            }

          </div>


          {
            hiloActual
              .transcripcion
              .length === 0 ? (
              <div className="workshop-empty-content">

                <p>
                  Esta clase no tiene
                  transcripción disponible.
                </p>

              </div>
            ) : (
              <div className="workshop-transcript-list">

                {
                  hiloActual
                    .transcripcion
                    .map(
                      (
                        item,
                        index
                      ) => (
                        <div
                          className="workshop-transcript-item"
                          key={
                            item.id ||
                            `transcript-${index}`
                          }
                        >

                          <span className="workshop-transcript-time">
                            {
                              item.tiempoTexto ||
                              item.hora ||
                              "00:00"
                            }
                          </span>


                          <p>
                            {
                              item.texto
                            }
                          </p>

                        </div>
                      )
                    )
                }

              </div>
            )
          }

        </section>


        {/* Momentos */}

        <aside className="workshop-moments-column">

          <section className="workshop-card workshop-moments">

            <span className="panel-label">
              MOMENTOS DE LA CLASE
            </span>


            <h2>
              Lo que quisiste guardar
            </h2>


            {
              momentos.length ===
                0 ? (
                <p className="workshop-muted">
                  No marcaste ningún
                  momento durante esta clase.
                </p>
              ) : (
                <div className="moments-list">

                  {
                    momentos.map(
                      (item) => (
                        <article
                          className={
                            `moment-card moment-${item.tipo}`
                          }
                          key={
                            item.id
                          }
                        >

                          <div className="moment-header">

                            <span className="moment-icon">
                              {
                                item.icono
                              }
                            </span>


                            <div>

                              <strong>
                                {
                                  item.etiqueta
                                }
                              </strong>


                              {
                                (
                                  item.tiempoTexto ||
                                  item.hora
                                ) && (
                                  <span>
                                    {
                                      item.tiempoTexto ||
                                      item.hora
                                    }
                                  </span>
                                )
                              }

                            </div>

                          </div>


                          {
                            item.tipo ===
                              "branch" ? (
                              <p>
                                {
                                  item.inicioTexto ||
                                  "Inicio"
                                }
                                {" → "}
                                {
                                  item.finTexto ||
                                  (
                                    item.abierto
                                      ? "en curso"
                                      : "fin"
                                  )
                                }
                                {" · "}
                                {
                                  item.cantidadFragmentos ||
                                  0
                                }
                                {" "}
                                {
                                  item.cantidadFragmentos === 1
                                    ? "fragmento"
                                    : "fragmentos"
                                }
                              </p>
                            ) : (
                              <p>
                                {
                                  crearPreview(
                                    item.texto
                                  )
                                }
                              </p>
                            )
                          }


                          {
                            item.tipo !==
                              "nota" && (
                              <button
                                type="button"
                                className="moment-open"
                                onClick={() =>
                                  setMomentoAbierto(
                                    item
                                  )
                                }
                              >
                                {
                                  item.tipo ===
                                    "branch"
                                    ? "Ver branch"
                                    : "Ver contexto"
                                }
                              </button>
                            )
                          }

                        </article>
                      )
                    )
                  }

                </div>
              )
            }

          </section>


          {/* Continuar estudiando */}

          <section className="workshop-card continue-card">

            <span className="panel-label">
              CONTINUAR ESTUDIANDO
            </span>


            <h2>
              Llevar esta clase a ChatGPT
            </h2>


            <p>
              Hilo reúne la transcripción,
              tus notas y los momentos
              importantes para que puedas
              seguir estudiando.
            </p>


            <button
              type="button"
              className="btn btn-primary full-width"
              onClick={
                prepararSesion
              }
            >
              Preparar sesión
            </button>

          </section>

        </aside>

      </div>


      {/* Sesión preparada */}

      {
        promptEstudio && (
          <section
            id="sesion-estudio"
            className="workshop-card study-session-card"
          >

            <div className="workshop-section-heading">

              <div>

                <span className="panel-label">
                  SESIÓN PREPARADA
                </span>


                <h2>
                  Continuá estudiando
                </h2>

              </div>

            </div>


            <p className="study-session-description">
              Hilo preparó el contexto
              de esta clase. Al continuar,
              se copia automáticamente para
              que puedas pegarlo en tu
              conversación de estudio.
            </p>


            <div className="study-context-preview">
              {promptEstudio}
            </div>


            <div className="study-session-actions">

              <button
                type="button"
                className="btn btn-primary"
                onClick={
                  continuarEnChatGPT
                }
              >
                Seguir estudiando en ChatGPT ↗
              </button>


              <button
                type="button"
                className="btn btn-secondary"
                onClick={
                  copiarPrompt
                }
              >
                {
                  copiado
                    ? "Contexto copiado ✓"
                    : "Copiar contexto"
                }
              </button>

            </div>

          </section>
        )
      }


      {/* Modal de contexto */}

      {
        momentoAbierto && (
          <div className="workshop-modal-backdrop">

            <div className="workshop-modal">

              <button
                type="button"
                className="workshop-modal-close"
                onClick={() =>
                  setMomentoAbierto(
                    null
                  )
                }
                aria-label="Cerrar"
              >
                ×
              </button>


              <span className="panel-label">
                {
                  momentoAbierto
                    .icono
                }
                {" "}
                {
                  momentoAbierto
                    .etiqueta
                    .toUpperCase()
                }
              </span>


              <h2>
                {
                  momentoAbierto.tipo ===
                    "branch"
                    ? momentoAbierto.etiqueta
                    : (
                        momentoAbierto
                          .tiempoTexto ||
                        momentoAbierto
                          .hora ||
                        "Momento de la clase"
                      )
                }
              </h2>


              <p className="workshop-modal-intro">
                {
                  momentoAbierto
                    .tipo ===
                    "branch"
                    ? `Branch capturado desde ${momentoAbierto.inicioTexto || "el inicio"} hasta ${momentoAbierto.finTexto || (momentoAbierto.abierto ? "ahora" : "el cierre")}. Contiene ${momentoAbierto.cantidadFragmentos || 0} fragmentos de transcripción.`
                    : momentoAbierto
                        .tipo ===
                        "noEntendi"
                      ? "Este es el contexto que Hilo guardó cuando perdiste el hilo."
                      : "Este es el fragmento que estaba explicándose cuando lo marcaste como importante."
                }
              </p>


              <div className="workshop-context-text">
                {
                  momentoAbierto
                    .texto ||
                  "No hay contexto disponible."
                }
              </div>

            </div>

          </div>
        )
      }

    </section>
  );
};


export default TallerClase;