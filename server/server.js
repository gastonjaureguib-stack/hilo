import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(
  express.json({
    limit: "1mb",
  })
);

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;


// Token temporal AssemblyAI

app.get("/api/assembly-token", async (req, res) => {
  try {
    if (!process.env.ASSEMBLYAI_API_KEY) {
      return res.status(500).json({
        error: "Falta ASSEMBLYAI_API_KEY",
      });
    }

    const response = await fetch(
      "https://streaming.assemblyai.com/v3/token?expires_in_seconds=600",
      {
        headers: {
          Authorization: process.env.ASSEMBLYAI_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();

      console.error(
        "AssemblyAI:",
        response.status,
        error
      );

      return res.status(response.status).json({
        error: "No se pudo obtener el token",
      });
    }

    const data = await response.json();

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error interno del servidor",
    });
  }
});


// Mejorar pregunta al docente

app.post("/api/improve-question", async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).json({
        error: "Falta OPENAI_API_KEY",
      });
    }

    const {
      duda,
      contexto,
      clase,
      tema,
      docente,
    } = req.body;

    if (!duda || !duda.trim()) {
      return res.status(400).json({
        error: "La duda es obligatoria.",
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

    const response = await openai.responses.create({
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

    const pregunta = response.output_text?.trim();

    if (!pregunta) {
      return res.status(500).json({
        error: "La IA no devolvió una pregunta.",
      });
    }

    res.json({
      pregunta,
    });
  } catch (error) {
    console.error("OpenAI:", error);

    res.status(500).json({
      error: "No se pudo mejorar la pregunta.",
    });
  }
});


app.listen(PORT, () => {
  console.log(
    `Servidor Hilo: http://localhost:${PORT}`
  );
});