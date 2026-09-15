// Obtener audio del micrófono

export const capturarMicrofono =
  async () => {
    if (
      !navigator.mediaDevices
        ?.getUserMedia
    ) {
      throw new Error(
        "Este navegador no permite capturar el micrófono."
      );
    }

    const stream =
      await navigator.mediaDevices
        .getUserMedia({
          audio: true,
        });

    const audioTracks =
      stream.getAudioTracks();

    if (
      audioTracks.length === 0
    ) {
      stream
        .getTracks()
        .forEach(
          (track) =>
            track.stop()
        );

      throw new Error(
        "No se encontró una pista de audio del micrófono."
      );
    }

    const audioStream =
      new MediaStream(
        audioTracks
      );

    return {
      sourceStream:
        stream,

      audioStream,
    };
  };


// Obtener audio de la computadora

export const capturarAudioComputadora =
  async () => {
    if (
      !navigator.mediaDevices
        ?.getDisplayMedia
    ) {
      throw new Error(
        "Este navegador no permite capturar audio de pantalla."
      );
    }

    const sourceStream =
      await navigator.mediaDevices
        .getDisplayMedia({
          video: true,
          audio: true,
        });

    const audioTracks =
      sourceStream
        .getAudioTracks();

    if (
      audioTracks.length === 0
    ) {
      sourceStream
        .getTracks()
        .forEach(
          (track) =>
            track.stop()
        );

      throw new Error(
        "No se detectó audio. Activá la opción de compartir audio al seleccionar la pantalla o pestaña."
      );
    }

    const audioStream =
      new MediaStream(
        audioTracks
      );

    return {
      sourceStream,
      audioStream,
    };
  };


// Escuchar cuándo termina la captura de pantalla

export const escucharFinCaptura =
  (
    sourceStream,
    callback
  ) => {
    if (!sourceStream) {
      return () => {};
    }

    const videoTrack =
      sourceStream
        .getVideoTracks()[0];

    if (!videoTrack) {
      return () => {};
    }

    const manejarFin =
      () => {
        callback?.();
      };

    videoTrack.addEventListener(
      "ended",
      manejarFin
    );

    return () => {
      videoTrack.removeEventListener(
        "ended",
        manejarFin
      );
    };
  };


// Detener un stream

export const detenerStream =
  (stream) => {
    if (!stream) {
      return;
    }

    stream
      .getTracks()
      .forEach(
        (track) => {
          try {
            track.stop();
          } catch {
            // Track ya detenido
          }
        }
      );
  };


// Detener varios streams sin duplicar tracks

export const detenerStreams =
  (...streams) => {
    const tracks =
      new Set();

    streams
      .filter(Boolean)
      .forEach(
        (stream) => {
          stream
            .getTracks()
            .forEach(
              (track) =>
                tracks.add(
                  track
                )
            );
        }
      );

    tracks.forEach(
      (track) => {
        try {
          track.stop();
        } catch {
          // Track ya detenido
        }
      }
    );
  };