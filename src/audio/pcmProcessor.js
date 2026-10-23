
const WORKLET_URL = "/audio/pcm16-worklet.js";

const FLUSH_TIMEOUT = 1000;

// =========================================================
// CREAR PROCESADOR PCM
// =========================================================

export const crearProcesadorPCM = async ({
  stream,
  onAudioData,
  onError,
}) => {
  if (!stream) {
    throw new Error(
      "No se recibió ningún stream de audio."
    );
  }

  const AudioContextClass =
    window.AudioContext ||
    window.webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error(
      "Este navegador no soporta Web Audio API."
    );
  }

  const audioContext = new AudioContextClass();

  let source = null;
  let worklet = null;
  let silentGain = null;

  let detenido = false;
  let pausado = false;
  let finalizando = false;

  let promesaDetencion = null;
  let resolverFlush = null;
  let flushTimeoutId = null;
  let flushRequestId = 0;

  // =======================================================
  // ENVIAR AUDIO PCM
  // =======================================================

  const entregarAudio = (data) => {
    if (detenido || pausado) return;

    if (!(data instanceof ArrayBuffer)) return;

    if (data.byteLength === 0) return;

    try {
      onAudioData?.(data);
    } catch (error) {
      console.error(
        "Error enviando datos PCM:",
        error
      );

      onError?.(error);
    }
  };

  // =======================================================
  // LIBERAR NODOS
  // =======================================================

  const desconectarNodos = () => {
    if (worklet) {
      worklet.port.onmessage = null;
      worklet.onprocessorerror = null;
    }

    try {
      source?.disconnect();
    } catch {
      // El nodo ya puede estar desconectado.
    }

    try {
      worklet?.disconnect();
    } catch {
      // El nodo ya puede estar desconectado.
    }

    try {
      silentGain?.disconnect();
    } catch {
      // El nodo ya puede estar desconectado.
    }
  };

  // =======================================================
  // RESOLVER FLUSH
  // =======================================================

  const completarFlush = () => {
    if (flushTimeoutId !== null) {
      clearTimeout(flushTimeoutId);
      flushTimeoutId = null;
    }

    const resolver = resolverFlush;
    resolverFlush = null;

    resolver?.();
  };

  // =======================================================
  // SOLICITAR ÚLTIMO FRAGMENTO PCM
  // =======================================================

  const vaciarBuffer = async () => {
    if (!worklet) return;

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    if (audioContext.state !== "running") {
      return;
    }

    const requestId = ++flushRequestId;

    await new Promise((resolve) => {
      resolverFlush = resolve;

      flushTimeoutId = setTimeout(() => {
        console.warn(
          "El AudioWorklet no confirmó el flush."
        );

        completarFlush();
      }, FLUSH_TIMEOUT);

      try {
        worklet.port.postMessage({
          type: "flush",
          requestId,
        });
      } catch (error) {
        console.error(
          "No se pudo solicitar el flush PCM:",
          error
        );

        completarFlush();
      }
    });
  };

  // =======================================================
  // DETENER PROCESADOR
  // =======================================================

  const detener = () => {
    if (promesaDetencion) {
      return promesaDetencion;
    }

    finalizando = true;

    promesaDetencion = (async () => {
      try {
        // Si estaba pausado, reactivamos brevemente
        // el contexto para vaciar el buffer pendiente.
        pausado = false;

        await vaciarBuffer();

        // Una vez procesado el último fragmento,
        // dejamos de aceptar datos.
        detenido = true;

        if (worklet) {
          try {
            worklet.port.postMessage({
              type: "stop",
            });
          } catch {
            // El puerto puede estar cerrado.
          }
        }
      } finally {
        detenido = true;

        completarFlush();
        desconectarNodos();

        if (audioContext.state !== "closed") {
          await audioContext.close();
        }
      }
    })();

    return promesaDetencion;
  };

  try {
    // =====================================================
    // COMPROBAR AUDIOWORKLET
    // =====================================================

    if (!audioContext.audioWorklet) {
      throw new Error(
        "Este navegador no soporta AudioWorklet."
      );
    }

    // =====================================================
    // CARGAR WORKLET
    // =====================================================

    await audioContext.audioWorklet.addModule(
      WORKLET_URL
    );

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    // =====================================================
    // CREAR NODOS
    // =====================================================

    source =
      audioContext.createMediaStreamSource(stream);

    worklet = new AudioWorkletNode(
      audioContext,
      "pcm16-processor"
    );

    silentGain = audioContext.createGain();
    silentGain.gain.value = 0;

    // =====================================================
    // RECIBIR MENSAJES DEL WORKLET
    // =====================================================

    worklet.port.onmessage = (event) => {
      const data = event.data;

      // Confirmación del vaciado final.
      if (
        data?.type === "flushed" &&
        data.requestId === flushRequestId
      ) {
        completarFlush();
        return;
      }

      // Los fragmentos PCM pueden llegar
      // durante el proceso de finalización.
      if (data instanceof ArrayBuffer) {
        entregarAudio(data);
      }
    };

    // =====================================================
    // MANEJAR ERRORES DEL WORKLET
    // =====================================================

    worklet.onprocessorerror = (event) => {
      if (detenido) return;

      console.error(
        "Error procesando audio PCM:",
        event
      );

      onError?.(
        new Error(
          "Ocurrió un error procesando el audio."
        )
      );
    };

    // =====================================================
    // CONECTAR NODOS
    // =====================================================

    // El gain silencioso permite procesar audio
    // sin reproducirlo por los parlantes.
    source.connect(worklet);

    worklet.connect(silentGain);

    silentGain.connect(audioContext.destination);

    // =====================================================
    // PAUSAR
    // =====================================================

    const pausar = async () => {
      if (
        detenido ||
        finalizando ||
        pausado
      ) {
        return;
      }

      pausado = true;

      try {
        if (audioContext.state === "running") {
          await audioContext.suspend();
        }
      } catch (error) {
        pausado = false;

        onError?.(error);
        throw error;
      }
    };

    // =====================================================
    // REANUDAR
    // =====================================================

    const reanudar = async () => {
      if (
        detenido ||
        finalizando ||
        !pausado
      ) {
        return;
      }

      try {
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }

        if (!detenido && !finalizando) {
          pausado = false;
        }
      } catch (error) {
        onError?.(error);
        throw error;
      }
    };

    // =====================================================
    // DEVOLVER INTERFAZ
    // =====================================================

    return {
      audioContext,
      source,
      worklet,
      detener,
      pausar,
      reanudar,
    };
  } catch (error) {
    console.error(
      "No se pudo iniciar el procesador PCM:",
      error
    );

    try {
      await detener();
    } catch (errorCierre) {
      console.error(
        "No se pudo liberar el contexto de audio:",
        errorCierre
      );
    }

    onError?.(error);

    throw error;
  }
};
