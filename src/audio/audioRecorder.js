const obtenerMimeType =
  () => {
    if (
      typeof MediaRecorder ===
      "undefined"
    ) {
      return "";
    }

    const tipos = [
      "audio/webm;codecs=opus",
      "audio/ogg;codecs=opus",
      "audio/webm",
    ];

    for (
      const tipo of tipos
    ) {
      if (
        MediaRecorder
          .isTypeSupported(
            tipo
          )
      ) {
        return tipo;
      }
    }

    return "";
  };


// Crear grabador

export const crearGrabadorAudio =
  ({
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

    if (
      typeof MediaRecorder ===
      "undefined"
    ) {
      throw new Error(
        "Este navegador no soporta MediaRecorder."
      );
    }

    const mimeType =
      obtenerMimeType();

    const opciones =
      mimeType
        ? {
            mimeType,
          }
        : undefined;

    const recorder =
      new MediaRecorder(
        stream,
        opciones
      );

    const chunks = [];

    let estado =
      "inactivo";

    let finalizado =
      false;


    const cambiarEstado =
      (nuevoEstado) => {
        estado =
          nuevoEstado;

        onEstado?.(
          nuevoEstado
        );
      };


    recorder.onstart =
      () => {
        cambiarEstado(
          "grabando"
        );
      };


    recorder.onpause =
      () => {
        cambiarEstado(
          "pausado"
        );
      };


    recorder.onresume =
      () => {
        cambiarEstado(
          "grabando"
        );
      };


    recorder.onerror =
      (event) => {
        const error =
          event.error ||
          new Error(
            "Ocurrió un error durante la grabación."
          );

        cambiarEstado(
          "error"
        );

        onError?.(
          error
        );
      };


    recorder.ondataavailable =
      (event) => {
        if (
          !event.data ||
          event.data.size === 0
        ) {
          return;
        }

        chunks.push(
          event.data
        );

        onChunk?.(
          event.data
        );
      };


    recorder.onstop =
      () => {
        if (finalizado) {
          return;
        }

        finalizado =
          true;

        const tipoFinal =
          recorder.mimeType ||
          mimeType ||
          chunks[0]?.type ||
          "audio/webm";

        const blob =
          new Blob(
            chunks,
            {
              type:
                tipoFinal,
            }
          );

        cambiarEstado(
          "finalizado"
        );

        onFinal?.(
          blob
        );
      };


    const iniciar =
      (
        timeslice = 1000
      ) => {
        if (
          recorder.state !==
          "inactive"
        ) {
          return;
        }

        recorder.start(
          timeslice
        );
      };


    const pausar =
      () => {
        if (
          recorder.state !==
          "recording"
        ) {
          return;
        }

        recorder.pause();
      };


    const reanudar =
      () => {
        if (
          recorder.state !==
          "paused"
        ) {
          return;
        }

        recorder.resume();
      };


    const detener =
      () => {
        if (
          recorder.state ===
          "inactive"
        ) {
          return;
        }

        cambiarEstado(
          "deteniendo"
        );

        recorder.stop();
      };


    const solicitarDatos =
      () => {
        if (
          recorder.state ===
          "inactive"
        ) {
          return;
        }

        recorder.requestData();
      };


    const obtenerEstado =
      () => {
        return estado;
      };


    const obtenerEstadoNativo =
      () => {
        return recorder.state;
      };


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