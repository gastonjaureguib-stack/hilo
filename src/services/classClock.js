class ClassClock {
  constructor() {
    this.estado = "inactivo";
    this.acumuladoMs = 0;
    this.ultimoInicioMs = null;
  }

  iniciar() {
    this.estado = "activo";
    this.acumuladoMs = 0;
    this.ultimoInicioMs = Date.now();
  }

  pausar() {
    if (this.estado !== "activo") {
      return;
    }

    const ahora = Date.now();

    if (this.ultimoInicioMs) {
      this.acumuladoMs +=
        ahora - this.ultimoInicioMs;
    }

    this.ultimoInicioMs = null;
    this.estado = "pausado";
  }

  reanudar() {
    if (this.estado !== "pausado") {
      return;
    }

    this.ultimoInicioMs = Date.now();
    this.estado = "activo";
  }

  finalizar() {
    if (this.estado === "activo") {
      const ahora = Date.now();

      if (this.ultimoInicioMs) {
        this.acumuladoMs +=
          ahora - this.ultimoInicioMs;
      }
    }

    this.ultimoInicioMs = null;
    this.estado = "finalizado";

    return this.obtenerTiempoSegundos();
  }

  reiniciar() {
    this.estado = "inactivo";
    this.acumuladoMs = 0;
    this.ultimoInicioMs = null;
  }

  obtenerTiempoSegundos() {
    let total =
      this.acumuladoMs;

    if (
      this.estado === "activo" &&
      this.ultimoInicioMs
    ) {
      total +=
        Date.now() -
        this.ultimoInicioMs;
    }

    return Math.max(
      0,
      total / 1000
    );
  }

  obtenerTiempoRedondeado() {
    return Math.floor(
      this.obtenerTiempoSegundos()
    );
  }

  obtenerEstado() {
    return this.estado;
  }

  obtenerSnapshot() {
    return {
      estado:
        this.estado,

      acumuladoMs:
        this.acumuladoMs,

      ultimoInicioMs:
        this.ultimoInicioMs,
    };
  }

  restaurar(snapshot) {
    if (!snapshot) {
      this.reiniciar();
      return;
    }

    this.estado =
      snapshot.estado ||
      "inactivo";

    this.acumuladoMs =
      Number(
        snapshot.acumuladoMs
      ) || 0;

    this.ultimoInicioMs =
      snapshot.ultimoInicioMs
        ? Number(
            snapshot.ultimoInicioMs
          )
        : null;
  }
}

export const relojClase =
  new ClassClock();

export { ClassClock };