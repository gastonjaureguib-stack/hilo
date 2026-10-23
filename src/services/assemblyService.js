
const ASSEMBLY_WS_URL =
  "wss://streaming.assemblyai.com/v3/ws";

const TOKEN_URL = "/api/assembly-token";

const SAMPLE_RATE = 16000;

const SPEECH_MODEL = "universal-3-5-pro";

// Tiempos máximos de espera.
const TIMEOUT_CONEXION = 15000;
const TIMEOUT_FINALIZACION = 10000;

// =========================================================
// OBTENER TOKEN TEMPORAL
// =========================================================

const obtenerTokenTemporal = async () => {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, TIMEOUT_CONEXION);

  try {
    const response = await fetch(TOKEN_URL, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      let mensaje =
        "No se pudo obtener el token temporal de AssemblyAI.";

      try {
        const data = await response.json();

        if (data?.error) {
          mensaje = data.error;
        }
      } catch {
        // Conservar el mensaje original.
      }

      throw new Error(mensaje);
    }

    const data = await response.json();

    if (!data?.token) {
      throw new Error(
        "AssemblyAI no devolvió un token válido."
      );
    }

    return data.token;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        "Se agotó el tiempo de espera para obtener el token de AssemblyAI."
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

// =========================================================
// CREAR URL
// =========================================================

const crearUrlAssembly = (token) => {
  const params = new URLSearchParams({
    sample_rate: String(SAMPLE_RATE),
    speech_model: SPEECH_MODEL,
    encoding: "pcm_s16le",
    token,
  });

  return `${ASSEMBLY_WS_URL}?${params.toString()}`;
};

// =========================================================
// CREAR CONEXIÓN
// =========================================================

export const crearConexionAssembly = async ({
  onOpen,
  onPartial,
  onFinal,
  onError,
  onClose,
  onTermination,
} = {}) => {
  const token = await obtenerTokenTemporal();
  const url = crearUrlAssembly(token);

  const socket = new WebSocket(url);

  socket.binaryType = "arraybuffer";

  let conexionAbierta = false;
  let conexionTerminada = false;

  // Guardamos el resultado de la finalización
  // para que pueda esperarse posteriormente.
  let resolverTerminacion;

  const promesaTerminacion = new Promise((resolve) => {
    resolverTerminacion = resolve;
  });

  const confirmarTerminacion = (resultado) => {
    if (conexionTerminada) return;

    conexionTerminada = true;
    resolverTerminacion(resultado);
  };

  // La promesa se asocia al socket sin modificar
  // la interfaz de las funciones existentes.
  const datosSesion = {
    promesaTerminacion,
    confirmarTerminacion,
    terminacionSolicitada: false,
    promesaCierre: null,
  };

  sesionesAssembly.set(socket, datosSesion);

  const promesaConexion = new Promise(
    (resolve, reject) => {
      let conexionResuelta = false;

      const timeoutConexion = setTimeout(() => {
        if (conexionResuelta) return;

        conexionResuelta = true;

        const error = new Error(
          "Se agotó el tiempo de espera para conectar con AssemblyAI."
        );

        try {
          socket.close();
        } catch {
          // La conexión ya puede estar cerrada.
        }

        reject(error);
      }, TIMEOUT_CONEXION);

      const resolverConexion = () => {
        if (conexionResuelta) return;

        conexionResuelta = true;
        clearTimeout(timeoutConexion);

        resolve(socket);
      };

      const rechazarConexion = (error) => {
        if (conexionResuelta) return;

        conexionResuelta = true;
        clearTimeout(timeoutConexion);

        reject(error);
      };

      socket.onopen = () => {
        conexionAbierta = true;

        console.log("AssemblyAI conectado");

        resolverConexion();

        try {
          onOpen?.();
        } catch (error) {
          console.error(
            "Error en callback onOpen:",
            error
          );
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "Begin") {
            console.log(
              "Sesión AssemblyAI iniciada:",
              data.id
            );

            return;
          }

          if (data.type === "SpeechStarted") {
            return;
          }

          if (data.type === "Turn") {
            const texto = data.transcript?.trim();

            if (!texto) return;

            if (data.end_of_turn) {
              onFinal?.({ texto, data });
            } else {
              onPartial?.({ texto, data });
            }

            return;
          }

          if (data.type === "Termination") {
            console.log(
              "Sesión AssemblyAI terminada"
            );

            confirmarTerminacion({
              confirmada: true,
              data,
            });

            onTermination?.(data);
          }
        } catch (error) {
          console.error(
            "Error procesando respuesta de AssemblyAI:",
            error
          );

          onError?.(error);
        }
      };

      socket.onerror = () => {
        const error = new Error(
          "Error en la conexión con AssemblyAI."
        );

        console.error(error);

        onError?.(error);

        rechazarConexion(error);
      };

      socket.onclose = (event) => {
        console.log("AssemblyAI desconectado", {
          code: event.code,
          reason: event.reason,
        });

        confirmarTerminacion({
          confirmada: false,
          motivo: "conexion_cerrada",
          codigo: event.code,
        });

        if (!conexionAbierta) {
          rechazarConexion(
            new Error(
              "La conexión con AssemblyAI se cerró antes de estar disponible."
            )
          );
        }

        onClose?.(event);
      };
    }
  );

  try {
    return await promesaConexion;
  } catch (error) {
    sesionesAssembly.delete(socket);

    try {
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close();
      }
    } catch {
      // La conexión ya está cerrada.
    }

    throw error;
  }
};

// =========================================================
// REGISTRO PRIVADO DE SESIONES
// =========================================================

// WeakMap permite asociar información de control
// a cada WebSocket sin exponerla al resto de Hilo.
const sesionesAssembly = new WeakMap();

// =========================================================
// ENVIAR AUDIO
// =========================================================

export const enviarAudioAssembly = (
  socket,
  audioData
) => {
  if (
    !socket ||
    socket.readyState !== WebSocket.OPEN
  ) {
    return false;
  }

  if (!audioData || audioData.byteLength === 0) {
    return false;
  }

  const sesion = sesionesAssembly.get(socket);

  // No enviar audio después de solicitar el cierre.
  if (sesion?.terminacionSolicitada) {
    return false;
  }

  try {
    socket.send(audioData);
    return true;
  } catch (error) {
    console.error(
      "No se pudo enviar audio a AssemblyAI:",
      error
    );

    return false;
  }
};

// =========================================================
// TERMINAR CONEXIÓN ORDENADAMENTE
// =========================================================

export const terminarConexionAssembly = async (
  socket
) => {
  if (!socket) {
    return {
      confirmada: false,
      motivo: "sin_socket",
    };
  }

  const sesion = sesionesAssembly.get(socket);

  if (!sesion) {
    return {
      confirmada: false,
      motivo: "sesion_no_encontrada",
    };
  }

  // Si ya se solicitó el cierre, compartir
  // la misma promesa.
  if (sesion.promesaCierre) {
    return sesion.promesaCierre;
  }

  sesion.promesaCierre = (async () => {
    if (socket.readyState !== WebSocket.OPEN) {
      return {
        confirmada: false,
        motivo: "conexion_no_disponible",
      };
    }

    sesion.terminacionSolicitada = true;

    let timeoutId;

    try {
      const timeoutPromise = new Promise((resolve) => {
        timeoutId = setTimeout(() => {
          resolve({
            confirmada: false,
            motivo: "timeout",
          });
        }, TIMEOUT_FINALIZACION);
      });

      socket.send(
        JSON.stringify({
          type: "Terminate",
        })
      );

      const resultado = await Promise.race([
        sesion.promesaTerminacion,
        timeoutPromise,
      ]);

      return resultado;
    } catch (error) {
      console.error(
        "No se pudo finalizar AssemblyAI:",
        error
      );

      return {
        confirmada: false,
        motivo: "error",
        error,
      };
    } finally {
      clearTimeout(timeoutId);

      try {
        if (
          socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING
        ) {
          socket.close();
        }
      } catch {
        // La conexión ya estaba cerrada.
      }

      sesionesAssembly.delete(socket);
    }
  })();

  return sesion.promesaCierre;
};

// =========================================================
// FORZAR CIERRE
// =========================================================

export const forzarCierreAssembly = (socket) => {
  if (!socket) return;

  const sesion = sesionesAssembly.get(socket);

  sesion?.confirmarTerminacion({
    confirmada: false,
    motivo: "cierre_forzado",
  });

  sesionesAssembly.delete(socket);

  try {
    if (
      socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING
    ) {
      socket.close();
    }
  } catch (error) {
    console.error(
      "No se pudo cerrar el WebSocket:",
      error
    );
  }
};

// =========================================================
// CONFIGURACIÓN
// =========================================================

export const assemblyConfig = {
  sampleRate: SAMPLE_RATE,
  speechModel: SPEECH_MODEL,
};
