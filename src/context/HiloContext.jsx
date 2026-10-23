
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { useAuth } from "./AuthContext.jsx";

import {
  guardarClaseLocal,
  obtenerClaseLocal,
  borrarChunksAudio,
  obtenerChunksAudio,
  guardarClaseTerminada,
  migrarDatosLegacy,
} from "../utils/hiloStorage.js";

import {
  crearBloqueTranscripcion,
  crearContextoReciente,
  crearFragmentoImportante,
} from "../utils/transcriptUtils.js";

import { formatearTiempo } from "../utils/timeUtils.js";
import { relojClase } from "../services/classClock.js";

import {
  crearClase,
  finalizarClaseRemota,
} from "../services/classesService.js";

const HiloContext = createContext(null);

const crearId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (caracter) => {
      const random = (Math.random() * 16) | 0;
      const valor =
        caracter === "x"
          ? random
          : (random & 0x3) | 0x8;

      return valor.toString(16);
    }
  );
};

const crearEstadoInicial = () => ({
  id: null,
  estado: "nuevo",
  iniciadaEn: null,
  finalizadaEn: null,
  duracionSegundos: 0,
  reloj: null,

  clase: {
    nombre: "",
    tema: "",
    docente: "",
  },

  transcripcion: [],
  notas: [],
  preguntas: [],
  importantes: [],
  noEntendi: [],
  branches: [],
  audio: null,
});

export const HiloProvider = ({ children }) => {
  const { user, loading: cargandoAuth } = useAuth();

  const [hiloActual, setHiloActual] = useState(
    crearEstadoInicial
  );

  const [cargandoHilo, setCargandoHilo] = useState(true);
  const [usuarioHiloId, setUsuarioHiloId] = useState(null);

  // Cola para mantener el orden de las escrituras.
  const colaGuardadoRef = useRef(Promise.resolve());

  // Última URL de audio creada por el contexto.
  const audioUrlRef = useRef(null);

  // Último estado disponible para operaciones síncronas.
  const hiloRef = useRef(hiloActual);

  const actualizarHilo = (actualizacion) => {
    const anterior = hiloRef.current;

    const siguiente =
      typeof actualizacion === "function"
        ? actualizacion(anterior)
        : actualizacion;

    hiloRef.current = siguiente;
    setHiloActual(siguiente);

    return siguiente;
  };

  const liberarAudioUrl = () => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  };

  // =========================================================
  // RECUPERAR CLASE DEL USUARIO
  // =========================================================

  useEffect(() => {
    if (cargandoAuth) return;

    let cancelado = false;
    let urlCreada = null;

    const recuperarClase = async () => {
      setCargandoHilo(true);
      setUsuarioHiloId(null);

      if (!user?.id) {
        liberarAudioUrl();
        relojClase.reiniciar();

        if (!cancelado) {
          actualizarHilo(crearEstadoInicial());
          setCargandoHilo(false);
        }

        return;
      }

      try {
        await migrarDatosLegacy(user.id);

        const claseGuardada = await obtenerClaseLocal(user.id);
        const chunksGuardados = await obtenerChunksAudio(user.id);

        if (cancelado) return;

        if (!claseGuardada) {
          liberarAudioUrl();
          relojClase.reiniciar();
          actualizarHilo(crearEstadoInicial());
          return;
        }

        let claseRecuperada = {
          ...crearEstadoInicial(),
          ...claseGuardada,

          id: claseGuardada.id || crearId(),

          clase: {
            nombre: "",
            tema: "",
            docente: "",
            ...(claseGuardada.clase || {}),
          },

          transcripcion: claseGuardada.transcripcion || [],
          notas: claseGuardada.notas || [],
          preguntas: claseGuardada.preguntas || [],
          importantes: claseGuardada.importantes || [],
          noEntendi: claseGuardada.noEntendi || [],
          branches: claseGuardada.branches || [],
        };

        if (claseGuardada.reloj) {
          relojClase.restaurar(claseGuardada.reloj);
        } else {
          relojClase.reiniciar();
        }

        // Recuperar audio completo.
        if (claseGuardada.audio?.blob?.size > 0) {
          urlCreada = URL.createObjectURL(
            claseGuardada.audio.blob
          );

          claseRecuperada = {
            ...claseRecuperada,
            audio: {
              ...claseGuardada.audio,
              url: urlCreada,
            },
          };
        } else if (chunksGuardados.length > 0) {
          // Reconstruir audio desde los fragmentos.
          const blobs = [...chunksGuardados]
            .sort(
              (a, b) =>
                (a.createdAt || 0) - (b.createdAt || 0)
            )
            .map((item) => item.blob)
            .filter(Boolean);

          if (blobs.length > 0) {
            const tipo = blobs[0].type || "audio/webm";

            const audioRecuperado = new Blob(blobs, {
              type: tipo,
            });

            urlCreada = URL.createObjectURL(
              audioRecuperado
            );

            claseRecuperada = {
              ...claseRecuperada,
              audio: {
                blob: audioRecuperado,
                url: urlCreada,
                tipo,
                tamaño: audioRecuperado.size,
                recuperado: true,
              },
            };
          }
        } else if (claseRecuperada.audio) {
          // Una URL blob antigua no sirve tras recargar.
          claseRecuperada.audio = {
            ...claseRecuperada.audio,
            url: null,
          };
        }

        if (cancelado) {
          if (urlCreada) {
            URL.revokeObjectURL(urlCreada);
          }
          return;
        }

        liberarAudioUrl();
        audioUrlRef.current = urlCreada;

        actualizarHilo(claseRecuperada);
      } catch (error) {
        console.error(
          "No se pudo recuperar la clase del usuario:",
          error
        );

        if (urlCreada && audioUrlRef.current !== urlCreada) {
          URL.revokeObjectURL(urlCreada);
        }

        if (!cancelado) {
          liberarAudioUrl();
          relojClase.reiniciar();
          actualizarHilo(crearEstadoInicial());
        }
      } finally {
        if (!cancelado) {
          setUsuarioHiloId(user?.id ?? null);
          setCargandoHilo(false);
        }
      }
    };

    recuperarClase();

    return () => {
      cancelado = true;
    };
  }, [user?.id, cargandoAuth]);

  // Liberar la URL al desmontar el provider.
  useEffect(() => {
    return () => {
      liberarAudioUrl();
    };
  }, []);

  // =========================================================
  // GUARDADO AUTOMÁTICO
  // =========================================================

  useEffect(() => {
    if (
      cargandoAuth ||
      cargandoHilo ||
      !user?.id ||
      usuarioHiloId !== user.id
    ) {
      return;
    }

    const userId = user.id;

    const claseParaGuardar = {
      ...hiloActual,
      reloj: relojClase.obtenerSnapshot(),

      // Las URLs blob son temporales y no se deben
      // considerar válidas después de recargar.
      audio: hiloActual.audio
        ? {
            ...hiloActual.audio,
            url: null,
          }
        : null,
    };

    colaGuardadoRef.current = colaGuardadoRef.current
      .catch(() => {})
      .then(() =>
        guardarClaseLocal(claseParaGuardar, userId)
      )
      .catch((error) => {
        console.error(
          "No se pudo guardar la clase localmente:",
          error
        );
      });
  }, [
    hiloActual,
    cargandoHilo,
    cargandoAuth,
    user?.id,
    usuarioHiloId,
  ]);

  // =========================================================
  // TIEMPO ACTUAL
  // =========================================================

  const obtenerTiempoActual = () => {
    return relojClase.obtenerTiempoRedondeado();
  };

  // =========================================================
  // INICIAR NUEVA CLASE
  // =========================================================

  const iniciarNuevaClase = async (datosClase) => {
    if (!user?.id) {
      throw new Error(
        "Tenés que iniciar sesión para comenzar una clase."
      );
    }

    if (cargandoHilo || usuarioHiloId !== user.id) {
      throw new Error(
        "Esperá a que Hilo termine de cargar tus datos."
      );
    }

    try {
      await borrarChunksAudio(user.id);
    } catch (error) {
      console.error(
        "No se pudieron borrar los fragmentos anteriores:",
        error
      );
    }

    const id = crearId();
    const ahora = new Date().toISOString();

    relojClase.iniciar();

    const nuevaClase = {
      ...crearEstadoInicial(),
      id,
      estado: "enClase",
      iniciadaEn: ahora,
      reloj: relojClase.obtenerSnapshot(),

      clase: {
        nombre: datosClase.nombre || "",
        tema: datosClase.tema || "",
        docente: datosClase.docente || "",
      },
    };

    liberarAudioUrl();
    actualizarHilo(nuevaClase);

    try {
      await crearClase({
        id,
        userId: user.id,
        nombre: nuevaClase.clase.nombre,
        tema: nuevaClase.clase.tema,
        docente: nuevaClase.clase.docente,
        estado: "enClase",
        iniciadaEn: ahora,
      });
    } catch (error) {
      console.error(
        "La clase comenzó localmente, pero no pudo sincronizarse con Supabase:",
        error
      );
    }

    return nuevaClase;
  };

  // =========================================================
  // GUARDAR CLASE EN APUNTES
  // =========================================================

  const guardarClaseEnApuntes = async () => {
    if (!user?.id) {
      throw new Error("Tenés que iniciar sesión.");
    }

    const actual = hiloRef.current;
    const id = actual.id || crearId();

    const claseParaGuardar = {
      ...actual,
      id,
      reloj: relojClase.obtenerSnapshot(),
      guardadaEn: new Date().toISOString(),

      audio: actual.audio
        ? { ...actual.audio, url: null }
        : null,
    };

    const claseGuardada = await guardarClaseTerminada(
      claseParaGuardar,
      user.id
    );

    if (!actual.id) {
      actualizarHilo((prev) => ({
        ...prev,
        id,
      }));
    }

    return claseGuardada;
  };

  // =========================================================
  // PAUSAR RELOJ
  // =========================================================

  const pausarRelojClase = () => {
    relojClase.pausar();

    const reloj = relojClase.obtenerSnapshot();

    actualizarHilo((prev) => ({
      ...prev,
      reloj,
    }));
  };

  // =========================================================
  // REANUDAR RELOJ
  // =========================================================

  const reanudarRelojClase = () => {
    relojClase.reanudar();

    const reloj = relojClase.obtenerSnapshot();

    actualizarHilo((prev) => ({
      ...prev,
      reloj,
    }));
  };

  // =========================================================
  // FINALIZAR CLASE
  // =========================================================

  const finalizarClase = async () => {
    if (!user?.id) {
      throw new Error(
        "Tenés que iniciar sesión para finalizar una clase."
      );
    }

    const duracion = relojClase.finalizar();
    const ahora = new Date().toISOString();

    const actual = hiloRef.current;
    const id = actual.id || crearId();

    const claseTerminada = {
      ...actual,
      id,
      estado: "taller",
      finalizadaEn: ahora,
      duracionSegundos: duracion,
      reloj: relojClase.obtenerSnapshot(),
      guardadaEn: ahora,
    };

    const claseParaGuardar = {
      ...claseTerminada,
      audio: claseTerminada.audio
        ? { ...claseTerminada.audio, url: null }
        : null,
    };

    try {
      const claseGuardada = await guardarClaseTerminada(
        claseParaGuardar,
        user.id
      );

      // Mantener la URL activa para la sesión actual.
      actualizarHilo(claseTerminada);

      try {
        await finalizarClaseRemota({
          claseId: id,
          userId: user.id,
          duracionSegundos: duracion,
          finalizadaEn: ahora,
        });
      } catch (errorSupabase) {
        console.error(
          "La clase quedó guardada localmente, pero no se pudo actualizar en Supabase:",
          errorSupabase
        );
      }

      return claseGuardada;
    } catch (error) {
      console.error(
        "No se pudo guardar la clase terminada:",
        error
      );

      actualizarHilo(claseTerminada);
      throw error;
    }
  };

  // =========================================================
  // GUARDAR AUDIO
  // =========================================================

  const guardarAudio = (blob) => {
    if (!blob || blob.size === 0) {
      return;
    }

    const nuevaUrl = URL.createObjectURL(blob);

    const audio = {
      blob,
      url: nuevaUrl,
      tipo: blob.type || "audio/webm",
      tamaño: blob.size,
      recuperado: false,
    };

    liberarAudioUrl();
    audioUrlRef.current = nuevaUrl;

    actualizarHilo((prev) => ({
      ...prev,
      audio,
    }));

    return audio;
  };

  // =========================================================
  // AGREGAR TRANSCRIPCIÓN
  // =========================================================

  const agregarTranscripcion = (
    texto,
    tiempoPersonalizado
  ) => {
    if (!texto?.trim()) {
      return null;
    }

    const tiempo =
      tiempoPersonalizado ?? obtenerTiempoActual();

    const bloque = crearBloqueTranscripcion({
      texto,
      tiempoSegundos: tiempo,
      fecha: new Date().toISOString(),
    });

    if (!bloque) {
      return null;
    }

    const bloqueCompatible = {
      ...bloque,
      hora: bloque.tiempoTexto,
    };

    const reloj = relojClase.obtenerSnapshot();

    actualizarHilo((prev) => {
      const branches = (prev.branches || []).map(
        (branch) =>
          branch.abierto
            ? {
                ...branch,
                transcripcion: [
                  ...(branch.transcripcion || []),
                  bloqueCompatible,
                ],
              }
            : branch
      );

      return {
        ...prev,
        transcripcion: [
          ...(prev.transcripcion || []),
          bloqueCompatible,
        ],
        branches,
        reloj,
      };
    });

    return bloqueCompatible;
  };

  // =========================================================
  // AGREGAR NOTA
  // =========================================================

  const agregarNota = (
    texto,
    tiempoPersonalizado
  ) => {
    if (!texto?.trim()) {
      return null;
    }

    const tiempo =
      tiempoPersonalizado ?? obtenerTiempoActual();

    const tiempoTexto = formatearTiempo(tiempo);

    const nota = {
      id: crearId(),
      texto: texto.trim(),
      fecha: new Date().toISOString(),
      tiempoSegundos: tiempo,
      tiempoTexto,
      hora: tiempoTexto,
    };

    actualizarHilo((prev) => ({
      ...prev,
      notas: [...(prev.notas || []), nota],
    }));

    return nota;
  };

  // =========================================================
  // AGREGAR PREGUNTA
  // =========================================================

  const agregarPregunta = (
    texto,
    tiempoPersonalizado
  ) => {
    if (!texto?.trim()) {
      return null;
    }

    const tiempo =
      tiempoPersonalizado ?? obtenerTiempoActual();

    const tiempoTexto = formatearTiempo(tiempo);

    const pregunta = {
      id: crearId(),
      texto: texto.trim(),
      fecha: new Date().toISOString(),
      tiempoSegundos: tiempo,
      tiempoTexto,
      hora: tiempoTexto,
    };

    actualizarHilo((prev) => ({
      ...prev,
      preguntas: [
        ...(prev.preguntas || []),
        pregunta,
      ],
    }));

    return pregunta;
  };

  // =========================================================
  // MARCAR MOMENTO IMPORTANTE
  // =========================================================

  const agregarImportante = (tiempoPersonalizado) => {
    const tiempo =
      tiempoPersonalizado ?? obtenerTiempoActual();

    const fragmento = crearFragmentoImportante({
      transcripcion: hiloRef.current.transcripcion || [],
      tiempoActual: tiempo,
    });

    const tiempoTexto = formatearTiempo(tiempo);

    const importante = {
      id: crearId(),
      fecha: new Date().toISOString(),
      tiempoSegundos: tiempo,
      tiempoTexto,
      hora: tiempoTexto,
      texto:
        fragmento?.texto ||
        "Momento importante sin transcripción disponible.",
      bloques: fragmento?.bloques || [],
    };

    actualizarHilo((prev) => ({
      ...prev,
      importantes: [
        ...(prev.importantes || []),
        importante,
      ],
    }));

    return importante;
  };

  // =========================================================
  // MARCAR "NO ENTENDÍ"
  // =========================================================

  const agregarNoEntendi = (tiempoPersonalizado) => {
    const tiempo =
      tiempoPersonalizado ?? obtenerTiempoActual();

    const contexto = crearContextoReciente({
      transcripcion: hiloRef.current.transcripcion || [],
      tiempoActual: tiempo,
      minutos: 1,
    });

    const tiempoTexto = formatearTiempo(tiempo);

    const momento = {
      id: crearId(),
      fecha: new Date().toISOString(),
      tiempoSegundos: tiempo,
      tiempoTexto,
      hora: tiempoTexto,
      texto:
        contexto?.texto ||
        "Todavía no había transcripción disponible.",
      contexto,
      bloques: contexto?.bloques || [],
      desde: contexto?.desde,
      hasta: contexto?.hasta,
    };

    actualizarHilo((prev) => ({
      ...prev,
      noEntendi: [
        ...(prev.noEntendi || []),
        momento,
      ],
    }));

    return momento;
  };

  // =========================================================
  // ABRIR BRANCH
  // =========================================================

  const abrirBranch = () => {
    const hayBranchActivo = (
      hiloRef.current.branches || []
    ).some((branch) => branch.abierto);

    if (hayBranchActivo) {
      return null;
    }

    const tiempo = obtenerTiempoActual();

    const nuevoBranch = {
      id: crearId(),
      nombre: "",
      abierto: true,
      fechaInicio: new Date().toISOString(),
      fechaFin: null,
      inicioSegundos: tiempo,
      inicioTexto: formatearTiempo(tiempo),
      finSegundos: null,
      finTexto: null,
      transcripcion: [],
    };

    actualizarHilo((prev) => ({
      ...prev,
      branches: [
        ...(prev.branches || []),
        nuevoBranch,
      ],
    }));

    return nuevoBranch;
  };

  // =========================================================
  // CERRAR BRANCH
  // =========================================================

  const cerrarBranch = () => {
    const branchActivo = (
      hiloRef.current.branches || []
    ).find((branch) => branch.abierto);

    if (!branchActivo) {
      return null;
    }

    const tiempo = obtenerTiempoActual();

    const branchCerrado = {
      ...branchActivo,
      abierto: false,
      fechaFin: new Date().toISOString(),
      finSegundos: tiempo,
      finTexto: formatearTiempo(tiempo),
    };

    actualizarHilo((prev) => ({
      ...prev,
      branches: (prev.branches || []).map((branch) =>
        branch.id === branchActivo.id
          ? branchCerrado
          : branch
      ),
    }));

    return branchCerrado;
  };

  // =========================================================
  // PROVIDER
  // =========================================================

  return (
    <HiloContext.Provider
      value={{
        hiloActual,
        cargandoHilo,
        iniciarNuevaClase,
        guardarClaseEnApuntes,
        finalizarClase,
        pausarRelojClase,
        reanudarRelojClase,
        obtenerTiempoActual,
        guardarAudio,
        agregarTranscripcion,
        agregarNota,
        agregarPregunta,
        agregarImportante,
        agregarNoEntendi,
        abrirBranch,
        cerrarBranch,
      }}
    >
      {children}
    </HiloContext.Provider>
  );
};

// =========================================================
// HOOK PERSONALIZADO
// =========================================================

export const useHilo = () => {
  const context = useContext(HiloContext);

  if (!context) {
    throw new Error(
      "useHilo debe utilizarse dentro de HiloProvider"
    );
  }

  return context;
};
