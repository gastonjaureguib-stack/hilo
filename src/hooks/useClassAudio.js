
import { useEffect, useRef, useState } from "react";

import {
  capturarMicrofono,
  capturarAudioComputadora,
  escucharFinCaptura,
  detenerStreams,
} from "../audio/audioCapture.js";

import { crearGrabadorAudio } from "../audio/audioRecorder.js";
import { crearSesionTranscripcion } from "../services/transcriptionService.js";
import { guardarChunkAudio } from "../utils/hiloStorage.js";

import { useHilo } from "../context/HiloContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export const useClassAudio = ({ onAudioFinalizado } = {}) => {
  const {
    guardarAudio,
    agregarTranscripcion,
    pausarRelojClase,
    reanudarRelojClase,
  } = useHilo();

  const { user } = useAuth();

  // =======================================================
  // REFERENCIAS
  // =======================================================

  const sourceStreamRef = useRef(null);
  const audioStreamRef = useRef(null);
  const grabadorRef = useRef(null);

  const transcripcionRef = useRef(null);
  const transcripcionPendienteRef = useRef(null);

  const limpiarFinCapturaRef = useRef(null);

  const desmontadoRef = useRef(false);
  const iniciandoRef = useRef(false);
  const sesionIdRef = useRef(0);

  const detencionRef = useRef(null);
  const finalizacionGrabadorRef = useRef(null);
  const chunksPendientesRef = useRef(new Set());

  const accionesRef = useRef(null);

  accionesRef.current = {
    guardarAudio,
    agregarTranscripcion,
    pausarRelojClase,
    reanudarRelojClase,
    onAudioFinalizado,
  };

  // =======================================================
  // ESTADOS
  // =======================================================

  const [estadoGrabacion, setEstadoGrabacion] =
    useState("inactivo");

  const [estadoTranscripcion, setEstadoTranscripcion] =
    useState("inactivo");

  const [fuenteAudio, setFuenteAudio] = useState(null);
  const [textoParcial, setTextoParcial] = useState("");

  const [errorAudio, setErrorAudio] = useState("");
  const [errorTranscripcion, setErrorTranscripcion] =
    useState("");

  // =======================================================
  // ACTUALIZAR ESTADO
  // =======================================================

  const actualizarEstado = (setter, valor) => {
    if (!desmontadoRef.current) {
      setter(valor);
    }
  };

  // =======================================================
  // LIMPIAR STREAMS
  // =======================================================

  const limpiarStreams = () => {
    try {
      limpiarFinCapturaRef.current?.();
    } catch (error) {
      console.error(
        "No se pudo limpiar el evento de captura:",
        error
      );
    }

    limpiarFinCapturaRef.current = null;

    detenerStreams(
      audioStreamRef.current,
      sourceStreamRef.current
    );

    audioStreamRef.current = null;
    sourceStreamRef.current = null;
  };

  // =======================================================
  // DESTRUIR TRANSCRIPCIÓN
  // =======================================================

  const destruirTranscripcion = async (sesion) => {
    if (!sesion) return;

    try {
      await sesion.destruir();
    } catch (error) {
      console.error(
        "No se pudo liberar la transcripción:",
        error
      );
    }
  };

  // =======================================================
  // ESPERAR ESCRITURAS DE AUDIO
  // =======================================================

  const esperarChunksPendientes = async () => {
    while (chunksPendientesRef.current.size > 0) {
      await Promise.allSettled([
        ...chunksPendientesRef.current,
      ]);
    }
  };

  // =======================================================
  // INICIAR GRABADOR LOCAL
  // =======================================================

  const iniciarGrabador = (stream, userId, sesionId) => {
    // Guardamos una promesa que se resolverá cuando
    // MediaRecorder haya generado el archivo final.
    let resolverFinalizacion;

    const promesaFinalizacion = new Promise((resolve) => {
      resolverFinalizacion = resolve;
    });

    finalizacionGrabadorRef.current = {
      sesionId,
      promesa: promesaFinalizacion,
      resolver: resolverFinalizacion,
    };

    const grabador = crearGrabadorAudio({
      stream,

      onChunk: (chunk) => {
        const escritura = guardarChunkAudio(
          chunk,
          userId
        ).catch((error) => {
          console.error(
            "No se pudo guardar un fragmento de audio:",
            error
          );

          actualizarEstado(
            setErrorAudio,
            "Un fragmento de audio no pudo guardarse localmente."
          );
        });

        chunksPendientesRef.current.add(escritura);

        void escritura.finally(() => {
          chunksPendientesRef.current.delete(escritura);
        });
      },

      onFinal: async (blob) => {
        let resultado = {
          blob: blob ?? null,
          error: null,
        };

        try {
          await esperarChunksPendientes();

          // Evitar que una sesión anterior modifique
          // la clase actual.
          if (sesionId === sesionIdRef.current) {
            if (blob?.size > 0) {
              accionesRef.current.guardarAudio(blob);
            }

            actualizarEstado(
              setEstadoGrabacion,
              "finalizado"
            );

            try {
              accionesRef.current.onAudioFinalizado?.(
                blob
              );
            } catch (error) {
              console.error(
                "Error en onAudioFinalizado:",
                error
              );
            }
          }
        } catch (error) {
          console.error(
            "No se pudo finalizar el audio:",
            error
          );

          resultado = {
            blob: null,
            error,
          };
        } finally {
          const finalizacion =
            finalizacionGrabadorRef.current;

          if (finalizacion?.sesionId === sesionId) {
            finalizacion.resolver(resultado);
          }
        }
      },

      onEstado: (estado) => {
        if (sesionId !== sesionIdRef.current) return;

        actualizarEstado(
          setEstadoGrabacion,
          estado
        );
      },

      onError: (error) => {
        console.error(
          "Error de grabación:",
          error
        );

        if (sesionId === sesionIdRef.current) {
          actualizarEstado(
            setErrorAudio,
            error?.message ||
              "Ocurrió un error grabando el audio."
          );

          actualizarEstado(
            setEstadoGrabacion,
            "error"
          );
        }

        const finalizacion =
          finalizacionGrabadorRef.current;

        if (finalizacion?.sesionId === sesionId) {
          finalizacion.resolver({
            blob: null,
            error,
          });
        }
      },
    });

    grabadorRef.current = grabador;

    try {
      grabador.iniciar(1000);
    } catch (error) {
      grabadorRef.current = null;

      finalizacionGrabadorRef.current?.resolver({
        blob: null,
        error,
      });

      finalizacionGrabadorRef.current = null;

      throw error;
    }
  };

  // =======================================================
  // INICIAR TRANSCRIPCIÓN
  // =======================================================

  const iniciarTranscripcion = (stream, sesionId) => {
    actualizarEstado(
      setErrorTranscripcion,
      ""
    );

    actualizarEstado(
      setTextoParcial,
      ""
    );

    const promesa = (async () => {
      try {
        const sesion = await crearSesionTranscripcion({
          stream,

          onParcial: ({ texto }) => {
            if (
              desmontadoRef.current ||
              sesionId !== sesionIdRef.current ||
              detencionRef.current
            ) {
              return;
            }

            actualizarEstado(
              setTextoParcial,
              texto || ""
            );
          },

          onFinal: ({ texto }) => {
            if (
              sesionId !== sesionIdRef.current
            ) {
              return;
            }

            actualizarEstado(
              setTextoParcial,
              ""
            );

            // Los resultados finales también se
            // aceptan durante la detención.
            if (texto?.trim()) {
              accionesRef.current.agregarTranscripcion(
                texto
              );
            }
          },

          onEstado: (estado) => {
            if (
              desmontadoRef.current ||
              sesionId !== sesionIdRef.current
            ) {
              return;
            }

            actualizarEstado(
              setEstadoTranscripcion,
              estado
            );
          },

          onError: (error) => {
            if (
              desmontadoRef.current ||
              sesionId !== sesionIdRef.current
            ) {
              return;
            }

            actualizarEstado(
              setErrorTranscripcion,
              error?.message ||
                "La transcripción dejó de funcionar."
            );
          },
        });

        if (
          desmontadoRef.current ||
          sesionId !== sesionIdRef.current
        ) {
          await destruirTranscripcion(sesion);
          return null;
        }

        transcripcionRef.current = sesion;

        return sesion;
      } catch (error) {
        if (
          !desmontadoRef.current &&
          sesionId === sesionIdRef.current
        ) {
          console.error(
            "No se pudo iniciar la transcripción:",
            error
          );

          actualizarEstado(
            setEstadoTranscripcion,
            "error"
          );

          actualizarEstado(
            setErrorTranscripcion,
            error?.message ||
              "No se pudo iniciar la transcripción."
          );
        }

        return null;
      }
    })();

    transcripcionPendienteRef.current = promesa;

    return promesa;
  };

  // =======================================================
  // INICIAR DESDE STREAM
  // =======================================================

  const iniciarDesdeStream = ({
    sourceStream,
    audioStream,
    fuente,
    userId,
  }) => {
    if (desmontadoRef.current) {
      detenerStreams(
        audioStream,
        sourceStream
      );

      return null;
    }

    const sesionId = ++sesionIdRef.current;

    sourceStreamRef.current = sourceStream;
    audioStreamRef.current = audioStream;

    actualizarEstado(setFuenteAudio, fuente);
    actualizarEstado(setErrorAudio, "");
    actualizarEstado(setErrorTranscripcion, "");
    actualizarEstado(setTextoParcial, "");

    iniciarGrabador(
      audioStream,
      userId,
      sesionId
    );

    // La grabación local no depende de que
    // AssemblyAI consiga conectarse.
    void iniciarTranscripcion(
      audioStream,
      sesionId
    );

    return sesionId;
  };

  // =======================================================
  // INICIAR CAPTURA
  // =======================================================

  const iniciarCaptura = async (tipo) => {
    if (
      desmontadoRef.current ||
      iniciandoRef.current ||
      grabadorRef.current ||
      detencionRef.current
    ) {
      return;
    }

    if (!user?.id) {
      actualizarEstado(
        setErrorAudio,
        "Tenés que iniciar sesión para grabar una clase."
      );

      return;
    }

    iniciandoRef.current = true;

    const userId = user.id;

    actualizarEstado(
      setEstadoGrabacion,
      "solicitando"
    );

    actualizarEstado(setErrorAudio, "");

    let captura = null;

    try {
      captura =
        tipo === "computadora"
          ? await capturarAudioComputadora()
          : await capturarMicrofono();

      if (desmontadoRef.current) {
        detenerStreams(
          captura.audioStream,
          captura.sourceStream
        );

        return;
      }

      const sesionId = iniciarDesdeStream({
        ...captura,
        fuente: tipo,
        userId,
      });

      if (
        tipo === "computadora" &&
        sesionId
      ) {
        limpiarFinCapturaRef.current =
          escucharFinCaptura(
            captura.sourceStream,
            () => {
              void detenerAudio().catch((error) => {
                console.error(
                  "Error al finalizar la captura:",
                  error
                );
              });
            }
          );
      }
    } catch (error) {
      console.error(
        "No se pudo iniciar la captura:",
        error
      );

      limpiarStreams();

      if (captura) {
        detenerStreams(
          captura.audioStream,
          captura.sourceStream
        );
      }

      actualizarEstado(
        setEstadoGrabacion,
        "inactivo"
      );

      actualizarEstado(
        setErrorAudio,
        error?.message ||
          "No se pudo iniciar la captura de audio."
      );
    } finally {
      iniciandoRef.current = false;
    }
  };

  const iniciarMicrofono = () =>
    iniciarCaptura("microfono");

  const iniciarComputadora = () =>
    iniciarCaptura("computadora");

  // =======================================================
  // PAUSAR
  // =======================================================

  const pausarAudio = async () => {
    if (detencionRef.current) return;

    const grabador = grabadorRef.current;

    if (
      !grabador ||
      grabador.obtenerEstadoNativo() !== "recording"
    ) {
      return;
    }

    grabador.pausar();

    accionesRef.current.pausarRelojClase();

    try {
      await transcripcionRef.current?.pausar();
    } catch (error) {
      console.error(
        "No se pudo pausar la transcripción:",
        error
      );

      actualizarEstado(
        setErrorTranscripcion,
        "No se pudo pausar la transcripción."
      );
    }
  };

  // =======================================================
  // REANUDAR
  // =======================================================

  const reanudarAudio = async () => {
    if (detencionRef.current) return;

    const grabador = grabadorRef.current;

    if (
      !grabador ||
      grabador.obtenerEstadoNativo() !== "paused"
    ) {
      return;
    }

    grabador.reanudar();

    accionesRef.current.reanudarRelojClase();

    try {
      await transcripcionRef.current?.reanudar();
    } catch (error) {
      console.error(
        "No se pudo reanudar la transcripción:",
        error
      );

      actualizarEstado(
        setErrorTranscripcion,
        "No se pudo reanudar la transcripción."
      );
    }
  };

  // =======================================================
  // DETENER GRABACIÓN
  // =======================================================

  const detenerAudio = () => {
    // Evitamos ejecutar dos cierres simultáneos.
    if (detencionRef.current) {
      return detencionRef.current;
    }

    if (!grabadorRef.current) {
      return Promise.resolve(null);
    }

    actualizarEstado(
      setEstadoGrabacion,
      "deteniendo"
    );

    actualizarEstado(
      setTextoParcial,
      ""
    );

    const sesionId = sesionIdRef.current;

    const promesa = (async () => {
      const grabador = grabadorRef.current;

      const finalizacion =
        finalizacionGrabadorRef.current;

      // Detenemos primero MediaRecorder para que
      // genere el archivo local cuanto antes.
      if (
        grabador &&
        grabador.obtenerEstadoNativo() !== "inactive"
      ) {
        try {
          grabador.detener();
        } catch (error) {
          console.error(
            "No se pudo detener el grabador:",
            error
          );

          finalizacion?.resolver({
            blob: null,
            error,
          });
        }
      }

      // Esperamos también una conexión AssemblyAI
      // que todavía pueda estar iniciándose.
      let sesion = transcripcionRef.current;

      if (!sesion && transcripcionPendienteRef.current) {
        sesion = await transcripcionPendienteRef.current;
      }

      if (sesion) {
        try {
          const resultado = await sesion.detener();

          if (!resultado?.confirmada) {
            console.warn(
              "La transcripción terminó sin confirmación completa:",
              resultado?.motivo
            );
          }
        } catch (error) {
          console.error(
            "No se pudo finalizar la transcripción:",
            error
          );
        } finally {
          await destruirTranscripcion(sesion);
        }
      }

      transcripcionRef.current = null;
      transcripcionPendienteRef.current = null;

      // MediaRecorder puede tardar en generar
      // el Blob final después de llamar detener().
      let resultadoGrabador = {
        blob: null,
        error: null,
      };

      if (finalizacion?.sesionId === sesionId) {
        resultadoGrabador = await finalizacion.promesa;
      }

      await esperarChunksPendientes();

      // Solo liberamos los streams cuando
      // la grabación local ha terminado.
      if (sesionId === sesionIdRef.current) {
        grabadorRef.current = null;
        finalizacionGrabadorRef.current = null;

        limpiarStreams();
      }

      if (resultadoGrabador.error) {
        actualizarEstado(
          setEstadoGrabacion,
          "error"
        );

        throw resultadoGrabador.error;
      }

      actualizarEstado(
        setEstadoGrabacion,
        "finalizado"
      );

      return resultadoGrabador.blob;
    })();

    detencionRef.current = promesa;

    void promesa.finally(() => {
      if (detencionRef.current === promesa) {
        detencionRef.current = null;
      }
    }).catch(() => {
      // El error ya se entrega a quien llamó
      // detenerAudio().
    });

    return promesa;
  };

  // =======================================================
  // LIMPIEZA AL DESMONTAR
  // =======================================================

  useEffect(() => {
    desmontadoRef.current = false;

    return () => {
      desmontadoRef.current = true;

      // Evitamos que una captura de pantalla finalice
      // la sesión mientras estamos limpiando.
      limpiarFinCapturaRef.current?.();
      limpiarFinCapturaRef.current = null;

      // Si hay grabación, usamos el mismo cierre
      // ordenado de detenerAudio().
      if (grabadorRef.current) {
        void detenerAudio().catch((error) => {
          console.error(
            "Error cerrando el audio al salir:",
            error
          );

          limpiarStreams();
        });

        return;
      }

      // Si solamente quedó una conexión pendiente,
      // esperamos su creación y la destruimos.
      const pendiente =
        transcripcionPendienteRef.current;

      if (pendiente) {
        void pendiente.then((sesion) =>
          destruirTranscripcion(sesion)
        );
      } else {
        void destruirTranscripcion(
          transcripcionRef.current
        );
      }

      transcripcionRef.current = null;

      limpiarStreams();
    };
  }, []);

  // =======================================================
  // ESTADOS DERIVADOS
  // =======================================================

  const grabando =
    estadoGrabacion === "grabando" ||
    estadoGrabacion === "pausado";

  const pausado =
    estadoGrabacion === "pausado";

  const transcribiendo =
    estadoTranscripcion === "activo";

  // =======================================================
  // API DEL HOOK
  // =======================================================

  return {
    estadoGrabacion,
    estadoTranscripcion,
    fuenteAudio,
    textoParcial,
    errorAudio,
    errorTranscripcion,
    grabando,
    pausado,
    transcribiendo,
    iniciarMicrofono,
    iniciarComputadora,
    pausarAudio,
    reanudarAudio,
    detenerAudio,
  };
};
