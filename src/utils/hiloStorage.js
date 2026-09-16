const DB_NAME = "hilo-db";
const DB_VERSION = 3;

const STORE_CLASE = "claseActual";
const STORE_AUDIO = "audioChunks";
const STORE_CLASES_GUARDADAS =
  "clasesGuardadas";


// =========================================================
// VALIDAR USUARIO
// =========================================================

const validarUserId = (userId) => {
  if (!userId) {
    throw new Error(
      "Se necesita un usuario autenticado."
    );
  }
};


// =========================================================
// ABRIR BASE DE DATOS
// =========================================================

const abrirDB = () => {
  return new Promise(
    (resolve, reject) => {
      const request =
        indexedDB.open(
          DB_NAME,
          DB_VERSION
        );

      request.onupgradeneeded =
        () => {
          const db =
            request.result;

          const transaction =
            request.transaction;


          // =================================================
          // CLASE ACTUAL
          // =================================================

          if (
            !db.objectStoreNames.contains(
              STORE_CLASE
            )
          ) {
            db.createObjectStore(
              STORE_CLASE,
              {
                keyPath: "id",
              }
            );
          }


          // =================================================
          // AUDIO CHUNKS
          // =================================================

          if (
            !db.objectStoreNames.contains(
              STORE_AUDIO
            )
          ) {
            const store =
              db.createObjectStore(
                STORE_AUDIO,
                {
                  keyPath: "id",
                  autoIncrement: true,
                }
              );

            store.createIndex(
              "userId",
              "userId",
              {
                unique: false,
              }
            );
          } else {
            const store =
              transaction.objectStore(
                STORE_AUDIO
              );

            if (
              !store.indexNames.contains(
                "userId"
              )
            ) {
              store.createIndex(
                "userId",
                "userId",
                {
                  unique: false,
                }
              );
            }
          }


          // =================================================
          // CLASES GUARDADAS
          // =================================================

          if (
            !db.objectStoreNames.contains(
              STORE_CLASES_GUARDADAS
            )
          ) {
            const store =
              db.createObjectStore(
                STORE_CLASES_GUARDADAS,
                {
                  keyPath: "id",
                }
              );

            store.createIndex(
              "userId",
              "userId",
              {
                unique: false,
              }
            );
          } else {
            const store =
              transaction.objectStore(
                STORE_CLASES_GUARDADAS
              );

            if (
              !store.indexNames.contains(
                "userId"
              )
            ) {
              store.createIndex(
                "userId",
                "userId",
                {
                  unique: false,
                }
              );
            }
          }
        };


      request.onsuccess =
        () => {
          resolve(
            request.result
          );
        };


      request.onerror =
        () => {
          reject(
            request.error
          );
        };


      request.onblocked =
        () => {
          console.warn(
            "La actualización de IndexedDB está bloqueada por otra pestaña de Hilo."
          );
        };
    }
  );
};


// =========================================================
// GUARDAR CLASE ACTUAL
// =========================================================

export const guardarClaseLocal =
  async (
    hiloActual,
    userId
  ) => {
    validarUserId(userId);

    const db =
      await abrirDB();

    return new Promise(
      (resolve, reject) => {
        const transaction =
          db.transaction(
            STORE_CLASE,
            "readwrite"
          );

        const store =
          transaction.objectStore(
            STORE_CLASE
          );

        store.put({
          id: userId,

          userId,

          data: {
            ...hiloActual,
            userId,
          },
        });


        transaction.oncomplete =
          () => {
            db.close();
            resolve(true);
          };


        transaction.onerror =
          () => {
            const error =
              transaction.error;

            db.close();

            reject(error);
          };


        transaction.onabort =
          () => {
            const error =
              transaction.error;

            db.close();

            reject(error);
          };
      }
    );
  };


// =========================================================
// OBTENER CLASE ACTUAL DEL USUARIO
// =========================================================

export const obtenerClaseLocal =
  async (userId) => {
    if (!userId) {
      return null;
    }

    const db =
      await abrirDB();

    return new Promise(
      (resolve, reject) => {
        const transaction =
          db.transaction(
            STORE_CLASE,
            "readonly"
          );

        const store =
          transaction.objectStore(
            STORE_CLASE
          );

        const request =
          store.get(userId);


        request.onsuccess =
          () => {
            const resultado =
              request.result
                ?.data ||
              null;

            db.close();

            resolve(
              resultado
            );
          };


        request.onerror =
          () => {
            const error =
              request.error;

            db.close();

            reject(error);
          };
      }
    );
  };


// =========================================================
// OBTENER CLASE LOCAL ANTIGUA
//
// Solamente para migrar la versión anterior.
// Antes se guardaba siempre con id = "actual".
// =========================================================

export const obtenerClaseLocalLegacy =
  async () => {
    const db =
      await abrirDB();

    return new Promise(
      (resolve, reject) => {
        const transaction =
          db.transaction(
            STORE_CLASE,
            "readonly"
          );

        const store =
          transaction.objectStore(
            STORE_CLASE
          );

        const request =
          store.get("actual");


        request.onsuccess =
          () => {
            const resultado =
              request.result
                ?.data ||
              null;

            db.close();

            resolve(resultado);
          };


        request.onerror =
          () => {
            const error =
              request.error;

            db.close();

            reject(error);
          };
      }
    );
  };


// =========================================================
// BORRAR CLASE ACTUAL DEL USUARIO
// =========================================================

export const borrarClaseLocal =
  async (userId) => {
    validarUserId(userId);

    const db =
      await abrirDB();

    return new Promise(
      (resolve, reject) => {
        const transaction =
          db.transaction(
            STORE_CLASE,
            "readwrite"
          );

        const store =
          transaction.objectStore(
            STORE_CLASE
          );

        store.delete(userId);


        transaction.oncomplete =
          () => {
            db.close();
            resolve(true);
          };


        transaction.onerror =
          () => {
            const error =
              transaction.error;

            db.close();

            reject(error);
          };


        transaction.onabort =
          () => {
            const error =
              transaction.error;

            db.close();

            reject(error);
          };
      }
    );
  };


// =========================================================
// BORRAR CLASE LOCAL LEGACY
// =========================================================

export const borrarClaseLocalLegacy =
  async () => {
    const db =
      await abrirDB();

    return new Promise(
      (resolve, reject) => {
        const transaction =
          db.transaction(
            STORE_CLASE,
            "readwrite"
          );

        const store =
          transaction.objectStore(
            STORE_CLASE
          );

        store.delete("actual");


        transaction.oncomplete =
          () => {
            db.close();
            resolve(true);
          };


        transaction.onerror =
          () => {
            const error =
              transaction.error;

            db.close();

            reject(error);
          };


        transaction.onabort =
          () => {
            const error =
              transaction.error;

            db.close();

            reject(error);
          };
      }
    );
  };


// =========================================================
// GUARDAR CHUNK DE AUDIO
// =========================================================

export const guardarChunkAudio =
  async (
    blob,
    userId
  ) => {
    if (
      !blob ||
      blob.size === 0
    ) {
      return;
    }

    validarUserId(userId);

    const db =
      await abrirDB();

    return new Promise(
      (resolve, reject) => {
        const transaction =
          db.transaction(
            STORE_AUDIO,
            "readwrite"
          );

        const store =
          transaction.objectStore(
            STORE_AUDIO
          );

        const request =
          store.add({
            userId,

            blob,

            createdAt:
              Date.now(),
          });

        let idCreado =
          null;


        request.onsuccess =
          () => {
            idCreado =
              request.result;
          };


        transaction.oncomplete =
          () => {
            db.close();

            resolve(
              idCreado
            );
          };


        transaction.onerror =
          () => {
            const error =
              transaction.error;

            db.close();

            reject(error);
          };


        transaction.onabort =
          () => {
            const error =
              transaction.error;

            db.close();

            reject(error);
          };
      }
    );
  };


// =========================================================
// OBTENER CHUNKS DEL USUARIO
// =========================================================

export const obtenerChunksAudio =
  async (userId) => {
    if (!userId) {
      return [];
    }

    const db =
      await abrirDB();

    return new Promise(
      (resolve, reject) => {
        const transaction =
          db.transaction(
            STORE_AUDIO,
            "readonly"
          );

        const store =
          transaction.objectStore(
            STORE_AUDIO
          );

        const index =
          store.index("userId");

        const request =
          index.getAll(userId);


        request.onsuccess =
          () => {
            const resultado =
              request.result ||
              [];

            db.close();

            resolve(resultado);
          };


        request.onerror =
          () => {
            const error =
              request.error;

            db.close();

            reject(error);
          };
      }
    );
  };


// =========================================================
// OBTENER CHUNKS ANTIGUOS SIN USUARIO
// =========================================================

export const obtenerChunksAudioLegacy =
  async () => {
    const db =
      await abrirDB();

    return new Promise(
      (resolve, reject) => {
        const transaction =
          db.transaction(
            STORE_AUDIO,
            "readonly"
          );

        const store =
          transaction.objectStore(
            STORE_AUDIO
          );

        const request =
          store.getAll();


        request.onsuccess =
          () => {
            const resultado =
              (
                request.result ||
                []
              ).filter(
                (item) =>
                  !item.userId
              );

            db.close();

            resolve(resultado);
          };


        request.onerror =
          () => {
            const error =
              request.error;

            db.close();

            reject(error);
          };
      }
    );
  };


// =========================================================
// MIGRAR CHUNKS ANTIGUOS AL USUARIO
// =========================================================

export const migrarChunksAudioLegacy =
  async (userId) => {
    validarUserId(userId);

    const db =
      await abrirDB();

    return new Promise(
      (resolve, reject) => {
        const transaction =
          db.transaction(
            STORE_AUDIO,
            "readwrite"
          );

        const store =
          transaction.objectStore(
            STORE_AUDIO
          );

        const request =
          store.openCursor();


        request.onsuccess =
          (event) => {
            const cursor =
              event.target.result;

            if (!cursor) {
              return;
            }

            const item =
              cursor.value;

            if (!item.userId) {
              cursor.update({
                ...item,
                userId,
              });
            }

            cursor.continue();
          };


        transaction.oncomplete =
          () => {
            db.close();
            resolve(true);
          };


        transaction.onerror =
          () => {
            const error =
              transaction.error;

            db.close();

            reject(error);
          };


        transaction.onabort =
          () => {
            const error =
              transaction.error;

            db.close();

            reject(error);
          };
      }
    );
  };


// =========================================================
// BORRAR CHUNKS DEL USUARIO
// =========================================================

export const borrarChunksAudio =
  async (userId) => {
    validarUserId(userId);

    const db =
      await abrirDB();

    return new Promise(
      (resolve, reject) => {
        const transaction =
          db.transaction(
            STORE_AUDIO,
            "readwrite"
          );

        const store =
          transaction.objectStore(
            STORE_AUDIO
          );

        const index =
          store.index("userId");

        const request =
          index.openKeyCursor(
            IDBKeyRange.only(userId)
          );


        request.onsuccess =
          (event) => {
            const cursor =
              event.target.result;

            if (!cursor) {
              return;
            }

            store.delete(
              cursor.primaryKey
            );

            cursor.continue();
          };


        transaction.oncomplete =
          () => {
            db.close();
            resolve(true);
          };


        transaction.onerror =
          () => {
            const error =
              transaction.error;

            db.close();

            reject(error);
          };


        transaction.onabort =
          () => {
            const error =
              transaction.error;

            db.close();

            reject(error);
          };
      }
    );
  };


// =========================================================
// GUARDAR / ACTUALIZAR CLASE EN APUNTES
// =========================================================

export const guardarClaseTerminada =
  async (
    clase,
    userId
  ) => {
    if (!clase) {
      throw new Error(
        "No hay una clase para guardar."
      );
    }

    validarUserId(userId);

    const db =
      await abrirDB();

    const id =
      clase.id ||
      (
        typeof crypto !==
          "undefined" &&
        crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`
      );

    const claseGuardada = {
      ...clase,

      id,

      userId,
    };


    return new Promise(
      (resolve, reject) => {
        const transaction =
          db.transaction(
            STORE_CLASES_GUARDADAS,
            "readwrite"
          );

        const store =
          transaction.objectStore(
            STORE_CLASES_GUARDADAS
          );

        store.put(
          claseGuardada
        );


        transaction.oncomplete =
          () => {
            db.close();

            resolve(
              claseGuardada
            );
          };


        transaction.onerror =
          () => {
            const error =
              transaction.error;

            db.close();

            reject(error);
          };


        transaction.onabort =
          () => {
            const error =
              transaction.error;

            db.close();

            reject(error);
          };
      }
    );
  };


// =========================================================
// OBTENER CLASES DEL USUARIO
// =========================================================

export const obtenerClasesTerminadas =
  async (userId) => {
    if (!userId) {
      return [];
    }

    const db =
      await abrirDB();

    return new Promise(
      (resolve, reject) => {
        const transaction =
          db.transaction(
            STORE_CLASES_GUARDADAS,
            "readonly"
          );

        const store =
          transaction.objectStore(
            STORE_CLASES_GUARDADAS
          );

        const index =
          store.index("userId");

        const request =
          index.getAll(userId);


        request.onsuccess =
          () => {
            const clases =
              request.result ||
              [];


            clases.sort(
              (a, b) => {
                const fechaA =
                  new Date(
                    a.guardadaEn ||
                    a.finalizadaEn ||
                    a.iniciadaEn ||
                    0
                  ).getTime();

                const fechaB =
                  new Date(
                    b.guardadaEn ||
                    b.finalizadaEn ||
                    b.iniciadaEn ||
                    0
                  ).getTime();

                return (
                  fechaB -
                  fechaA
                );
              }
            );


            db.close();

            resolve(clases);
          };


        request.onerror =
          () => {
            const error =
              request.error;

            db.close();

            reject(error);
          };
      }
    );
  };


// =========================================================
// OBTENER CLASES ANTIGUAS SIN USUARIO
// =========================================================

export const obtenerClasesTerminadasLegacy =
  async () => {
    const db =
      await abrirDB();

    return new Promise(
      (resolve, reject) => {
        const transaction =
          db.transaction(
            STORE_CLASES_GUARDADAS,
            "readonly"
          );

        const store =
          transaction.objectStore(
            STORE_CLASES_GUARDADAS
          );

        const request =
          store.getAll();


        request.onsuccess =
          () => {
            const clases =
              (
                request.result ||
                []
              ).filter(
                (clase) =>
                  !clase.userId
              );

            db.close();

            resolve(clases);
          };


        request.onerror =
          () => {
            const error =
              request.error;

            db.close();

            reject(error);
          };
      }
    );
  };


// =========================================================
// MIGRAR CLASES ANTIGUAS AL USUARIO
// =========================================================

export const migrarClasesTerminadasLegacy =
  async (userId) => {
    validarUserId(userId);

    const db =
      await abrirDB();

    return new Promise(
      (resolve, reject) => {
        const transaction =
          db.transaction(
            STORE_CLASES_GUARDADAS,
            "readwrite"
          );

        const store =
          transaction.objectStore(
            STORE_CLASES_GUARDADAS
          );

        const request =
          store.openCursor();


        request.onsuccess =
          (event) => {
            const cursor =
              event.target.result;

            if (!cursor) {
              return;
            }

            const clase =
              cursor.value;

            if (!clase.userId) {
              cursor.update({
                ...clase,
                userId,
              });
            }

            cursor.continue();
          };


        transaction.oncomplete =
          () => {
            db.close();
            resolve(true);
          };


        transaction.onerror =
          () => {
            const error =
              transaction.error;

            db.close();

            reject(error);
          };


        transaction.onabort =
          () => {
            const error =
              transaction.error;

            db.close();

            reject(error);
          };
      }
    );
  };


// =========================================================
// OBTENER UNA CLASE DEL USUARIO
// =========================================================

export const obtenerClaseTerminada =
  async (
    id,
    userId
  ) => {
    if (!id || !userId) {
      return null;
    }

    const db =
      await abrirDB();

    return new Promise(
      (resolve, reject) => {
        const transaction =
          db.transaction(
            STORE_CLASES_GUARDADAS,
            "readonly"
          );

        const store =
          transaction.objectStore(
            STORE_CLASES_GUARDADAS
          );

        const request =
          store.get(id);


        request.onsuccess =
          () => {
            const clase =
              request.result ||
              null;

            db.close();

            if (
              !clase ||
              clase.userId !== userId
            ) {
              resolve(null);
              return;
            }

            resolve(clase);
          };


        request.onerror =
          () => {
            const error =
              request.error;

            db.close();

            reject(error);
          };
      }
    );
  };


// =========================================================
// ELIMINAR CLASE DEL USUARIO
// =========================================================

export const eliminarClaseTerminada =
  async (
    id,
    userId
  ) => {
    if (!id) {
      throw new Error(
        "Se necesita el ID de la clase para eliminarla."
      );
    }

    validarUserId(userId);

    const db =
      await abrirDB();

    return new Promise(
      (resolve, reject) => {
        const transaction =
          db.transaction(
            STORE_CLASES_GUARDADAS,
            "readwrite"
          );

        const store =
          transaction.objectStore(
            STORE_CLASES_GUARDADAS
          );

        const request =
          store.get(id);


        request.onsuccess =
          () => {
            const clase =
              request.result;

            if (
              !clase ||
              clase.userId !== userId
            ) {
              transaction.abort();
              return;
            }

            store.delete(id);
          };


        transaction.oncomplete =
          () => {
            db.close();
            resolve(true);
          };


        transaction.onerror =
          () => {
            const error =
              transaction.error;

            db.close();

            reject(error);
          };


        transaction.onabort =
          () => {
            db.close();

            reject(
              new Error(
                "La clase no existe o no pertenece al usuario."
              )
            );
          };
      }
    );
  };


// =========================================================
// MIGRAR DATOS LEGACY AL PRIMER USUARIO
//
// Esta función se utilizará desde HiloContext una sola vez
// para adjudicar los datos existentes al usuario actual.
// =========================================================

export const migrarDatosLegacy =
  async (userId) => {
    validarUserId(userId);

    // -------------------------------------------------------
    // CLASE ACTUAL ANTIGUA
    // -------------------------------------------------------

    const claseActualAntigua =
      await obtenerClaseLocalLegacy();

    if (claseActualAntigua) {
      const claseActualUsuario =
        await obtenerClaseLocal(
          userId
        );

      // No pisamos una clase que ya
      // pertenezca al usuario.
      if (!claseActualUsuario) {
        await guardarClaseLocal(
          claseActualAntigua,
          userId
        );
      }

      await borrarClaseLocalLegacy();
    }


    // -------------------------------------------------------
    // HISTORIAL ANTIGUO
    // -------------------------------------------------------

    await migrarClasesTerminadasLegacy(
      userId
    );


    // -------------------------------------------------------
    // AUDIO ANTIGUO
    // -------------------------------------------------------

    await migrarChunksAudioLegacy(
      userId
    );


    return true;
  };