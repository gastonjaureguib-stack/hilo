const DB_NAME = "hilo-db";
const DB_VERSION = 2;

const STORE_CLASE = "claseActual";
const STORE_AUDIO = "audioChunks";
const STORE_CLASES_GUARDADAS =
  "clasesGuardadas";


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


          // Clase actual
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


          // Chunks de audio
          if (
            !db.objectStoreNames.contains(
              STORE_AUDIO
            )
          ) {
            db.createObjectStore(
              STORE_AUDIO,
              {
                keyPath: "id",
                autoIncrement: true,
              }
            );
          }


          // Historial de clases
          if (
            !db.objectStoreNames.contains(
              STORE_CLASES_GUARDADAS
            )
          ) {
            db.createObjectStore(
              STORE_CLASES_GUARDADAS,
              {
                keyPath: "id",
              }
            );
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
    }
  );
};


// =========================================================
// GUARDAR CLASE ACTUAL
// =========================================================

export const guardarClaseLocal =
  async (hiloActual) => {
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
          id: "actual",
          data: hiloActual,
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
// OBTENER CLASE ACTUAL
// =========================================================

export const obtenerClaseLocal =
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
// ELIMINAR CLASE ACTUAL
// =========================================================

export const borrarClaseLocal =
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


        store.delete(
          "actual"
        );


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
  async (blob) => {
    if (
      !blob ||
      blob.size === 0
    ) {
      return;
    }


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
// OBTENER TODOS LOS CHUNKS
// =========================================================

export const obtenerChunksAudio =
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
              request.result ||
              [];

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
// BORRAR CHUNKS DE AUDIO
// =========================================================

export const borrarChunksAudio =
  async () => {
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


        store.clear();


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
  async (clase) => {
    if (!clase) {
      throw new Error(
        "No hay una clase para guardar."
      );
    }


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


        // Esperamos a que termine TODA
        // la transacción antes de decir
        // que la clase fue guardada.

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
// OBTENER TODAS LAS CLASES DE APUNTES
// =========================================================

export const obtenerClasesTerminadas =
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

            resolve(
              clases
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
// OBTENER UNA CLASE DE APUNTES
// =========================================================

export const obtenerClaseTerminada =
  async (id) => {
    if (!id) {
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
            const resultado =
              request.result ||
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
// ELIMINAR CLASE DE APUNTES
// =========================================================

export const eliminarClaseTerminada = async (id) => {
  if (!id) {
    throw new Error(
      "Se necesita el ID de la clase para eliminarla."
    );
  }

  const db = await abrirDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE_CLASES_GUARDADAS,
      "readwrite"
    );

    const store = transaction.objectStore(
      STORE_CLASES_GUARDADAS
    );

    store.delete(id);

    transaction.oncomplete = () => {
      db.close();
      resolve(true);
    };

    transaction.onerror = () => {
      const error = transaction.error;

      db.close();
      reject(error);
    };

    transaction.onabort = () => {
      const error = transaction.error;

      db.close();
      reject(error);
    };
  });
};