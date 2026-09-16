import { supabase } from "../lib/supabase.js";


// =========================================================
// CREAR CLASE
// =========================================================

export const crearClase = async ({
  id,
  userId,
  nombre,
  tema,
  docente,
  estado = "enClase",
  iniciadaEn,
}) => {
  if (!userId) {
    throw new Error(
      "No hay un usuario autenticado."
    );
  }

  const datos = {
    user_id: userId,

    name:
      nombre?.trim() ||
      "Clase sin nombre",

    subject:
      tema?.trim() ||
      null,

    teacher:
      docente?.trim() ||
      null,

    status: estado,

    started_at:
      iniciadaEn ||
      new Date().toISOString(),
  };

  /*
   * Si Hilo ya generó un UUID válido,
   * usamos el mismo ID local y remoto.
   */
  if (id) {
    datos.id = id;
  }

  const {
    data,
    error,
  } = await supabase
    .from("classes")
    .insert(datos)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};


// =========================================================
// OBTENER TODAS LAS CLASES DEL USUARIO
// =========================================================

export const obtenerClases = async (
  userId
) => {
  if (!userId) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from("classes")
    .select("*")
    .eq("user_id", userId)
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (error) {
    throw error;
  }

  return data || [];
};


// =========================================================
// OBTENER UNA CLASE
// =========================================================

export const obtenerClasePorId =
  async (
    claseId,
    userId
  ) => {
    if (
      !claseId ||
      !userId
    ) {
      return null;
    }

    const {
      data,
      error,
    } = await supabase
      .from("classes")
      .select("*")
      .eq("id", claseId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  };


// =========================================================
// ACTUALIZAR CLASE
// =========================================================

export const actualizarClase =
  async (
    claseId,
    userId,
    cambios
  ) => {
    if (
      !claseId ||
      !userId
    ) {
      throw new Error(
        "Falta la clase o el usuario."
      );
    }

    const datos = {};

    if (
      cambios.nombre !==
      undefined
    ) {
      datos.name =
        cambios.nombre?.trim() ||
        "Clase sin nombre";
    }

    if (
      cambios.tema !==
      undefined
    ) {
      datos.subject =
        cambios.tema?.trim() ||
        null;
    }

    if (
      cambios.docente !==
      undefined
    ) {
      datos.teacher =
        cambios.docente?.trim() ||
        null;
    }

    if (
      cambios.estado !==
      undefined
    ) {
      datos.status =
        cambios.estado;
    }

    if (
      cambios.duracionSegundos !==
      undefined
    ) {
      datos.duration_seconds =
        Math.max(
          0,
          Math.floor(
            Number(
              cambios.duracionSegundos
            ) || 0
          )
        );
    }

    if (
      cambios.iniciadaEn !==
      undefined
    ) {
      datos.started_at =
        cambios.iniciadaEn;
    }

    if (
      cambios.finalizadaEn !==
      undefined
    ) {
      datos.finished_at =
        cambios.finalizadaEn;
    }

    const {
      data,
      error,
    } = await supabase
      .from("classes")
      .update(datos)
      .eq("id", claseId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  };


// =========================================================
// FINALIZAR CLASE
// =========================================================

export const finalizarClaseRemota =
  async ({
    claseId,
    userId,
    duracionSegundos = 0,
    finalizadaEn,
  }) => {
    return actualizarClase(
      claseId,
      userId,
      {
        estado: "taller",

        duracionSegundos,

        finalizadaEn:
          finalizadaEn ||
          new Date().toISOString(),
      }
    );
  };


// =========================================================
// ELIMINAR CLASE
// =========================================================

export const eliminarClase =
  async (
    claseId,
    userId
  ) => {
    if (
      !claseId ||
      !userId
    ) {
      throw new Error(
        "Falta la clase o el usuario."
      );
    }

    const {
      error,
    } = await supabase
      .from("classes")
      .delete()
      .eq("id", claseId)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    return true;
  };