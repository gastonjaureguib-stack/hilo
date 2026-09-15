import {
  formatearTiempo,
  normalizarTiempo,
} from "./timeUtils.js";


// Crear bloque de transcripción

export const crearBloqueTranscripcion =
  ({
    texto,
    tiempoSegundos,
    fecha,
    id,
  }) => {
    const textoLimpio =
      texto?.trim();


    if (!textoLimpio) {
      return null;
    }


    const tiempo =
      normalizarTiempo(
        tiempoSegundos
      );


    return {
      id:
        id ||
        crypto.randomUUID(),

      texto:
        textoLimpio,

      tiempoSegundos:
        tiempo,

      tiempoTexto:
        formatearTiempo(
          tiempo
        ),

      fecha:
        fecha ||
        new Date()
          .toISOString(),
    };
  };


// Ordenar transcripción por tiempo

export const ordenarTranscripcion =
  (
    transcripcion = []
  ) => {
    return [
      ...transcripcion,
    ].sort(
      (
        a,
        b
      ) =>
        normalizarTiempo(
          a.tiempoSegundos
        ) -
        normalizarTiempo(
          b.tiempoSegundos
        )
    );
  };


// Obtener últimos minutos

export const obtenerUltimosMinutos =
  ({
    transcripcion = [],
    tiempoActual,
    minutos = 5,
  }) => {
    if (
      !Array.isArray(
        transcripcion
      ) ||
      transcripcion.length === 0
    ) {
      return [];
    }


    const actual =
      normalizarTiempo(
        tiempoActual
      );


    const ventana =
      Math.max(
        1,
        minutos
      ) * 60;


    const desde =
      Math.max(
        0,
        actual - ventana
      );


    return ordenarTranscripcion(
      transcripcion
    ).filter(
      (bloque) => {
        const tiempo =
          normalizarTiempo(
            bloque.tiempoSegundos
          );


        return (
          tiempo >= desde &&
          tiempo <= actual
        );
      }
    );
  };


// Obtener bloques cercanos a un momento

export const obtenerFragmentoCercano =
  ({
    transcripcion = [],
    tiempoActual,
    segundosAntes = 30,
    segundosDespues = 5,
  }) => {
    if (
      !Array.isArray(
        transcripcion
      ) ||
      transcripcion.length === 0
    ) {
      return [];
    }


    const actual =
      normalizarTiempo(
        tiempoActual
      );


    const desde =
      Math.max(
        0,
        actual -
          segundosAntes
      );


    const hasta =
      actual +
      segundosDespues;


    return ordenarTranscripcion(
      transcripcion
    ).filter(
      (bloque) => {
        const tiempo =
          normalizarTiempo(
            bloque.tiempoSegundos
          );


        return (
          tiempo >= desde &&
          tiempo <= hasta
        );
      }
    );
  };


// Obtener el último bloque

export const obtenerUltimoBloque =
  (
    transcripcion = []
  ) => {
    const bloques =
      ordenarTranscripcion(
        transcripcion
      );


    if (
      bloques.length === 0
    ) {
      return null;
    }


    return bloques[
      bloques.length - 1
    ];
  };


// Convertir bloques a texto

export const bloquesATexto =
  (
    bloques = [],
    {
      incluirTiempo = true,
    } = {}
  ) => {
    if (
      !Array.isArray(
        bloques
      ) ||
      bloques.length === 0
    ) {
      return "";
    }


    return bloques
      .map(
        (bloque) => {
          const texto =
            bloque.texto
              ?.trim();


          if (!texto) {
            return "";
          }


          if (
            !incluirTiempo
          ) {
            return texto;
          }


          const tiempo =
            bloque.tiempoTexto ||
            formatearTiempo(
              bloque.tiempoSegundos
            );


          return (
            `[${tiempo}] ${texto}`
          );
        }
      )
      .filter(Boolean)
      .join("\n\n");
  };


// Crear contexto de los últimos minutos

export const crearContextoReciente =
  ({
    transcripcion = [],
    tiempoActual,
    minutos = 5,
  }) => {
    const bloques =
      obtenerUltimosMinutos({
        transcripcion,
        tiempoActual,
        minutos,
      });


    return {
      bloques,

      texto:
        bloquesATexto(
          bloques
        ),

      cantidadBloques:
        bloques.length,

      desde:
        bloques[0]
          ?.tiempoSegundos ??
        null,

      hasta:
        bloques[
          bloques.length - 1
        ]?.tiempoSegundos ??
        null,
    };
  };


// Crear fragmento importante

export const crearFragmentoImportante =
  ({
    transcripcion = [],
    tiempoActual,
  }) => {
    const bloques =
      obtenerFragmentoCercano({
        transcripcion,
        tiempoActual,

        segundosAntes:
          30,

        segundosDespues:
          0,
      });


    return {
      bloques,

      texto:
        bloquesATexto(
          bloques
        ),

      tiempoSegundos:
        normalizarTiempo(
          tiempoActual
        ),

      tiempoTexto:
        formatearTiempo(
          tiempoActual
        ),
    };
  };