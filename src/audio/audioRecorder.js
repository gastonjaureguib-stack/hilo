import fixWebmDuration from "fix-webm-duration";


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


// =========================================================
// CREAR GRABADOR
// =========================================================

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


    // =====================================================
    // CONTROL DE DURACIÓN
    // =====================================================

    let inicioGrabacion =
      null;

    let inicioPausa =
      null;

    let tiempoPausado =
      0;


    const cambiarEstado =
      (nuevoEstado) => {
        estado =
          nuevoEstado;

        onEstado?.(
          nuevoEstado
        );
      };


    // =====================================================
    // EVENTOS DEL MEDIARECORDER
    // =====================================================

    recorder.onstart =
      () => {
        inicioGrabacion =
          performance.now();

        inicioPausa =
          null;

        tiempoPausado =
          0;

        cambiarEstado(
          "grabando"
        );
      };


    recorder.onpause =
      () => {
        inicioPausa =
          performance.now();

        cambiarEstado(
          "pausado"
        );
      };


    recorder.onresume =
      () => {
        if (
          inicioPausa !==
          null
        ) {
          tiempoPausado +=
            performance.now() -
            inicioPausa;

          inicioPausa =
            null;
        }

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


    // =====================================================
    // FINALIZAR
    // =====================================================

    recorder.onstop =
      async () => {
        if (finalizado) {
          return;
        }

        finalizado =
          true;


        // Si se detuvo mientras estaba
        // pausado, contamos esa última pausa.

        if (
          inicioPausa !==
          null
        ) {
          tiempoPausado +=
            performance.now() -
            inicioPausa;

          inicioPausa =
            null;
        }


        const finGrabacion =
          performance.now();


        const duracionReal =
          inicioGrabacion !==
          null
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


        const blobOriginal =
          new Blob(
            chunks,
            {
              type:
                tipoFinal,
            }
          );


        let blobFinal =
          blobOriginal;


        // =================================================
        // CORREGIR METADATA WEBM
        // =================================================

        try {
          const esWebM =
            tipoFinal
              .toLowerCase()
              .includes(
                "webm"
              );


          if (
            esWebM &&
            blobOriginal.size >
              0
          ) {
            blobFinal =
              await fixWebmDuration(
                blobOriginal,
                duracionReal,
                {
                  logger:
                    false,
                }
              );
          }

        } catch (error) {
          /*
            Si por alguna razón falla
            la corrección de metadata,
            NO perdemos la grabación.

            Guardamos el Blob original.
          */

          console.error(
            "No se pudo corregir la duración del WebM:",
            error
          );

          blobFinal =
            blobOriginal;
        }


        cambiarEstado(
          "finalizado"
        );


        onFinal?.(
          blobFinal
        );
      };


    // =====================================================
    // CONTROLES
    // =====================================================

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


        /*
          Pedimos el último fragmento antes
          de detener el MediaRecorder.

          ondataavailable puede dispararse
          una vez más antes de onstop.
        */

        try {
          recorder.requestData();
        } catch {
          // Algunos navegadores pueden
          // rechazar requestData al detener.
        }


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