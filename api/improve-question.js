import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error("Falta OPENAI_API_KEY");

      return res.status(500).json({
        error: "Falta OPENAI_API_KEY",
      });
    }

    const openai =
      new OpenAI({
        apiKey:
          process.env.OPENAI_API_KEY,
      });

    const {
      duda,
      contexto,
      clase,
      tema,
      docente,
    } = req.body || {};

    if (
      !duda ||
      !duda.trim()
    ) {
      return res.status(400).json({
        error:
          "La duda es obligatoria.",
      });
    }

    const instrucciones = `
Sos una función dentro de una aplicación de estudio llamada Hilo.

El estudiante está en una clase en vivo y quiere formular una pregunta al docente.

Tu trabajo es transformar la duda informal del estudiante en una pregunta técnica, clara, breve y natural.

Reglas:
- Devolvé solamente la pregunta final.
- No respondas la duda.
- No agregues explicaciones.
- No saludes.
- No uses listas.
- No inventes información.
- Usá el contexto reciente de la clase para entender mejor la duda.
- Conservá los términos técnicos usados en la clase.
- La pregunta debe poder decirse en voz alta al docente.
- No debe sonar exageradamente formal.
- Evitá preguntas genéricas si podés formular algo más concreto.
`.trim();

    const datosClase = `
Clase: ${clase || "No especificada"}

Tema: ${tema || "No especificado"}

Docente: ${docente || "No especificado"}

Contexto reciente de la clase:
${contexto || "No hay contexto disponible."}

Duda informal del estudiante:
${duda}
`.trim();

    const response =
      await openai.responses.create({
        model: "gpt-5.6-luna",

        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: instrucciones,
              },
            ],
          },

          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: datosClase,
              },
            ],
          },
        ],

        max_output_tokens: 120,
      });

    const pregunta =
      response.output_text?.trim();

    if (!pregunta) {
      return res.status(500).json({
        error:
          "La IA no devolvió una pregunta.",
      });
    }

    return res.status(200).json({
      pregunta,
    });
  } catch (error) {
    console.error(
      "Error OpenAI:",
      error
    );

    return res.status(500).json({
      error:
        "No se pudo mejorar la pregunta.",
    });
  }
}