
import {
  crearConexionAssembly,
  enviarAudioAssembly,
  terminarConexionAssembly,
  forzarCierreAssembly,
} from "./assemblyService.js";

import { crearProcesadorPCM } from "../audio/pcmProcessor.js";

const ESTADOS = {
  INACTIVO: "inactivo",
  CONECTANDO: "conectando",
  ACTIVO: "activo",
  PAUSADO: "pausado",
  DETENIENDO: "deteniendo",
  FINALIZADO: "finalizado",
  ERROR: "error",
};

export const crearSesionTranscripcion = async ({
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

  let socket = null;
  let procesadorPCM = null;

  let estado = ESTADOS.INACTIVO;

  let deteniendo = false;
  let detenido = false;
  let destruido = false;

  let promesaDetencion = null;
  let promesaDestruccion = null;

  // =======================================================
  // ESTADO
  // =======================================================

  const cambiarEstado = (nuevoEstado) => {
    if (estado === nuevoEstado) return;

    estado = nuevoEstado;
    onEstado?.(nuevoEstado);
  };

  // =======================================================
  // ERRORES
  // =======================================================

  const manejarError = (error) => {
    if (
      destruido ||
      detenido ||
      estado === ESTADOS.FINALIZADO
    ) {
      return;
    }

    console.error(
      "Error de transcripción:",
      error
    );

    cambiarEstado(ESTADOS.ERROR);
    onError?.(error);
  };

  cambiarEstado(ESTADOS.CONECTANDO);

  // =======================================================
  // CONECTAR CON ASSEMBLYAI
  // =======================================================

  try {
    socket = await crearConexionAssembly({
      onPartial: ({ texto, data }) => {
        if (
          destruido ||
          detenido ||
          deteniendo
        ) {
          return;
        }

        onParcial?.({ texto, data });
      },

      onFinal: ({ texto, data }) => {
        // Permitimos recibir resultados finales
        // durante el cierre ordenado.
        if (destruido) return;

        if (texto?.trim()) {
          onFinal?.({ texto, data });
        }
      },

      onError: (error) => {
        if (!deteniendo && !detenido && !destruido) {
          manejarError(error);
        }
      },

      onClose: () => {
        if (destruido) return;

        if (deteniendo || detenido) {
          cambiarEstado(ESTADOS.FINALIZADO);
          return;
        }

        if (estado !== ESTADOS.ERROR) {
          manejarError(
            new Error(
              "Se perdió la conexión con la transcripción."
            )
          );
        }
      },

      onTermination: () => {
        if (!destruido) {
          cambiarEstado(ESTADOS.FINALIZADO);
        }
      },
    });

    // =====================================================
    // CREAR PROCESADOR PCM
    // =====================================================

    procesadorPCM = await crearProcesadorPCM({
      stream,

      onAudioData: (audioData) => {
        // Durante el flush final todavía debemos
        // enviar los últimos datos PCM.
        //
        // Solo bloqueamos el envío cuando el
        // procesador ya terminó o se destruyó
        // la sesión.
        if (detenido || destruido) return;

        enviarAudioAssembly(socket, audioData);
      },

      onError: (error) => {
        manejarError(error);
      },
    });

    if (!deteniendo && !detenido && !destruido) {
      cambiarEstado(ESTADOS.ACTIVO);
    }
  } catch (error) {
    try {
      await procesadorPCM?.detener();
    } catch {
      // Puede no haberse iniciado.
    }

    procesadorPCM = null;

    forzarCierreAssembly(socket);
    socket = null;

    manejarError(error);

    throw error;
  }

  // =======================================================
  // PAUSAR
  // =======================================================

  const pausar = async () => {
    if (
      deteniendo ||
      detenido ||
      destruido ||
      estado !== ESTADOS.ACTIVO
    ) {
      return;
    }

    await procesadorPCM?.pausar();

    if (!deteniendo && !detenido && !destruido) {
      cambiarEstado(ESTADOS.PAUSADO);
    }
  };

  // =======================================================
  // REANUDAR
  // =======================================================

  const reanudar = async () => {
    if (
      deteniendo ||
      detenido ||
      destruido ||
      estado !== ESTADOS.PAUSADO
    ) {
      return;
    }

    await procesadorPCM?.reanudar();

    if (!deteniendo && !detenido && !destruido) {
      cambiarEstado(ESTADOS.ACTIVO);
    }
  };

  // =======================================================
  // DETENER ORDENADAMENTE
  // =======================================================

  const detener = () => {
    if (promesaDetencion) {
      return promesaDetencion;
    }

    if (destruido) {
      return Promise.resolve({
        confirmada: false,
        motivo: "sesion_destruida",
      });
    }

    deteniendo = true;

    cambiarEstado(ESTADOS.DETENIENDO);

    promesaDetencion = (async () => {
      // PASO 1:
      // Detener el procesador PCM.
      //
      // Este proceso incluye el flush final.
      // Durante ese flush todavía permitimos
      // enviar audio a AssemblyAI.

      try {
        await procesadorPCM?.detener();
      } catch (error) {
        console.error(
          "No se pudo detener el procesador PCM:",
          error
        );
      } finally {
        procesadorPCM = null;
        detenido = true;
      }

      // PASO 2:
      // Una vez enviado el último fragmento,
      // solicitar la terminación de AssemblyAI.

      let resultado;

      try {
        resultado = await terminarConexionAssembly(
          socket
        );
      } catch (error) {
        console.error(
          "No se pudo finalizar AssemblyAI:",
          error
        );

        resultado = {
          confirmada: false,
          motivo: "error",
        };
      } finally {
        socket = null;

        if (!destruido) {
          cambiarEstado(ESTADOS.FINALIZADO);
        }
      }

      if (!resultado?.confirmada) {
        console.warn(
          "AssemblyAI terminó sin confirmación completa:",
          resultado?.motivo
        );
      }

      return resultado;
    })();

    return promesaDetencion;
  };

  // =======================================================
  // DESTRUIR SESIÓN
  // =======================================================

  const destruir = () => {
    if (promesaDestruccion) {
      return promesaDestruccion;
    }

    promesaDestruccion = (async () => {
      // Si hay una detención ordenada en curso,
      // esperamos a que termine.
      if (promesaDetencion) {
        await promesaDetencion;
      } else {
        deteniendo = true;

        try {
          await procesadorPCM?.detener();
        } catch (error) {
          console.error(
            "No se pudo liberar el procesador PCM:",
            error
          );
        }

        procesadorPCM = null;
        detenido = true;
      }

      destruido = true;

      forzarCierreAssembly(socket);
      socket = null;

      cambiarEstado(ESTADOS.FINALIZADO);
    })();

    return promesaDestruccion;
  };

  // =======================================================
  // CONSULTAR ESTADO
  // =======================================================

  const obtenerEstado = () => estado;

  return {
    pausar,
    reanudar,
    detener,
    destruir,
    obtenerEstado,
  };
};

export const estadosTranscripcion = ESTADOS;
