import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  capturarMicrofono,
  capturarAudioComputadora,
  escucharFinCaptura,
  detenerStreams,
} from "../audio/audioCapture.js";

import {
  crearGrabadorAudio,
} from "../audio/audioRecorder.js";

import {
  crearSesionTranscripcion,
} from "../services/transcriptionService.js";

import {
  guardarChunkAudio,
} from "../utils/hiloStorage.js";

import {
  useHilo,
} from "../context/HiloContext.jsx";


export const useClassAudio = ({
  onAudioFinalizado,
} = {}) => {
  const {
    guardarAudio,
    agregarTranscripcion,
    pausarRelojClase,
    reanudarRelojClase,
  } = useHilo();


  const sourceStreamRef =
    useRef(null);

  const audioStreamRef =
    useRef(null);

  const grabadorRef =
    useRef(null);

  const transcripcionRef =
    useRef(null);

  const limpiarFinCapturaRef =
    useRef(null);

  const desmontadoRef =
    useRef(false);

  const detenerEnCursoRef =
    useRef(false);

  const resolverDetencionRef =
    useRef(null);


  const [
    estadoGrabacion,
    setEstadoGrabacion,
  ] = useState(
    "inactivo"
  );

  const [
    estadoTranscripcion,
    setEstadoTranscripcion,
  ] = useState(
    "inactivo"
  );

  const [
    fuenteAudio,
    setFuenteAudio,
  ] = useState(null);

  const [
    textoParcial,
    setTextoParcial,
  ] = useState("");

  const [
    errorAudio,
    setErrorAudio,
  ] = useState("");

  const [
    errorTranscripcion,
    setErrorTranscripcion,
  ] = useState("");


  const limpiarStreams =
    () => {
      limpiarFinCapturaRef
        .current?.();

      limpiarFinCapturaRef.current =
        null;


      detenerStreams(
        audioStreamRef.current,
        sourceStreamRef.current
      );


      audioStreamRef.current =
        null;

      sourceStreamRef.current =
        null;
    };


  const limpiarTranscripcion =
    async () => {
      const sesion =
        transcripcionRef.current;


      transcripcionRef.current =
        null;


      if (!sesion) {
        return;
      }


      try {
        await sesion.destruir();
      } catch (error) {
        console.error(
          "No se pudo limpiar la transcripción:",
          error
        );
      }
    };


  const resolverDetencion =
    (blob = null) => {
      if (
        resolverDetencionRef.current
      ) {
        resolverDetencionRef.current(
          blob
        );

        resolverDetencionRef.current =
          null;
      }
    };


  // Crear grabación local

  const iniciarGrabador =
    (stream) => {
      const grabador =
        crearGrabadorAudio({
          stream,


          onChunk: (
            chunk
          ) => {
            guardarChunkAudio(
              chunk
            ).catch(
              (error) => {
                console.error(
                  "No se pudo guardar un chunk de audio:",
                  error
                );
              }
            );
          },


          onFinal: (
            blob
          ) => {
            grabadorRef.current =
              null;


            if (
              blob &&
              blob.size > 0
            ) {
              guardarAudio(
                blob
              );
            }


            limpiarStreams();


            setEstadoGrabacion(
              "finalizado"
            );


            detenerEnCursoRef.current =
              false;


            resolverDetencion(
              blob
            );


            onAudioFinalizado?.(
              blob
            );
          },


          onEstado: (
            estado
          ) => {
            setEstadoGrabacion(
              estado
            );
          },


          onError: (
            error
          ) => {
            console.error(
              "Error de grabación:",
              error
            );


            setErrorAudio(
              error.message ||
              "Ocurrió un error grabando el audio."
            );
          },
        });


      grabadorRef.current =
        grabador;


      grabador.iniciar(
        1000
      );
    };


  // Iniciar transcripción

  const iniciarTranscripcion =
    async (
      stream
    ) => {
      setErrorTranscripcion(
        ""
      );

      setTextoParcial(
        ""
      );


      try {
        const sesion =
          await crearSesionTranscripcion({
            stream,


            onParcial: ({
              texto,
            }) => {
              if (
                desmontadoRef.current
              ) {
                return;
              }


              setTextoParcial(
                texto
              );
            },


            onFinal: ({
              texto,
            }) => {
              if (
                desmontadoRef.current
              ) {
                return;
              }


              setTextoParcial(
                ""
              );


              agregarTranscripcion(
                texto
              );
            },


            onEstado: (
              estado
            ) => {
              if (
                desmontadoRef.current
              ) {
                return;
              }


              setEstadoTranscripcion(
                estado
              );
            },


            onError: (
              error
            ) => {
              if (
                desmontadoRef.current
              ) {
                return;
              }


              setErrorTranscripcion(
                error.message ||
                "La transcripción dejó de funcionar."
              );
            },
          });


        if (
          desmontadoRef.current
        ) {
          await sesion
            .destruir();

          return;
        }


        transcripcionRef.current =
          sesion;

      } catch (error) {
        console.error(
          "No se pudo iniciar la transcripción:",
          error
        );


        setEstadoTranscripcion(
          "error"
        );


        setErrorTranscripcion(
          error.message ||
          "No se pudo iniciar la transcripción."
        );


        /*
          La grabación local sigue funcionando.
          Una falla de AssemblyAI no detiene la clase.
        */
      }
    };


  // Iniciar desde un stream

  const iniciarDesdeStream =
    async ({
      sourceStream,
      audioStream,
      fuente,
    }) => {
      if (
        grabadorRef.current
      ) {
        return;
      }


      setErrorAudio(
        ""
      );

      setErrorTranscripcion(
        ""
      );

      setTextoParcial(
        ""
      );

      setFuenteAudio(
        fuente
      );


      sourceStreamRef.current =
        sourceStream;

      audioStreamRef.current =
        audioStream;


      /*
        Primero iniciamos el respaldo local.

        Así, aunque falle Internet o AssemblyAI,
        el audio completo de la clase continúa
        guardándose.
      */

      iniciarGrabador(
        audioStream
      );


      /*
        La transcripción se inicia como una rama
        independiente de la grabación.
      */

      iniciarTranscripcion(
        audioStream
      );
    };


  // Micrófono

  const iniciarMicrofono =
    async () => {
      if (
        grabadorRef.current
      ) {
        return;
      }


      setEstadoGrabacion(
        "solicitando"
      );


      try {
        const {
          sourceStream,
          audioStream,
        } =
          await capturarMicrofono();


        await iniciarDesdeStream({
          sourceStream,
          audioStream,
          fuente:
            "microfono",
        });

      } catch (error) {
        console.error(
          "No se pudo acceder al micrófono:",
          error
        );


        limpiarStreams();


        setEstadoGrabacion(
          "inactivo"
        );


        setErrorAudio(
          error.message ||
          "No se pudo acceder al micrófono."
        );
      }
    };


  // Audio de computadora

  const iniciarComputadora =
    async () => {
      if (
        grabadorRef.current
      ) {
        return;
      }


      setEstadoGrabacion(
        "solicitando"
      );


      try {
        const {
          sourceStream,
          audioStream,
        } =
          await capturarAudioComputadora();


        await iniciarDesdeStream({
          sourceStream,
          audioStream,
          fuente:
            "computadora",
        });


        limpiarFinCapturaRef.current =
          escucharFinCaptura(
            sourceStream,
            () => {
              detenerAudio();
            }
          );

      } catch (error) {
        console.error(
          "No se pudo capturar el audio de la computadora:",
          error
        );


        limpiarStreams();


        setEstadoGrabacion(
          "inactivo"
        );


        setErrorAudio(
          error.message ||
          "No se pudo capturar el audio de la computadora."
        );
      }
    };


  // Pausar

  const pausarAudio =
    async () => {
      const grabador =
        grabadorRef.current;


      if (
        !grabador ||
        grabador
          .obtenerEstadoNativo() !==
          "recording"
      ) {
        return;
      }


      grabador.pausar();


      try {
        await transcripcionRef
          .current
          ?.pausar();
      } catch (error) {
        console.error(
          "No se pudo pausar la transcripción:",
          error
        );
      }


      pausarRelojClase();
    };


  // Reanudar

  const reanudarAudio =
    async () => {
      const grabador =
        grabadorRef.current;


      if (
        !grabador ||
        grabador
          .obtenerEstadoNativo() !==
          "paused"
      ) {
        return;
      }


      grabador.reanudar();


      try {
        await transcripcionRef
          .current
          ?.reanudar();
      } catch (error) {
        console.error(
          "No se pudo reanudar la transcripción:",
          error
        );
      }


      reanudarRelojClase();
    };


  // Detener

  const detenerAudio =
    async () => {
      if (
        detenerEnCursoRef.current
      ) {
        return new Promise(
          (resolve) => {
            const anterior =
              resolverDetencionRef.current;


            resolverDetencionRef.current =
              (blob) => {
                anterior?.(
                  blob
                );

                resolve(
                  blob
                );
              };
          }
        );
      }


      detenerEnCursoRef.current =
        true;


      const promesaGrabacion =
        new Promise(
          (resolve) => {
            resolverDetencionRef.current =
              resolve;
          }
        );


      setTextoParcial(
        ""
      );


      const sesion =
        transcripcionRef.current;


      transcripcionRef.current =
        null;


      if (sesion) {
        try {
          await sesion
            .detener();
        } catch (error) {
          console.error(
            "No se pudo detener correctamente la transcripción:",
            error
          );


          try {
            await sesion
              .destruir();
          } catch {
            // Sesión ya cerrada
          }
        }
      }


      const grabador =
        grabadorRef.current;


      if (
        !grabador ||
        grabador
          .obtenerEstadoNativo() ===
          "inactive"
      ) {
        grabadorRef.current =
          null;


        limpiarStreams();


        detenerEnCursoRef.current =
          false;


        resolverDetencion(
          null
        );


        setEstadoGrabacion(
          "finalizado"
        );
      } else {
        grabador.detener();
      }


      return promesaGrabacion;
    };


  // Limpiar al salir

  useEffect(() => {
    desmontadoRef.current =
      false;


    return () => {
      desmontadoRef.current =
        true;


      limpiarFinCapturaRef
        .current?.();


      const grabador =
        grabadorRef.current;


      if (
        grabador &&
        grabador
          .obtenerEstadoNativo() !==
          "inactive"
      ) {
        try {
          grabador.detener();
        } catch {
          // Grabador ya detenido
        }
      }


      limpiarTranscripcion();


      limpiarStreams();
    };
  }, []);


  const grabando =
    estadoGrabacion ===
      "grabando" ||
    estadoGrabacion ===
      "pausado";


  const pausado =
    estadoGrabacion ===
    "pausado";


  const transcribiendo =
    estadoTranscripcion ===
    "activo";


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