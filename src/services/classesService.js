import { supabase } from "../lib/supabase.js";


// =========================================================
// TRADUCIR ESTADOS HILO -> SUPABASE
// =========================================================

const estadoParaSupabase = (estado) => {
  const mapa = {
    enClase: "active",
    taller: "finished",
    archivado: "archived",

    // También aceptamos directamente
    // los estados válidos de Supabase.
    active: "active",
    finished: "finished",
    archived: "archived",
  };

  return mapa[estado] || "active";
};


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

    // Hilo usa "enClase".
    // Supabase espera "active".
    status:
      estadoParaSupabase(
        estado
      ),

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
      .eq(
        "id",
        claseId
      )
      .eq(
        "user_id",
        userId
      )
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
        estadoParaSupabase(
          cambios.estado
        );
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
      .eq(
        "id",
        claseId
      )
      .eq(
        "user_id",
        userId
      )
      .select()
      .maybeSingle();


    if (error) {
      throw error;
    }


    if (!data) {
      throw new Error(
        "La clase no existe en Supabase o no pertenece al usuario."
      );
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
        // Internamente Hilo puede seguir
        // llamando "taller" a este estado.
        // estadoParaSupabase() lo convierte
        // en "finished".
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
      .eq(
        "id",
        claseId
      )
      .eq(
        "user_id",
        userId
      );


    if (error) {
      throw error;
    }


    return true;
  };