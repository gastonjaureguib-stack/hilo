export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  try {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;

    if (!apiKey) {
      console.error("Falta ASSEMBLYAI_API_KEY");

      return res.status(500).json({
        error: "Falta ASSEMBLYAI_API_KEY",
      });
    }

    const response = await fetch(
      "https://streaming.assemblyai.com/v3/token?expires_in_seconds=600",
      {
        headers: {
          Authorization: apiKey,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();

      console.error(
        "Error AssemblyAI:",
        response.status,
        error
      );

      return res.status(response.status).json({
        error: "No se pudo obtener el token de AssemblyAI",
      });
    }

    const data = await response.json();

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error obteniendo token AssemblyAI:", error);

    return res.status(500).json({
      error: "Error interno del servidor",
    });
  }
}