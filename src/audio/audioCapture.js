
// =========================================================
// CAPTURAR AUDIO DEL MICRÓFONO
// =========================================================

export const capturarMicrofono = async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      "Este navegador no permite capturar el micrófono."
    );
  }

  const sourceStream =
    await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

  const audioTracks = sourceStream.getAudioTracks();

  if (audioTracks.length === 0) {
    detenerStream(sourceStream);

    throw new Error(
      "No se encontró una pista de audio del micrófono."
    );
  }

  const audioStream = new MediaStream(audioTracks);

  return {
    sourceStream,
    audioStream,
  };
};

// =========================================================
// CAPTURAR AUDIO DE LA COMPUTADORA
// =========================================================

export const capturarAudioComputadora = async () => {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error(
      "Este navegador no permite capturar audio de pantalla."
    );
  }

  const sourceStream =
    await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });

  const audioTracks = sourceStream.getAudioTracks();

  if (audioTracks.length === 0) {
    detenerStream(sourceStream);

    throw new Error(
      "No se detectó audio. Activá la opción de compartir audio al seleccionar la pantalla o pestaña."
    );
  }

  const audioStream = new MediaStream(audioTracks);

  return {
    sourceStream,
    audioStream,
  };
};

// =========================================================
// DETECTAR FIN DE CAPTURA
// =========================================================

export const escucharFinCaptura = (
  sourceStream,
  callback
) => {
  if (!sourceStream) {
    return () => {};
  }

  const tracks = [
    ...sourceStream.getVideoTracks(),
    ...sourceStream.getAudioTracks(),
  ];

  if (tracks.length === 0) {
    return () => {};
  }

  let finalizado = false;

  const manejarFin = () => {
    if (finalizado) return;

    finalizado = true;

    try {
      callback?.();
    } catch (error) {
      console.error(
        "Error al finalizar la captura:",
        error
      );
    }
  };

  tracks.forEach((track) => {
    track.addEventListener("ended", manejarFin);
  });

  // Si una pista ya había terminado antes de
  // registrar los eventos, detectamos ese caso.
  if (
    tracks.some((track) => track.readyState === "ended")
  ) {
    manejarFin();
  }

  // Devolvemos una función para quitar
  // todos los listeners registrados.
  return () => {
    finalizado = true;

    tracks.forEach((track) => {
      track.removeEventListener(
        "ended",
        manejarFin
      );
    });
  };
};

// =========================================================
// DETENER UN STREAM
// =========================================================

export const detenerStream = (stream) => {
  if (!stream) return;

  stream.getTracks().forEach((track) => {
    try {
      if (track.readyState !== "ended") {
        track.stop();
      }
    } catch (error) {
      console.error(
        "No se pudo detener una pista de audio o video:",
        error
      );
    }
  });
};

// =========================================================
// DETENER VARIOS STREAMS
// =========================================================

export const detenerStreams = (...streams) => {
  const tracks = new Set();

  streams.filter(Boolean).forEach((stream) => {
    stream.getTracks().forEach((track) => {
      tracks.add(track);
    });
  });

  // Set evita detener dos veces la misma pista
  // cuando sourceStream y audioStream la comparten.
  tracks.forEach((track) => {
    try {
      if (track.readyState !== "ended") {
        track.stop();
      }
    } catch (error) {
      console.error(
        "No se pudo detener una pista de audio o video:",
        error
      );
    }
  });
};
