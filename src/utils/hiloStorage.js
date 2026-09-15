const DB_NAME = "hilo-db";
const DB_VERSION = 1;

const STORE_CLASE = "claseActual";
const STORE_AUDIO = "audioChunks";

const abrirDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      DB_NAME,
      DB_VERSION
    );

    request.onupgradeneeded = () => {
      const db = request.result;

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
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

// =========================================================
// GUARDAR CLASE ACTUAL
// =========================================================

export const guardarClaseLocal = async (
  hiloActual
) => {
  const db = await abrirDB();

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

      const request = store.put({
        id: "actual",
        data: hiloActual,
      });

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        reject(request.error);
      };
    }
  );
};

// =========================================================
// OBTENER CLASE ACTUAL
// =========================================================

export const obtenerClaseLocal =
  async () => {
    const db = await abrirDB();

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

        request.onsuccess = () => {
          resolve(
            request.result?.data ||
              null
          );
        };

        request.onerror = () => {
          reject(request.error);
        };
      }
    );
  };

// =========================================================
// ELIMINAR CLASE ACTUAL
// =========================================================

export const borrarClaseLocal =
  async () => {
    const db = await abrirDB();

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

        const request =
          store.delete("actual");

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = () => {
          reject(request.error);
        };
      }
    );
  };

// =========================================================
// GUARDAR CHUNK DE AUDIO
// =========================================================

export const guardarChunkAudio =
  async (blob) => {
    if (!blob || blob.size === 0) {
      return;
    }

    const db = await abrirDB();

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

        const request = store.add({
          blob,
          createdAt: Date.now(),
        });

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(request.error);
        };
      }
    );
  };

// =========================================================
// OBTENER TODOS LOS CHUNKS
// =========================================================

export const obtenerChunksAudio =
  async () => {
    const db = await abrirDB();

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

        request.onsuccess = () => {
          resolve(
            request.result || []
          );
        };

        request.onerror = () => {
          reject(request.error);
        };
      }
    );
  };

// =========================================================
// BORRAR CHUNKS DE AUDIO
// =========================================================

export const borrarChunksAudio =
  async () => {
    const db = await abrirDB();

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
          store.clear();

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = () => {
          reject(request.error);
        };
      }
    );
  };