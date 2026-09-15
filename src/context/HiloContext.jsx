import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  guardarClaseLocal,
  obtenerClaseLocal,
  borrarChunksAudio,
  obtenerChunksAudio,
} from "../utils/hiloStorage.js";

import {
  crearBloqueTranscripcion,
  crearContextoReciente,
  crearFragmentoImportante,
} from "../utils/transcriptUtils.js";

import {
  formatearTiempo,
} from "../utils/timeUtils.js";

import {
  relojClase,
} from "../services/classClock.js";


const HiloContext =
  createContext();


const crearId = () => {
  if (
    typeof crypto !== "undefined" &&
    crypto.randomUUID
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
};


const estadoInicial = {
  estado: "nuevo",

  iniciadaEn: null,
  finalizadaEn: null,
  duracionSegundos: 0,

  reloj: null,

  clase: {
    nombre: "",
    tema: "",
    docente: "",
  },

  transcripcion: [],

  notas: [],
  preguntas: [],
  importantes: [],
  noEntendi: [],

  audio: null,
};


export const HiloProvider = ({
  children,
}) => {
  const [
    hiloActual,
    setHiloActual,
  ] = useState(
    estadoInicial
  );

  const [
    cargandoHilo,
    setCargandoHilo,
  ] = useState(true);


  // Recuperar clase

  useEffect(() => {
    const recuperarClase =
      async () => {
        try {
          const claseGuardada =
            await obtenerClaseLocal();

          const chunksGuardados =
            await obtenerChunksAudio();


          if (!claseGuardada) {
            relojClase.reiniciar();

            return;
          }


          let claseRecuperada = {
            ...estadoInicial,
            ...claseGuardada,

            clase: {
              ...estadoInicial.clase,
              ...claseGuardada.clase,
            },

            transcripcion:
              claseGuardada
                .transcripcion ||
              [],

            notas:
              claseGuardada.notas ||
              [],

            preguntas:
              claseGuardada
                .preguntas ||
              [],

            importantes:
              claseGuardada
                .importantes ||
              [],

            noEntendi:
              claseGuardada
                .noEntendi ||
              [],
          };


          if (
            claseGuardada.reloj
          ) {
            relojClase.restaurar(
              claseGuardada.reloj
            );
          } else {
            relojClase.reiniciar();
          }


          // Recuperar audio terminado

          if (
            claseGuardada.audio
              ?.blob &&
            claseGuardada.audio
              .blob.size > 0
          ) {
            const url =
              URL.createObjectURL(
                claseGuardada
                  .audio.blob
              );


            claseRecuperada = {
              ...claseRecuperada,

              audio: {
                ...claseGuardada.audio,
                url,
              },
            };
          }

          // Recuperar audio desde chunks

          else if (
            chunksGuardados.length >
            0
          ) {
            const blobs =
              chunksGuardados
                .sort(
                  (
                    a,
                    b
                  ) =>
                    a.createdAt -
                    b.createdAt
                )
                .map(
                  (item) =>
                    item.blob
                )
                .filter(Boolean);


            if (
              blobs.length > 0
            ) {
              const tipo =
                blobs[0].type ||
                "audio/webm";


              const audioRecuperado =
                new Blob(
                  blobs,
                  {
                    type: tipo,
                  }
                );


              const url =
                URL.createObjectURL(
                  audioRecuperado
                );


              claseRecuperada = {
                ...claseRecuperada,

                audio: {
                  blob:
                    audioRecuperado,

                  url,

                  tipo,

                  tamaño:
                    audioRecuperado
                      .size,

                  recuperado:
                    true,
                },
              };
            }
          }


          setHiloActual(
            claseRecuperada
          );

        } catch (error) {
          console.error(
            "No se pudo recuperar la clase:",
            error
          );
        } finally {
          setCargandoHilo(
            false
          );
        }
      };


    recuperarClase();
  }, []);


  // Guardar cambios

  useEffect(() => {
    if (cargandoHilo) {
      return;
    }


    const guardar =
      async () => {
        try {
          await guardarClaseLocal({
            ...hiloActual,

            reloj:
              relojClase
                .obtenerSnapshot(),
          });
        } catch (error) {
          console.error(
            "No se pudo guardar la clase localmente:",
            error
          );
        }
      };


    guardar();

  }, [
    hiloActual,
    cargandoHilo,
  ]);


  // Obtener tiempo actual

  const obtenerTiempoActual =
    () => {
      return relojClase
        .obtenerTiempoRedondeado();
    };


  // Nueva clase

  const iniciarNuevaClase =
    (datosClase) => {
      if (
        hiloActual.audio?.url
      ) {
        try {
          URL.revokeObjectURL(
            hiloActual.audio.url
          );
        } catch (error) {
          console.warn(
            "No se pudo liberar el audio anterior:",
            error
          );
        }
      }


      borrarChunksAudio()
        .catch(
          (error) => {
            console.error(
              "No se pudieron borrar los chunks anteriores:",
              error
            );
          }
        );


      relojClase.iniciar();


      const ahora =
        new Date()
          .toISOString();


      setHiloActual({
        estado:
          "enClase",

        iniciadaEn:
          ahora,

        finalizadaEn:
          null,

        duracionSegundos:
          0,

        reloj:
          relojClase
            .obtenerSnapshot(),

        clase: {
          nombre:
            datosClase.nombre ||
            "",

          tema:
            datosClase.tema ||
            "",

          docente:
            datosClase.docente ||
            "",
        },

        transcripcion: [],

        notas: [],
        preguntas: [],
        importantes: [],
        noEntendi: [],

        audio:
          null,
      });
    };


  // Pausar reloj

  const pausarRelojClase =
    () => {
      relojClase.pausar();


      setHiloActual(
        (prev) => ({
          ...prev,

          reloj:
            relojClase
              .obtenerSnapshot(),
        })
      );
    };


  // Reanudar reloj

  const reanudarRelojClase =
    () => {
      relojClase.reanudar();


      setHiloActual(
        (prev) => ({
          ...prev,

          reloj:
            relojClase
              .obtenerSnapshot(),
        })
      );
    };


  // Finalizar clase

  const finalizarClase =
    () => {
      const duracion =
        relojClase.finalizar();


      setHiloActual(
        (prev) => ({
          ...prev,

          estado:
            "taller",

          finalizadaEn:
            new Date()
              .toISOString(),

          duracionSegundos:
            duracion,

          reloj:
            relojClase
              .obtenerSnapshot(),
        })
      );
    };


  // Guardar audio

  const guardarAudio =
    (blob) => {
      if (
        !blob ||
        blob.size === 0
      ) {
        return;
      }


      const url =
        URL.createObjectURL(
          blob
        );


      setHiloActual(
        (prev) => {
          if (
            prev.audio?.url
          ) {
            try {
              URL.revokeObjectURL(
                prev.audio.url
              );
            } catch (error) {
              console.warn(
                "No se pudo liberar la URL anterior:",
                error
              );
            }
          }


          return {
            ...prev,

            audio: {
              blob,

              url,

              tipo:
                blob.type ||
                "audio/webm",

              tamaño:
                blob.size,

              recuperado:
                false,
            },
          };
        }
      );
    };


  // Agregar transcripción final

  const agregarTranscripcion =
    (
      texto,
      tiempoPersonalizado
    ) => {
      if (!texto?.trim()) {
        return;
      }


      const tiempo =
        tiempoPersonalizado ??
        obtenerTiempoActual();


      const bloque =
        crearBloqueTranscripcion({
          texto,

          tiempoSegundos:
            tiempo,

          fecha:
            new Date()
              .toISOString(),
        });


      if (!bloque) {
        return;
      }


      const bloqueCompatible = {
        ...bloque,

        hora:
          bloque.tiempoTexto,
      };


      setHiloActual(
        (prev) => ({
          ...prev,

          transcripcion: [
            ...prev.transcripcion,
            bloqueCompatible,
          ],

          reloj:
            relojClase
              .obtenerSnapshot(),
        })
      );


      return bloqueCompatible;
    };


  // Nota rápida

  const agregarNota =
    (
      texto,
      tiempoPersonalizado
    ) => {
      if (!texto?.trim()) {
        return;
      }


      const tiempo =
        tiempoPersonalizado ??
        obtenerTiempoActual();


      const nota = {
        id:
          crearId(),

        texto:
          texto.trim(),

        fecha:
          new Date()
            .toISOString(),

        tiempoSegundos:
          tiempo,

        tiempoTexto:
          formatearTiempo(
            tiempo
          ),

        hora:
          formatearTiempo(
            tiempo
          ),
      };


      setHiloActual(
        (prev) => ({
          ...prev,

          notas: [
            ...prev.notas,
            nota,
          ],
        })
      );


      return nota;
    };


  // Pregunta

  const agregarPregunta =
    (
      texto,
      tiempoPersonalizado
    ) => {
      if (!texto?.trim()) {
        return;
      }


      const tiempo =
        tiempoPersonalizado ??
        obtenerTiempoActual();


      const pregunta = {
        id:
          crearId(),

        texto:
          texto.trim(),

        fecha:
          new Date()
            .toISOString(),

        tiempoSegundos:
          tiempo,

        tiempoTexto:
          formatearTiempo(
            tiempo
          ),

        hora:
          formatearTiempo(
            tiempo
          ),
      };


      setHiloActual(
        (prev) => ({
          ...prev,

          preguntas: [
            ...prev.preguntas,
            pregunta,
          ],
        })
      );


      return pregunta;
    };


  // Momento importante

  const agregarImportante =
    (
      tiempoPersonalizado
    ) => {
      const tiempo =
        tiempoPersonalizado ??
        obtenerTiempoActual();


      let importanteCreado =
        null;


      setHiloActual(
        (prev) => {
          const fragmento =
            crearFragmentoImportante({
              transcripcion:
                prev.transcripcion,

              tiempoActual:
                tiempo,
            });


          importanteCreado = {
            id:
              crearId(),

            fecha:
              new Date()
                .toISOString(),

            tiempoSegundos:
              tiempo,

            tiempoTexto:
              formatearTiempo(
                tiempo
              ),

            hora:
              formatearTiempo(
                tiempo
              ),

            texto:
              fragmento.texto ||
              "Momento importante sin transcripción disponible.",

            bloques:
              fragmento.bloques,
          };


          return {
            ...prev,

            importantes: [
              ...prev.importantes,
              importanteCreado,
            ],
          };
        }
      );


      return importanteCreado;
    };


  // Perdí el hilo

  const agregarNoEntendi =
    (
      tiempoPersonalizado
    ) => {
      const tiempo =
        tiempoPersonalizado ??
        obtenerTiempoActual();


      let momentoCreado =
        null;


      setHiloActual(
        (prev) => {
          const contexto =
            crearContextoReciente({
              transcripcion:
                prev.transcripcion,

              tiempoActual:
                tiempo,

              minutos:
                1,
            });


          momentoCreado = {
            id:
              crearId(),

            fecha:
              new Date()
                .toISOString(),

            tiempoSegundos:
              tiempo,

            tiempoTexto:
              formatearTiempo(
                tiempo
              ),

            hora:
              formatearTiempo(
                tiempo
              ),

            texto:
              contexto.texto ||
              "Todavía no había transcripción disponible.",

            contexto,

            bloques:
              contexto.bloques,

            desde:
              contexto.desde,

            hasta:
              contexto.hasta,
          };


          return {
            ...prev,

            noEntendi: [
              ...prev.noEntendi,
              momentoCreado,
            ],
          };
        }
      );


      return momentoCreado;
    };


  return (
    <HiloContext.Provider
      value={{
        hiloActual,
        cargandoHilo,

        iniciarNuevaClase,
        finalizarClase,

        pausarRelojClase,
        reanudarRelojClase,
        obtenerTiempoActual,

        guardarAudio,

        agregarTranscripcion,

        agregarNota,
        agregarPregunta,
        agregarImportante,
        agregarNoEntendi,
      }}
    >
      {children}
    </HiloContext.Provider>
  );
};


export const useHilo =
  () => {
    const context =
      useContext(
        HiloContext
      );


    if (!context) {
      throw new Error(
        "useHilo debe utilizarse dentro de HiloProvider"
      );
    }


    return context;
  };