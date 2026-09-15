import {
  crearConexionAssembly,
  enviarAudioAssembly,
  terminarConexionAssembly,
  forzarCierreAssembly,
} from "./assemblyService.js";

import {
  crearProcesadorPCM,
} from "../audio/pcmProcessor.js";


const ESTADOS = {
  INACTIVO:
    "inactivo",

  CONECTANDO:
    "conectando",

  ACTIVO:
    "activo",

  PAUSADO:
    "pausado",

  DETENIENDO:
    "deteniendo",

  FINALIZADO:
    "finalizado",

  ERROR:
    "error",
};


// Crear sesión de transcripción

export const crearSesionTranscripcion =
  async ({
    stream,

    onParcial,
    onFinal,
    onEstado,
    onError,
  }) => {
    if (!stream) {
      throw new Error(
        "No se recibió un stream para transcribir."
      );
    }


    let socket =
      null;

    let procesadorPCM =
      null;

    let estado =
      ESTADOS.INACTIVO;

    let detenido =
      false;


    const cambiarEstado =
      (nuevoEstado) => {
        estado =
          nuevoEstado;

        onEstado?.(
          nuevoEstado
        );
      };


    const manejarError =
      (error) => {
        console.error(
          "Error de transcripción:",
          error
        );

        cambiarEstado(
          ESTADOS.ERROR
        );

        onError?.(
          error
        );
      };


    cambiarEstado(
      ESTADOS.CONECTANDO
    );


    // Esperar conexión WebSocket

    const conexionLista =
      new Promise(
        (
          resolve,
          reject
        ) => {
          let resuelto =
            false;


          crearConexionAssembly({

            onOpen: () => {
              if (resuelto) {
                return;
              }

              resuelto =
                true;

              resolve();
            },


            onPartial: ({
              texto,
              data,
            }) => {
              onParcial?.({
                texto,
                data,
              });
            },


            onFinal: ({
              texto,
              data,
            }) => {
              onFinal?.({
                texto,
                data,
              });
            },


            onError: (
              error
            ) => {
              manejarError(
                error
              );


              if (
                !resuelto
              ) {
                resuelto =
                  true;

                reject(
                  error
                );
              }
            },


            onClose: () => {
              if (
                detenido
              ) {
                cambiarEstado(
                  ESTADOS.FINALIZADO
                );

                return;
              }


              if (
                estado !==
                ESTADOS.ERROR
              ) {
                manejarError(
                  new Error(
                    "Se perdió la conexión con la transcripción."
                  )
                );
              }
            },


            onTermination: () => {
              cambiarEstado(
                ESTADOS.FINALIZADO
              );
            },

          })
            .then(
              (
                conexion
              ) => {
                socket =
                  conexion;
              }
            )
            .catch(
              (
                error
              ) => {
                if (
                  !resuelto
                ) {
                  resuelto =
                    true;

                  reject(
                    error
                  );
                }
              }
            );
        }
      );


    try {
      await conexionLista;


      // Procesar audio

      procesadorPCM =
        await crearProcesadorPCM({

          stream,


          onAudioData: (
            audioData
          ) => {
            enviarAudioAssembly(
              socket,
              audioData
            );
          },


          onError: (
            error
          ) => {
            manejarError(
              error
            );
          },

        });


      cambiarEstado(
        ESTADOS.ACTIVO
      );

    } catch (error) {
      forzarCierreAssembly(
        socket
      );

      manejarError(
        error
      );

      throw error;
    }


    // Pausar transcripción

    const pausar =
      async () => {
        if (
          estado !==
          ESTADOS.ACTIVO
        ) {
          return;
        }


        await procesadorPCM
          ?.pausar();


        cambiarEstado(
          ESTADOS.PAUSADO
        );
      };


    // Reanudar transcripción

    const reanudar =
      async () => {
        if (
          estado !==
          ESTADOS.PAUSADO
        ) {
          return;
        }


        await procesadorPCM
          ?.reanudar();


        cambiarEstado(
          ESTADOS.ACTIVO
        );
      };


    // Detener transcripción

    const detener =
      async () => {
        if (
          detenido
        ) {
          return;
        }


        detenido =
          true;


        cambiarEstado(
          ESTADOS.DETENIENDO
        );


        try {
          await procesadorPCM
            ?.detener();
        } catch (error) {
          console.error(
            "No se pudo detener el procesador PCM:",
            error
          );
        }


        procesadorPCM =
          null;


        terminarConexionAssembly(
          socket
        );
      };


    // Cierre inmediato

    const destruir =
      async () => {
        detenido =
          true;


        try {
          await procesadorPCM
            ?.detener();
        } catch {
          // Procesador ya detenido
        }


        procesadorPCM =
          null;


        forzarCierreAssembly(
          socket
        );


        socket =
          null;


        cambiarEstado(
          ESTADOS.FINALIZADO
        );
      };


    // Estado actual

    const obtenerEstado =
      () => {
        return estado;
      };


    return {
      pausar,
      reanudar,
      detener,
      destruir,
      obtenerEstado,
    };
  };


export const estadosTranscripcion =
  ESTADOS;