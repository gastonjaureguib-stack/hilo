import {
  bloquesATexto,
} from "./transcriptUtils.js";


// Datos comunes de clase

const construirEncabezadoClase = (
  clase = {}
) => {
  return [
    `Clase: ${clase.nombre || "No especificada"}`,
    `Tema: ${clase.tema || "No especificado"}`,
    `Docente: ${clase.docente || "No especificado"}`,
  ].join("\n");
};


// Prompt para "Perdí el hilo"

export const construirPromptNoEntendi =
  ({
    clase,
    momento,
  }) => {
    if (!momento) {
      return "";
    }


    const bloques =
      momento.bloques ||
      momento.contexto?.bloques ||
      [];


    const transcripcion =
      bloquesATexto(
        bloques
      ) ||
      momento.texto ||
      "No hay transcripción disponible.";


    return `
${construirEncabezadoClase(clase)}

Perdí el hilo durante esta explicación.

Explicame de forma clara y ordenada qué está explicando el docente.

No uses analogías.

Primero indicame cuál es el concepto principal.

Después explicame paso a paso el razonamiento.

Si aparecen conceptos técnicos, respetá los términos usados en la clase.

TRANSCRIPCIÓN DE LOS ÚLTIMOS 5 MINUTOS:

${transcripcion}
`.trim();
  };


// Prompt para mejorar una pregunta

export const construirPromptPregunta =
  ({
    clase,
    duda,
    contexto = "",
  }) => {
    const texto =
      duda?.trim();


    if (!texto) {
      return "";
    }


    return `
${construirEncabezadoClase(clase)}

Quiero hacerle una pregunta al docente.

Esta es mi duda escrita de forma informal:

"${texto}"

${contexto
  ? `Contexto reciente de la clase:

${contexto}

`
  : ""}

Convertí mi duda en una pregunta técnica, clara y breve.

No respondas la pregunta.

No agregues explicaciones.

Devolvé solamente la pregunta reformulada.
`.trim();
  };


// Prompt para revisar un momento importante

export const construirPromptImportante =
  ({
    clase,
    importante,
  }) => {
    if (!importante) {
      return "";
    }


    const contexto =
      bloquesATexto(
        importante.bloques ||
        []
      ) ||
      importante.texto ||
      "No hay transcripción disponible.";


    return `
${construirEncabezadoClase(clase)}

Marqué este momento como importante durante la clase.

Quiero entender exactamente qué concepto debería recordar.

Explicalo de forma directa y ordenada.

No uses analogías.

Indicame:

1. Concepto principal.
2. Explicación breve.
3. Qué debería anotar en mi cuaderno.
4. Qué término técnico debo recordar.

FRAGMENTO DE LA CLASE:

${contexto}
`.trim();
  };


// Prompt general de estudio

export const construirPromptEstudio =
  ({
    hiloActual,
  }) => {
    if (!hiloActual) {
      return "";
    }


    const transcripcion =
      bloquesATexto(
        hiloActual.transcripcion ||
        []
      ) ||
      "No hay transcripción disponible.";


    const notas =
      (hiloActual.notas || [])
        .map(
          (
            nota,
            index
          ) =>
            `${index + 1}. ${
              nota.tiempoTexto
                ? `[${nota.tiempoTexto}] `
                : ""
            }${nota.texto}`
        )
        .join("\n") ||
      "No se guardaron notas.";


    const preguntas =
      (hiloActual.preguntas || [])
        .map(
          (
            pregunta,
            index
          ) =>
            `${index + 1}. ${
              pregunta.tiempoTexto
                ? `[${pregunta.tiempoTexto}] `
                : ""
            }${pregunta.texto}`
        )
        .join("\n") ||
      "No se guardaron preguntas.";


    const importantes =
      (hiloActual.importantes || [])
        .map(
          (
            importante,
            index
          ) =>
            `${index + 1}. ${
              importante.tiempoTexto
                ? `[${importante.tiempoTexto}] `
                : ""
            }${importante.texto}`
        )
        .join("\n\n") ||
      "No se marcaron momentos importantes.";


    const noEntendi =
      (hiloActual.noEntendi || [])
        .map(
          (
            momento,
            index
          ) =>
            `${index + 1}. ${
              momento.tiempoTexto
                ? `[${momento.tiempoTexto}] `
                : ""
            }${momento.texto}`
        )
        .join("\n\n") ||
      "No hubo momentos donde perdí el hilo.";


    return `
Quiero estudiar a partir de una clase que acabo de terminar.

${construirEncabezadoClase(
  hiloActual.clase
)}

TRANSCRIPCIÓN

${transcripcion}


MIS NOTAS

${notas}


MIS PREGUNTAS

${preguntas}


MOMENTOS IMPORTANTES

${importantes}


MOMENTOS DONDE PERDÍ EL HILO

${noEntendi}


Quiero trabajar sobre este material.

Primero haceme un resumen claro de la clase.

Después identificá los conceptos principales.

Luego explicame los momentos donde perdí el hilo.

No uses analogías.

Para cada concepto importante, dame una definición corta que pueda copiar a mi cuaderno.
`.trim();
  };