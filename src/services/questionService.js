const API_URL =
  "/api/improve-question";


export const mejorarPregunta =
  async ({
    duda,
    contexto,
    clase,
  }) => {
    if (
      !duda ||
      !duda.trim()
    ) {
      throw new Error(
        "Escribí una duda primero."
      );
    }

    const response =
      await fetch(
        API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              duda:
                duda.trim(),

              contexto:
                contexto || "",

              clase:
                clase?.nombre || "",

              tema:
                clase?.tema || "",

              docente:
                clase?.docente || "",
            }),
        }
      );

    let data;

    try {
      data =
        await response.json();
    } catch {
      throw new Error(
        "El servidor devolvió una respuesta inválida."
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.error ||
          "No se pudo mejorar la pregunta."
      );
    }

    if (
      !data?.pregunta
    ) {
      throw new Error(
        "No se recibió una pregunta válida."
      );
    }

    return data.pregunta.trim();
  };