import {
  createContext,
  useContext,
  useEffect,
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

import {
  formatearTiempo,
} from "../utils/timeUtils.js";

import {
  relojClase,
} from "../services/classClock.js";

import {
  crearClase,
  finalizarClaseRemota,
} from "../services/classesService.js";


const HiloContext =
  createContext();


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


const estadoInicial = {
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
};


export const HiloProvider = ({
  children,
}) => {
  
const {
    user,
    loading: cargandoAuth,
  } = useAuth();

  const [
    hiloActual,
    setHiloActual,
  ] = useState(
    estadoInicial
  );

  const [
    cargandoHilo,
    setCargandoHilo,
  ] = useState(true);


  // =========================================================
  // RECUPERAR CLASE DEL USUARIO
  // =========================================================

  useEffect(() => {
    if (cargandoAuth) return;

    let cancelado = false;

    const recuperarClase = async () => {
      setCargandoHilo(true);

      if (!user?.id) {
        relojClase.reiniciar();
        if (!cancelado) {
          setHiloActual(estadoInicial);
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
          relojClase.reiniciar();
          setHiloActual(estadoInicial);
          return;
        }

        let claseRecuperada = {
          ...estadoInicial,
          ...claseGuardada,
          id: claseGuardada.id || crearId(),
          clase: { ...estadoInicial.clase, ...claseGuardada.clase },
          transcripcion: claseGuardada.transcripcion || [],
          notas: claseGuardada.notas || [],
          preguntas: claseGuardada.preguntas || [],
          importantes: claseGuardada.importantes || [],
          noEntendi: claseGuardada.noEntendi || [],
          branches: claseGuardada.branches || [],
        };

        if (claseGuardada.reloj) relojClase.restaurar(claseGuardada.reloj);
        else relojClase.reiniciar();

        if (claseGuardada.audio?.blob?.size > 0) {
          const url = URL.createObjectURL(claseGuardada.audio.blob);
          claseRecuperada = {
            ...claseRecuperada,
            audio: { ...claseGuardada.audio, url },
          };
        } else if (chunksGuardados.length > 0) {
          const blobs = chunksGuardados
            .sort((a, b) => a.createdAt - b.createdAt)
            .map((item) => item.blob)
            .filter(Boolean);

          if (blobs.length > 0) {
            const tipo = blobs[0].type || "audio/webm";
            const audioRecuperado = new Blob(blobs, { type: tipo });
            const url = URL.createObjectURL(audioRecuperado);
            claseRecuperada = {
              ...claseRecuperada,
              audio: {
                blob: audioRecuperado,
                url,
                tipo,
                tamaño: audioRecuperado.size,
                recuperado: true,
              },
            };
          }
        }

        if (!cancelado) setHiloActual(claseRecuperada);
      } catch (error) {
        console.error("No se pudo recuperar la clase del usuario:", error);
        if (!cancelado) {
          relojClase.reiniciar();
          setHiloActual(estadoInicial);
        }
      } finally {
        if (!cancelado) setCargandoHilo(false);
      }
    };

    recuperarClase();
    return () => { cancelado = true; };
  }, [user?.id, cargandoAuth]);


  // =========================================================
  // GUARDADO AUTOMÁTICO DE LA CLASE ACTUAL
  // =========================================================

  useEffect(() => {
    if (cargandoAuth || cargandoHilo || !user?.id) return;

    const guardar = async () => {
      try {
        await guardarClaseLocal(
          {
            ...hiloActual,
            reloj: relojClase.obtenerSnapshot(),
          },
          user.id
        );
      } catch (error) {
        console.error("No se pudo guardar la clase localmente:", error);
      }
    };

    guardar();
  }, [hiloActual, cargandoHilo, cargandoAuth, user?.id]);


  // =========================================================
  // OBTENER TIEMPO ACTUAL
  // =========================================================

  const obtenerTiempoActual =
    () => {
      return relojClase
        .obtenerTiempoRedondeado();
    };


  // =========================================================
  // NUEVA CLASE
  // =========================================================

  const iniciarNuevaClase =
    async (datosClase) => {
      if (!user?.id) {
        throw new Error(
          "Tenés que iniciar sesión para comenzar una clase."
        );
      }

      if (hiloActual.audio?.url) {
        try {
          URL.revokeObjectURL(
            hiloActual.audio.url
          );
        } catch (error) {
          console.warn(
            "No se pudo liberar el audio anterior:",
            error
          );
        }
      }

      try {
        await borrarChunksAudio(
          user.id
        );
      } catch (error) {
        console.error(
          "No se pudieron borrar los chunks anteriores:",
          error
        );
      }

      const id = crearId();
      const ahora =
        new Date().toISOString();

      relojClase.iniciar();

      const nuevaClase = {
        id,

        estado: "enClase",

        iniciadaEn: ahora,
        finalizadaEn: null,
        duracionSegundos: 0,

        reloj:
          relojClase.obtenerSnapshot(),

        clase: {
          nombre:
            datosClase.nombre || "",

          tema:
            datosClase.tema || "",

          docente:
            datosClase.docente || "",
        },

        transcripcion: [],

        notas: [],
        preguntas: [],
        importantes: [],
        noEntendi: [],
        branches: [],

        audio: null,
      };

      // Primero queda activa localmente.
      // Si Supabase falla, la clase puede continuar.
      setHiloActual(
        nuevaClase
      );

      try {
        await crearClase({
          id,

          userId:
            user.id,

          nombre:
            nuevaClase.clase.nombre,

          tema:
            nuevaClase.clase.tema,

          docente:
            nuevaClase.clase.docente,

          estado:
            "enClase",

          iniciadaEn:
            ahora,
        });

        console.log(
          "Clase creada en Supabase:",
          id
        );
      } catch (error) {
        console.error(
          "La clase comenzó localmente, pero todavía no pudo sincronizarse con Supabase:",
          error
        );
      }

      return nuevaClase;
    };


  // =========================================================
  // GUARDAR CLASE EN APUNTES SIN FINALIZAR
  // =========================================================

  const guardarClaseEnApuntes =
    async () => {
      const id =
        hiloActual.id ||
        crearId();

      const claseParaGuardar = {
        ...hiloActual,

        id,

        reloj:
          relojClase
            .obtenerSnapshot(),

        guardadaEn:
          new Date()
            .toISOString(),
      };


      try {
        const claseGuardada =
          await guardarClaseTerminada(
            claseParaGuardar,
            user.id
          );


        // Si era una clase antigua sin ID,
        // guardamos el ID también en hiloActual
        // para que los próximos guardados
        // actualicen el mismo registro.

        if (!hiloActual.id) {
          setHiloActual(
            (prev) => ({
              ...prev,
              id,
            })
          );
        }


        return claseGuardada;

      } catch (error) {
        console.error(
          "No se pudo guardar la clase en Apuntes:",
          error
        );

        throw error;
      }
    };


  // =========================================================
  // PAUSAR RELOJ
  // =========================================================

  const pausarRelojClase =
    () => {
      relojClase.pausar();


      setHiloActual(
        (prev) => ({
          ...prev,

          reloj:
            relojClase
              .obtenerSnapshot(),
        })
      );
    };


  // =========================================================
  // REANUDAR RELOJ
  // =========================================================

  const reanudarRelojClase =
    () => {
      relojClase.reanudar();


      setHiloActual(
        (prev) => ({
          ...prev,

          reloj:
            relojClase
              .obtenerSnapshot(),
        })
      );
    };


  // =========================================================
  // FINALIZAR CLASE
  // =========================================================

  const finalizarClase =
    async () => {
      if (!user?.id) {
        throw new Error(
          "Tenés que iniciar sesión para finalizar una clase."
        );
      }

      const duracion =
        relojClase.finalizar();

      const ahora =
        new Date()
          .toISOString();

      const id =
        hiloActual.id ||
        crearId();

      const claseTerminada = {
        ...hiloActual,
        id,
        estado: "taller",
        finalizadaEn: ahora,
        duracionSegundos: duracion,
        reloj:
          relojClase.obtenerSnapshot(),
        guardadaEn: ahora,
      };

      try {
        // Finalizar también significa guardar automáticamente en Apuntes.
        const claseGuardada =
          await guardarClaseTerminada(
            claseTerminada,
            user.id
          );

        setHiloActual(
          claseGuardada
        );

        // Actualizamos la misma clase en Supabase.
        // Si falla la red, el guardado local de Apuntes se conserva.
        try {
          await finalizarClaseRemota({
            claseId: id,
            userId: user.id,
            duracionSegundos: duracion,
            finalizadaEn: ahora,
          });
        } catch (errorSupabase) {
          console.error(
            "La clase quedó guardada en Apuntes, pero no se pudo actualizar todavía en Supabase:",
            errorSupabase
          );
        }

        return claseGuardada;

      } catch (error) {
        console.error(
          "No se pudo guardar la clase terminada en Apuntes:",
          error
        );

        setHiloActual(
          claseTerminada
        );

        throw error;
      }
    };


  // =========================================================
  // GUARDAR AUDIO
  // =========================================================

  const guardarAudio =
    (blob) => {
      if (
        !blob ||
        blob.size === 0
      ) {
        return;
      }


      const url =
        URL.createObjectURL(
          blob
        );


      setHiloActual(
        (prev) => {
          if (
            prev.audio?.url
          ) {
            try {
              URL.revokeObjectURL(
                prev.audio.url
              );
            } catch (error) {
              console.warn(
                "No se pudo liberar la URL anterior:",
                error
              );
            }
          }


          return {
            ...prev,

            audio: {
              blob,

              url,

              tipo:
                blob.type ||
                "audio/webm",

              tamaño:
                blob.size,

              recuperado:
                false,
            },
          };
        }
      );
    };


  // =========================================================
  // AGREGAR TRANSCRIPCIÓN
  // =========================================================

  const agregarTranscripcion =
    (
      texto,
      tiempoPersonalizado
    ) => {
      if (!texto?.trim()) {
        return;
      }


      const tiempo =
        tiempoPersonalizado ??
        obtenerTiempoActual();


      const bloque =
        crearBloqueTranscripcion({
          texto,

          tiempoSegundos:
            tiempo,

          fecha:
            new Date()
              .toISOString(),
        });


      if (!bloque) {
        return;
      }


      const bloqueCompatible = {
        ...bloque,

        hora:
          bloque.tiempoTexto,
      };


      setHiloActual(
        (prev) => {
          const branches =
            (prev.branches || [])
              .map(
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
              ...prev.transcripcion,
              bloqueCompatible,
            ],

            branches,

            reloj:
              relojClase
                .obtenerSnapshot(),
          };
        }
      );


      return bloqueCompatible;
    };


  // =========================================================
  // NOTA
  // =========================================================

  const agregarNota =
    (
      texto,
      tiempoPersonalizado
    ) => {
      if (!texto?.trim()) {
        return;
      }


      const tiempo =
        tiempoPersonalizado ??
        obtenerTiempoActual();


      const nota = {
        id:
          crearId(),

        texto:
          texto.trim(),

        fecha:
          new Date()
            .toISOString(),

        tiempoSegundos:
          tiempo,

        tiempoTexto:
          formatearTiempo(
            tiempo
          ),

        hora:
          formatearTiempo(
            tiempo
          ),
      };


      setHiloActual(
        (prev) => ({
          ...prev,

          notas: [
            ...prev.notas,
            nota,
          ],
        })
      );


      return nota;
    };


  // =========================================================
  // PREGUNTA
  // =========================================================

  const agregarPregunta =
    (
      texto,
      tiempoPersonalizado
    ) => {
      if (!texto?.trim()) {
        return;
      }


      const tiempo =
        tiempoPersonalizado ??
        obtenerTiempoActual();


      const pregunta = {
        id:
          crearId(),

        texto:
          texto.trim(),

        fecha:
          new Date()
            .toISOString(),

        tiempoSegundos:
          tiempo,

        tiempoTexto:
          formatearTiempo(
            tiempo
          ),

        hora:
          formatearTiempo(
            tiempo
          ),
      };


      setHiloActual(
        (prev) => ({
          ...prev,

          preguntas: [
            ...prev.preguntas,
            pregunta,
          ],
        })
      );


      return pregunta;
    };


  // =========================================================
  // IMPORTANTE
  // =========================================================

  const agregarImportante =
    (
      tiempoPersonalizado
    ) => {
      const tiempo =
        tiempoPersonalizado ??
        obtenerTiempoActual();


      let importanteCreado =
        null;


      setHiloActual(
        (prev) => {
          const fragmento =
            crearFragmentoImportante({
              transcripcion:
                prev.transcripcion,

              tiempoActual:
                tiempo,
            });


          importanteCreado = {
            id:
              crearId(),

            fecha:
              new Date()
                .toISOString(),

            tiempoSegundos:
              tiempo,

            tiempoTexto:
              formatearTiempo(
                tiempo
              ),

            hora:
              formatearTiempo(
                tiempo
              ),

            texto:
              fragmento.texto ||
              "Momento importante sin transcripción disponible.",

            bloques:
              fragmento.bloques,
          };


          return {
            ...prev,

            importantes: [
              ...prev.importantes,
              importanteCreado,
            ],
          };
        }
      );


      return importanteCreado;
    };


  // =========================================================
  // PERDÍ EL HILO
  // =========================================================

  const agregarNoEntendi =
    (
      tiempoPersonalizado
    ) => {
      const tiempo =
        tiempoPersonalizado ??
        obtenerTiempoActual();


      let momentoCreado =
        null;


      setHiloActual(
        (prev) => {
          const contexto =
            crearContextoReciente({
              transcripcion:
                prev.transcripcion,

              tiempoActual:
                tiempo,

              minutos:
                1,
            });


          momentoCreado = {
            id:
              crearId(),

            fecha:
              new Date()
                .toISOString(),

            tiempoSegundos:
              tiempo,

            tiempoTexto:
              formatearTiempo(
                tiempo
              ),

            hora:
              formatearTiempo(
                tiempo
              ),

            texto:
              contexto.texto ||
              "Todavía no había transcripción disponible.",

            contexto,

            bloques:
              contexto.bloques,

            desde:
              contexto.desde,

            hasta:
              contexto.hasta,
          };


          return {
            ...prev,

            noEntendi: [
              ...prev.noEntendi,
              momentoCreado,
            ],
          };
        }
      );


      return momentoCreado;
    };


  // =========================================================
  // BRANCH DE FOCO
  // =========================================================

  const abrirBranch =
    () => {
      const tiempo =
        obtenerTiempoActual();

      const nuevoBranch = {
        id:
          crearId(),

        // El título es opcional y se podrá editar
        // después desde Taller / Apuntes.
        nombre:
          "",

        abierto:
          true,

        fechaInicio:
          new Date()
            .toISOString(),

        fechaFin:
          null,

        inicioSegundos:
          tiempo,

        inicioTexto:
          formatearTiempo(
            tiempo
          ),

        finSegundos:
          null,

        finTexto:
          null,

        transcripcion: [],
      };

      let branchCreado =
        null;

      setHiloActual(
        (prev) => {
          // Evitamos abrir dos branches al mismo tiempo.
          const yaHayBranchActivo =
            (prev.branches || [])
              .some(
                (branch) =>
                  branch.abierto
              );

          if (
            yaHayBranchActivo
          ) {
            return prev;
          }

          branchCreado =
            nuevoBranch;

          return {
            ...prev,

            branches: [
              ...(prev.branches || []),
              nuevoBranch,
            ],
          };
        }
      );

      return branchCreado;
    };


  const cerrarBranch =
    () => {
      const tiempo =
        obtenerTiempoActual();

      let branchCerrado =
        null;

      setHiloActual(
        (prev) => ({
          ...prev,

          branches:
            (prev.branches || [])
              .map(
                (branch) => {
                  if (
                    !branch.abierto
                  ) {
                    return branch;
                  }

                  branchCerrado = {
                    ...branch,

                    abierto:
                      false,

                    fechaFin:
                      new Date()
                        .toISOString(),

                    finSegundos:
                      tiempo,

                    finTexto:
                      formatearTiempo(
                        tiempo
                      ),
                  };

                  return branchCerrado;
                }
              ),
        })
      );

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


export const useHilo =
  () => {
    const context =
      useContext(
        HiloContext
      );


    if (!context) {
      throw new Error(
        "useHilo debe utilizarse dentro de HiloProvider"
      );
    }


    return context;
  };