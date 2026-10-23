
const DB_NAME = "hilo-db";
const DB_VERSION = 3;

const STORE_CLASE = "claseActual";
const STORE_AUDIO = "audioChunks";
const STORE_CLASES_GUARDADAS = "clasesGuardadas";

// =========================================================
// VALIDACIONES
// =========================================================

const validarUserId = (userId) => {
  if (!userId) {
    throw new Error("Se necesita un usuario autenticado.");
  }
};

const crearId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
};

// =========================================================
// ABRIR BASE DE DATOS
// =========================================================

const abrirDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      const transaction = request.transaction;

      // CLASE ACTUAL

      if (!db.objectStoreNames.contains(STORE_CLASE)) {
        db.createObjectStore(STORE_CLASE, {
          keyPath: "id",
        });
      }

      // FRAGMENTOS DE AUDIO

      if (!db.objectStoreNames.contains(STORE_AUDIO)) {
        const store = db.createObjectStore(STORE_AUDIO, {
          keyPath: "id",
          autoIncrement: true,
        });

        store.createIndex("userId", "userId", {
          unique: false,
        });
      } else {
        const store = transaction.objectStore(STORE_AUDIO);

        if (!store.indexNames.contains("userId")) {
          store.createIndex("userId", "userId", {
            unique: false,
          });
        }
      }

      // CLASES GUARDADAS

      if (
        !db.objectStoreNames.contains(
          STORE_CLASES_GUARDADAS
        )
      ) {
        const store = db.createObjectStore(
          STORE_CLASES_GUARDADAS,
          {
            keyPath: "id",
          }
        );

        store.createIndex("userId", "userId", {
          unique: false,
        });
      } else {
        const store = transaction.objectStore(
          STORE_CLASES_GUARDADAS
        );

        if (!store.indexNames.contains("userId")) {
          store.createIndex("userId", "userId", {
            unique: false,
          });
        }
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      db.onversionchange = () => {
        db.close();
      };

      resolve(db);
    };

    request.onerror = () => {
      reject(request.error);
    };

    request.onblocked = () => {
      console.warn(
        "La actualización de IndexedDB está bloqueada por otra pestaña de Hilo."
      );
    };
  });
};

// =========================================================
// EJECUTAR TRANSACCIONES
// =========================================================

const ejecutarTransaccion = async (
  nombreStore,
  modo,
  operacion
) => {
  const db = await abrirDB();

  return new Promise((resolve, reject) => {
    let resultado;
    let errorPersonalizado = null;
    let finalizada = false;

    const transaction = db.transaction(nombreStore, modo);
    const store = transaction.objectStore(nombreStore);

    const cerrar = () => {
      db.close();
    };

    const resolver = (valor) => {
      if (finalizada) return;

      finalizada = true;
      cerrar();
      resolve(valor);
    };

    const rechazar = (error) => {
      if (finalizada) return;

      finalizada = true;
      cerrar();
      reject(error);
    };

    transaction.oncomplete = () => {
      resolver(resultado);
    };

    transaction.onerror = () => {
      rechazar(
        errorPersonalizado ||
          transaction.error ||
          new Error("Error en IndexedDB.")
      );
    };

    transaction.onabort = () => {
      rechazar(
        errorPersonalizado ||
          transaction.error ||
          new Error("La transacción fue cancelada.")
      );
    };

    try {
      operacion(store, transaction, {
        setResultado: (valor) => {
          resultado = valor;
        },
        setError: (error) => {
          errorPersonalizado = error;
        },
      });
    } catch (error) {
      errorPersonalizado = error;

      try {
        transaction.abort();
      } catch {
        rechazar(error);
      }
    }
  });
};

// =========================================================
// GUARDAR CLASE ACTUAL
// =========================================================

export const guardarClaseLocal = async (
  hiloActual,
  userId
) => {
  validarUserId(userId);

  return ejecutarTransaccion(
    STORE_CLASE,
    "readwrite",
    (store, _transaction, { setResultado }) => {
      store.put({
        id: userId,
        userId,
        data: {
          ...hiloActual,
          userId,
        },
      });

      setResultado(true);
    }
  );
};

// =========================================================
// OBTENER CLASE ACTUAL
// =========================================================

export const obtenerClaseLocal = async (userId) => {
  if (!userId) return null;

  return ejecutarTransaccion(
    STORE_CLASE,
    "readonly",
    (store, _transaction, { setResultado }) => {
      const request = store.get(userId);

      request.onsuccess = () => {
        setResultado(request.result?.data ?? null);
      };
    }
  );
};

// =========================================================
// OBTENER CLASE LOCAL ANTIGUA
// =========================================================

export const obtenerClaseLocalLegacy = async () => {
  return ejecutarTransaccion(
    STORE_CLASE,
    "readonly",
    (store, _transaction, { setResultado }) => {
      const request = store.get("actual");

      request.onsuccess = () => {
        setResultado(request.result?.data ?? null);
      };
    }
  );
};

// =========================================================
// BORRAR CLASE ACTUAL
// =========================================================

export const borrarClaseLocal = async (userId) => {
  validarUserId(userId);

  return ejecutarTransaccion(
    STORE_CLASE,
    "readwrite",
    (store, _transaction, { setResultado }) => {
      store.delete(userId);
      setResultado(true);
    }
  );
};

// =========================================================
// BORRAR CLASE LOCAL ANTIGUA
// =========================================================

export const borrarClaseLocalLegacy = async () => {
  return ejecutarTransaccion(
    STORE_CLASE,
    "readwrite",
    (store, _transaction, { setResultado }) => {
      store.delete("actual");
      setResultado(true);
    }
  );
};

// =========================================================
// GUARDAR FRAGMENTO DE AUDIO
// =========================================================

export const guardarChunkAudio = async (blob, userId) => {
  if (!blob || blob.size === 0) {
    return;
  }

  validarUserId(userId);

  return ejecutarTransaccion(
    STORE_AUDIO,
    "readwrite",
    (store, _transaction, { setResultado }) => {
      const request = store.add({
        userId,
        blob,
        createdAt: Date.now(),
      });

      request.onsuccess = () => {
        setResultado(request.result);
      };
    }
  );
};

// =========================================================
// OBTENER FRAGMENTOS DE AUDIO
// =========================================================

export const obtenerChunksAudio = async (userId) => {
  if (!userId) return [];

  return ejecutarTransaccion(
    STORE_AUDIO,
    "readonly",
    (store, _transaction, { setResultado }) => {
      const index = store.index("userId");
      const request = index.getAll(userId);

      request.onsuccess = () => {
        setResultado(request.result ?? []);
      };
    }
  );
};

// =========================================================
// OBTENER FRAGMENTOS ANTIGUOS
// =========================================================

export const obtenerChunksAudioLegacy = async () => {
  return ejecutarTransaccion(
    STORE_AUDIO,
    "readonly",
    (store, _transaction, { setResultado }) => {
      const request = store.getAll();

      request.onsuccess = () => {
        const chunks = (request.result ?? []).filter(
          (item) => !item.userId
        );

        setResultado(chunks);
      };
    }
  );
};

// =========================================================
// MIGRAR FRAGMENTOS ANTIGUOS
// =========================================================

export const migrarChunksAudioLegacy = async (userId) => {
  validarUserId(userId);

  return ejecutarTransaccion(
    STORE_AUDIO,
    "readwrite",
    (store, _transaction, { setResultado }) => {
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;

        if (!cursor) return;

        const item = cursor.value;

        if (!item.userId) {
          cursor.update({
            ...item,
            userId,
          });
        }

        cursor.continue();
      };

      setResultado(true);
    }
  );
};

// =========================================================
// BORRAR FRAGMENTOS DE AUDIO
// =========================================================

export const borrarChunksAudio = async (userId) => {
  validarUserId(userId);

  return ejecutarTransaccion(
    STORE_AUDIO,
    "readwrite",
    (store, _transaction, { setResultado }) => {
      const index = store.index("userId");

      const request = index.openKeyCursor(
        IDBKeyRange.only(userId)
      );

      request.onsuccess = (event) => {
        const cursor = event.target.result;

        if (!cursor) return;

        store.delete(cursor.primaryKey);
        cursor.continue();
      };

      setResultado(true);
    }
  );
};

// =========================================================
// GUARDAR O ACTUALIZAR CLASE EN APUNTES
// =========================================================

export const guardarClaseTerminada = async (
  clase,
  userId
) => {
  if (!clase) {
    throw new Error("No hay una clase para guardar.");
  }

  validarUserId(userId);

  const id = clase.id || crearId();

  const claseGuardada = {
    ...clase,
    id,
    userId,
  };

  return ejecutarTransaccion(
    STORE_CLASES_GUARDADAS,
    "readwrite",
    (
      store,
      transaction,
      { setResultado, setError }
    ) => {
      const request = store.get(id);

      request.onsuccess = () => {
        const existente = request.result;

        // Evitamos sobrescribir una clase de otro usuario.

        if (
          existente &&
          existente.userId !== userId
        ) {
          setError(
            new Error(
              "No se puede sobrescribir una clase perteneciente a otro usuario."
            )
          );

          transaction.abort();
          return;
        }

        store.put(claseGuardada);
      };

      setResultado(claseGuardada);
    }
  );
};

// =========================================================
// OBTENER CLASES GUARDADAS
// =========================================================

export const obtenerClasesTerminadas = async (userId) => {
  if (!userId) return [];

  return ejecutarTransaccion(
    STORE_CLASES_GUARDADAS,
    "readonly",
    (store, _transaction, { setResultado }) => {
      const index = store.index("userId");
      const request = index.getAll(userId);

      request.onsuccess = () => {
        const clases = request.result ?? [];

        clases.sort((a, b) => {
          const fechaA = new Date(
            a.guardadaEn ||
              a.finalizadaEn ||
              a.iniciadaEn ||
              0
          ).getTime();

          const fechaB = new Date(
            b.guardadaEn ||
              b.finalizadaEn ||
              b.iniciadaEn ||
              0
          ).getTime();

          return fechaB - fechaA;
        });

        setResultado(clases);
      };
    }
  );
};

// =========================================================
// OBTENER CLASES ANTIGUAS
// =========================================================

export const obtenerClasesTerminadasLegacy = async () => {
  return ejecutarTransaccion(
    STORE_CLASES_GUARDADAS,
    "readonly",
    (store, _transaction, { setResultado }) => {
      const request = store.getAll();

      request.onsuccess = () => {
        const clases = (request.result ?? []).filter(
          (clase) => !clase.userId
        );

        setResultado(clases);
      };
    }
  );
};

// =========================================================
// MIGRAR CLASES ANTIGUAS
// =========================================================

export const migrarClasesTerminadasLegacy = async (
  userId
) => {
  validarUserId(userId);

  return ejecutarTransaccion(
    STORE_CLASES_GUARDADAS,
    "readwrite",
    (store, _transaction, { setResultado }) => {
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;

        if (!cursor) return;

        const clase = cursor.value;

        if (!clase.userId) {
          cursor.update({
            ...clase,
            userId,
          });
        }

        cursor.continue();
      };

      setResultado(true);
    }
  );
};

// =========================================================
// OBTENER UNA CLASE GUARDADA
// =========================================================

export const obtenerClaseTerminada = async (
  id,
  userId
) => {
  if (!id || !userId) return null;

  return ejecutarTransaccion(
    STORE_CLASES_GUARDADAS,
    "readonly",
    (store, _transaction, { setResultado }) => {
      const request = store.get(id);

      request.onsuccess = () => {
        const clase = request.result ?? null;

        if (!clase || clase.userId !== userId) {
          setResultado(null);
          return;
        }

        setResultado(clase);
      };
    }
  );
};

// =========================================================
// ELIMINAR CLASE GUARDADA
// =========================================================

export const eliminarClaseTerminada = async (
  id,
  userId
) => {
  if (!id) {
    throw new Error(
      "Se necesita el ID de la clase para eliminarla."
    );
  }

  validarUserId(userId);

  return ejecutarTransaccion(
    STORE_CLASES_GUARDADAS,
    "readwrite",
    (
      store,
      transaction,
      { setResultado, setError }
    ) => {
      const request = store.get(id);

      request.onsuccess = () => {
        const clase = request.result;

        if (!clase || clase.userId !== userId) {
          setError(
            new Error(
              "La clase no existe o no pertenece al usuario."
            )
          );

          transaction.abort();
          return;
        }

        store.delete(id);
      };

      setResultado(true);
    }
  );
};

// =========================================================
// MIGRAR DATOS ANTIGUOS
// =========================================================

export const migrarDatosLegacy = async (userId) => {
  validarUserId(userId);

  // Recuperar la clase actual de versiones anteriores.

  const claseActualAntigua =
    await obtenerClaseLocalLegacy();

  if (claseActualAntigua) {
    const claseActualUsuario =
      await obtenerClaseLocal(userId);

    // No sobrescribimos una clase existente.

    if (!claseActualUsuario) {
      await guardarClaseLocal(
        claseActualAntigua,
        userId
      );
    }

    await borrarClaseLocalLegacy();
  }

  // Migrar clases históricas sin usuario.

  await migrarClasesTerminadasLegacy(userId);

  // Migrar fragmentos de audio sin usuario.

  await migrarChunksAudioLegacy(userId);

  return true;
};
