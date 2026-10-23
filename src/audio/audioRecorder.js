
import fixWebmDuration from "fix-webm-duration";

// =========================================================
// DETECTAR FORMATO DE AUDIO COMPATIBLE
// =========================================================

const obtenerMimeType = () => {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  const tipos = [
    "audio/webm;codecs=opus",
    "audio/ogg;codecs=opus",
    "audio/webm",
  ];

  for (const tipo of tipos) {
    if (MediaRecorder.isTypeSupported(tipo)) {
      return tipo;
    }
  }

  return "";
};

// =========================================================
// CREAR GRABADOR DE AUDIO
// =========================================================

export const crearGrabadorAudio = ({
  stream,
  onChunk,
  onFinal,
  onEstado,
  onError,
}) => {
  if (!stream) {
    throw new Error(
      "No se recibió un stream para grabar."
    );
  }

  if (typeof MediaRecorder === "undefined") {
    throw new Error(
      "Este navegador no soporta MediaRecorder."
    );
  }

  if (stream.getAudioTracks().length === 0) {
    throw new Error(
      "El stream no contiene pistas de audio."
    );
  }

  const mimeType = obtenerMimeType();

  const opciones = mimeType
    ? { mimeType }
    : undefined;

  const recorder = new MediaRecorder(
    stream,
    opciones
  );

  const chunks = [];

  let estado = "inactivo";
  let finalizado = false;
  let errorGrabacion = null;

  // =======================================================
  // CONTROL DE DURACIÓN
  // =======================================================

  let inicioGrabacion = null;
  let inicioPausa = null;
  let tiempoPausado = 0;

  const ahora = () => performance.now();

  const cambiarEstado = (nuevoEstado) => {
    if (estado === nuevoEstado) return;

    estado = nuevoEstado;

    try {
      onEstado?.(nuevoEstado);
    } catch (error) {
      console.error(
        "Error notificando estado del grabador:",
        error
      );
    }
  };

  // =======================================================
  // NOTIFICAR ERROR
  // =======================================================

  const notificarError = (error) => {
    if (errorGrabacion) return;

    errorGrabacion =
      error instanceof Error
        ? error
        : new Error(
            "Ocurrió un error durante la grabación."
          );

    cambiarEstado("error");

    try {
      onError?.(errorGrabacion);
    } catch (callbackError) {
      console.error(
        "Error en callback onError:",
        callbackError
      );
    }
  };

  // =======================================================
  // EVENTOS DEL MEDIARECORDER
  // =======================================================

  recorder.onstart = () => {
    inicioGrabacion = ahora();
    inicioPausa = null;
    tiempoPausado = 0;

    cambiarEstado("grabando");
  };

  recorder.onpause = () => {
    if (inicioPausa === null) {
      inicioPausa = ahora();
    }

    cambiarEstado("pausado");
  };

  recorder.onresume = () => {
    if (inicioPausa !== null) {
      tiempoPausado += ahora() - inicioPausa;
      inicioPausa = null;
    }

    cambiarEstado("grabando");
  };

  recorder.onerror = (event) => {
    notificarError(
      event.error ||
        new Error(
          "Ocurrió un error durante la grabación."
        )
    );
  };

  recorder.ondataavailable = (event) => {
    const chunk = event.data;

    if (!chunk || chunk.size === 0) {
      return;
    }

    chunks.push(chunk);

    try {
      onChunk?.(chunk);
    } catch (error) {
      console.error(
        "Error procesando un fragmento de audio:",
        error
      );
    }
  };

  // =======================================================
  // FINALIZAR GRABACIÓN
  // =======================================================

  recorder.onstop = async () => {
    if (finalizado) return;

    finalizado = true;

    // Descontar la última pausa si el grabador
    // se detuvo mientras estaba pausado.
    if (inicioPausa !== null) {
      tiempoPausado += ahora() - inicioPausa;
      inicioPausa = null;
    }

    const finGrabacion = ahora();

    const duracionReal =
      inicioGrabacion !== null
        ? Math.max(
            1,
            finGrabacion -
              inicioGrabacion -
              tiempoPausado
          )
        : 1;

    const tipoFinal =
      recorder.mimeType ||
      mimeType ||
      chunks[0]?.type ||
      "audio/webm";

    const blobOriginal = new Blob(chunks, {
      type: tipoFinal,
    });

    let blobFinal = blobOriginal;

    // =====================================================
    // CORREGIR DURACIÓN DEL WEBM
    // =====================================================

    if (
      !errorGrabacion &&
      blobOriginal.size > 0 &&
      tipoFinal.toLowerCase().includes("webm")
    ) {
      try {
        const blobCorregido =
          await fixWebmDuration(
            blobOriginal,
            duracionReal,
            {
              logger: false,
            }
          );

        if (
          blobCorregido instanceof Blob &&
          blobCorregido.size > 0
        ) {
          blobFinal = blobCorregido;
        }
      } catch (error) {
        console.error(
          "No se pudo corregir la duración del WebM:",
          error
        );

        // Conservamos el audio original.
        blobFinal = blobOriginal;
      }
    }

    // =====================================================
    // NOTIFICAR RESULTADO FINAL
    // =====================================================

    // Si MediaRecorder notificó un error,
    // onError ya fue ejecutado.
    if (errorGrabacion) {
      return;
    }

    cambiarEstado("finalizado");

    try {
      await onFinal?.(blobFinal);
    } catch (error) {
      console.error(
        "Error al finalizar el archivo de audio:",
        error
      );

      notificarError(error);
    }
  };

  // =======================================================
  // INICIAR
  // =======================================================

  const iniciar = (timeslice = 1000) => {
    if (recorder.state !== "inactive") {
      return;
    }

    if (finalizado) {
      throw new Error(
        "Este grabador ya finalizó. Creá uno nuevo para otra grabación."
      );
    }

    if (!Number.isFinite(timeslice) || timeslice <= 0) {
      throw new Error(
        "El intervalo de grabación debe ser mayor a cero."
      );
    }

    recorder.start(timeslice);
  };

  // =======================================================
  // PAUSAR
  // =======================================================

  const pausar = () => {
    if (recorder.state !== "recording") {
      return;
    }

    recorder.pause();
  };

  // =======================================================
  // REANUDAR
  // =======================================================

  const reanudar = () => {
    if (recorder.state !== "paused") {
      return;
    }

    recorder.resume();
  };

  // =======================================================
  // DETENER
  // =======================================================

  const detener = () => {
    if (recorder.state === "inactive") {
      return;
    }

    cambiarEstado("deteniendo");

    // MediaRecorder genera un último evento
    // dataavailable al detenerse.
    //
    // No necesitamos solicitar datos manualmente
    // porque stop() ya vacía el buffer pendiente.

    recorder.stop();
  };

  // =======================================================
  // SOLICITAR DATOS
  // =======================================================

  const solicitarDatos = () => {
    if (recorder.state === "inactive") {
      return;
    }

    try {
      recorder.requestData();
    } catch (error) {
      console.error(
        "No se pudieron solicitar datos del grabador:",
        error
      );
    }
  };

  // =======================================================
  // CONSULTAR ESTADO
  // =======================================================

  const obtenerEstado = () => estado;

  const obtenerEstadoNativo = () =>
    recorder.state;

  // =======================================================
  // API PÚBLICA
  // =======================================================

  return {
    recorder,
    iniciar,
    pausar,
    reanudar,
    detener,
    solicitarDatos,
    obtenerEstado,
    obtenerEstadoNativo,
  };
};
