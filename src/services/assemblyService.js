const ASSEMBLY_WS_URL =
  "wss://streaming.assemblyai.com/v3/ws";

// En producción usa la API de Vercel.
// En local también usa /api/assembly-token.
const TOKEN_URL =
  "/api/assembly-token";

const SAMPLE_RATE = 16000;

const SPEECH_MODEL =
  "universal-3-5-pro";


// Obtener token temporal

const obtenerTokenTemporal =
  async () => {
    const response =
      await fetch(TOKEN_URL);


    if (!response.ok) {
      let mensaje =
        "No se pudo obtener el token temporal de AssemblyAI.";

      try {
        const data =
          await response.json();

        if (data?.error) {
          mensaje =
            data.error;
        }
      } catch {
        // Si la respuesta no es JSON,
        // mantenemos el mensaje original.
      }

      throw new Error(
        mensaje
      );
    }


    const data =
      await response.json();


    if (!data.token) {
      throw new Error(
        "AssemblyAI no devolvió un token válido."
      );
    }


    return data.token;
  };


// Crear URL de conexión

const crearUrlAssembly =
  (token) => {
    const params =
      new URLSearchParams({
        sample_rate:
          SAMPLE_RATE.toString(),

        speech_model:
          SPEECH_MODEL,

        encoding:
          "pcm_s16le",

        token,
      });


    return (
      `${ASSEMBLY_WS_URL}?${params.toString()}`
    );
  };


// Crear conexión

export const crearConexionAssembly =
  async ({
    onOpen,
    onPartial,
    onFinal,
    onError,
    onClose,
    onTermination,
  } = {}) => {
    const token =
      await obtenerTokenTemporal();


    const url =
      crearUrlAssembly(
        token
      );


    const socket =
      new WebSocket(
        url
      );


    socket.binaryType =
      "arraybuffer";


    socket.onopen =
      () => {
        console.log(
          "AssemblyAI conectado"
        );

        onOpen?.();
      };


    socket.onmessage =
      (event) => {
        try {
          const data =
            JSON.parse(
              event.data
            );


          if (
            data.type ===
            "Begin"
          ) {
            console.log(
              "Sesión AssemblyAI iniciada:",
              data.id
            );

            return;
          }


          if (
            data.type ===
            "SpeechStarted"
          ) {
            return;
          }


          if (
            data.type ===
            "Turn"
          ) {
            const texto =
              data.transcript
                ?.trim();


            if (!texto) {
              return;
            }


            if (
              data.end_of_turn
            ) {
              onFinal?.({
                texto,
                data,
              });
            } else {
              onPartial?.({
                texto,
                data,
              });
            }


            return;
          }


          if (
            data.type ===
            "Termination"
          ) {
            console.log(
              "Sesión AssemblyAI terminada"
            );

            onTermination?.(
              data
            );
          }

        } catch (error) {
          console.error(
            "Error procesando respuesta de AssemblyAI:",
            error
          );

          onError?.(
            error
          );
        }
      };


    socket.onerror =
      (event) => {
        console.error(
          "Error WebSocket AssemblyAI:",
          event
        );

        onError?.(
          new Error(
            "Error en la conexión con AssemblyAI."
          )
        );
      };


    socket.onclose =
      (event) => {
        console.log(
          "AssemblyAI desconectado",
          {
            code:
              event.code,

            reason:
              event.reason,
          }
        );

        onClose?.(
          event
        );
      };


    return socket;
  };


// Enviar audio

export const enviarAudioAssembly =
  (
    socket,
    audioData
  ) => {
    if (
      !socket ||
      socket.readyState !==
        WebSocket.OPEN
    ) {
      return false;
    }


    if (
      !audioData ||
      audioData.byteLength ===
        0
    ) {
      return false;
    }


    socket.send(
      audioData
    );


    return true;
  };


// Terminar sesión correctamente

export const terminarConexionAssembly =
  (socket) => {
    if (
      !socket ||
      socket.readyState !==
        WebSocket.OPEN
    ) {
      return;
    }


    socket.send(
      JSON.stringify({
        type:
          "Terminate",
      })
    );
  };


// Forzar cierre

export const forzarCierreAssembly =
  (socket) => {
    if (!socket) {
      return;
    }


    if (
      socket.readyState ===
        WebSocket.OPEN ||
      socket.readyState ===
        WebSocket.CONNECTING
    ) {
      socket.close();
    }
  };


export const assemblyConfig = {
  sampleRate:
    SAMPLE_RATE,

  speechModel:
    SPEECH_MODEL,
};