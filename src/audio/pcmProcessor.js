const WORKLET_URL =
  "/audio/pcm16-worklet.js";


export const crearProcesadorPCM =
  async ({
    stream,
    onAudioData,
    onError,
  }) => {
    if (!stream) {
      throw new Error(
        "No se recibió ningún stream de audio."
      );
    }


    if (
      typeof AudioContext ===
        "undefined" &&
      typeof webkitAudioContext ===
        "undefined"
    ) {
      throw new Error(
        "Este navegador no soporta Web Audio API."
      );
    }


    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;


    const audioContext =
      new AudioContextClass();


    try {
      await audioContext
        .audioWorklet
        .addModule(
          WORKLET_URL
        );


      if (
        audioContext.state ===
        "suspended"
      ) {
        await audioContext.resume();
      }


      const source =
        audioContext
          .createMediaStreamSource(
            stream
          );


      const worklet =
        new AudioWorkletNode(
          audioContext,
          "pcm16-processor"
        );


      // Recibir PCM16

      worklet.port.onmessage =
        (event) => {
          const data =
            event.data;


          if (
            !data ||
            data.byteLength === 0
          ) {
            return;
          }


          onAudioData?.(
            data
          );
        };


      worklet.onprocessorerror =
        (event) => {
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


      // No enviamos audio al parlante

      const silentGain =
        audioContext
          .createGain();


      silentGain.gain.value =
        0;


      source.connect(
        worklet
      );


      worklet.connect(
        silentGain
      );


      silentGain.connect(
        audioContext.destination
      );


      // Control del procesador

      const detener =
        async () => {
          try {
            source.disconnect();
          } catch {
            // Ya estaba desconectado
          }


          try {
            worklet.disconnect();
          } catch {
            // Ya estaba desconectado
          }


          try {
            silentGain.disconnect();
          } catch {
            // Ya estaba desconectado
          }


          worklet.port.onmessage =
            null;


          if (
            audioContext.state !==
            "closed"
          ) {
            await audioContext.close();
          }
        };


      const pausar =
        async () => {
          if (
            audioContext.state ===
            "running"
          ) {
            await audioContext.suspend();
          }
        };


      const reanudar =
        async () => {
          if (
            audioContext.state ===
            "suspended"
          ) {
            await audioContext.resume();
          }
        };


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


      if (
        audioContext.state !==
        "closed"
      ) {
        await audioContext.close();
      }


      onError?.(
        error
      );


      throw error;
    }
  };