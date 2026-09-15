// Formatear segundos como mm:ss o hh:mm:ss

export const formatearTiempo =
  (segundos = 0) => {
    const total =
      Math.max(
        0,
        Math.floor(segundos)
      );

    const horas =
      Math.floor(
        total / 3600
      );

    const minutos =
      Math.floor(
        (total % 3600) / 60
      );

    const segundosRestantes =
      total % 60;


    const mm =
      String(minutos)
        .padStart(2, "0");

    const ss =
      String(segundosRestantes)
        .padStart(2, "0");


    if (horas === 0) {
      return `${mm}:${ss}`;
    }


    const hh =
      String(horas)
        .padStart(2, "0");


    return `${hh}:${mm}:${ss}`;
  };


// Obtener fecha ISO

export const obtenerFechaActual =
  () => {
    return new Date()
      .toISOString();
  };


// Limitar un tiempo para evitar valores negativos

export const normalizarTiempo =
  (segundos) => {
    const valor =
      Number(segundos);


    if (
      !Number.isFinite(valor)
    ) {
      return 0;
    }


    return Math.max(
      0,
      valor
    );
  };


// Calcular diferencia en segundos

export const diferenciaEnSegundos =
  (
    inicio,
    fin = Date.now()
  ) => {
    if (!inicio) {
      return 0;
    }


    const inicioMs =
      typeof inicio === "number"
        ? inicio
        : new Date(inicio)
            .getTime();


    const finMs =
      typeof fin === "number"
        ? fin
        : new Date(fin)
            .getTime();


    if (
      !Number.isFinite(inicioMs) ||
      !Number.isFinite(finMs)
    ) {
      return 0;
    }


    return Math.max(
      0,
      (finMs - inicioMs) /
        1000
    );
  };