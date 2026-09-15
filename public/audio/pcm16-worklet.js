class PCM16Processor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.targetSampleRate =
      16000;

    this.ratio =
      sampleRate /
      this.targetSampleRate;

    this.inputBuffer = [];

    this.position = 0;

    // 800 muestras a 16 kHz = 50 ms
    this.chunkSize = 800;

    this.outputBuffer =
      new Int16Array(
        this.chunkSize
      );

    this.outputIndex = 0;
  }


  floatToPCM16(value) {
    const sample =
      Math.max(
        -1,
        Math.min(
          1,
          value
        )
      );

    return sample < 0
      ? Math.round(
          sample * 32768
        )
      : Math.round(
          sample * 32767
        );
  }


  // Mezclar canales a mono

  downmixToMono(input) {
    if (
      !input ||
      input.length === 0
    ) {
      return null;
    }


    const channels =
      input.filter(
        (channel) =>
          channel &&
          channel.length > 0
      );


    if (
      channels.length === 0
    ) {
      return null;
    }


    const length =
      channels[0].length;


    const mono =
      new Float32Array(
        length
      );


    for (
      let i = 0;
      i < length;
      i += 1
    ) {
      let sum = 0;


      for (
        let channelIndex = 0;
        channelIndex <
        channels.length;
        channelIndex += 1
      ) {
        sum +=
          channels[
            channelIndex
          ][i];
      }


      mono[i] =
        sum /
        channels.length;
    }


    return mono;
  }


  agregarEntrada(samples) {
    for (
      let i = 0;
      i < samples.length;
      i += 1
    ) {
      this.inputBuffer.push(
        samples[i]
      );
    }
  }


  agregarSalida(sample) {
    this.outputBuffer[
      this.outputIndex
    ] =
      this.floatToPCM16(
        sample
      );


    this.outputIndex += 1;


    if (
      this.outputIndex >=
      this.chunkSize
    ) {
      this.enviarChunk();
    }
  }


  enviarChunk() {
    if (
      this.outputIndex === 0
    ) {
      return;
    }


    const chunk =
      this.outputBuffer.slice(
        0,
        this.outputIndex
      );


    this.port.postMessage(
      chunk.buffer,
      [
        chunk.buffer,
      ]
    );


    this.outputBuffer =
      new Int16Array(
        this.chunkSize
      );


    this.outputIndex = 0;
  }


  resampleContinuo() {
    /*
      Necesitamos dos muestras para
      realizar interpolación lineal.
    */

    while (
      this.position + 1 <
      this.inputBuffer.length
    ) {
      const index =
        Math.floor(
          this.position
        );


      const nextIndex =
        index + 1;


      if (
        nextIndex >=
        this.inputBuffer.length
      ) {
        break;
      }


      const fraction =
        this.position -
        index;


      const actual =
        this.inputBuffer[
          index
        ];


      const siguiente =
        this.inputBuffer[
          nextIndex
        ];


      const sample =
        actual +
        (
          siguiente -
          actual
        ) *
        fraction;


      this.agregarSalida(
        sample
      );


      this.position +=
        this.ratio;
    }


    

    const consumed =
      Math.floor(
        this.position
      );


    if (consumed > 0) {
      this.inputBuffer.splice(
        0,
        consumed
      );


      this.position -=
        consumed;
    }
  }


  process(inputs) {
    const input =
      inputs[0];


    const mono =
      this.downmixToMono(
        input
      );


    if (!mono) {
      return true;
    }


    this.agregarEntrada(
      mono
    );


    this.resampleContinuo();


    return true;
  }
}


registerProcessor(
  "pcm16-processor",
  PCM16Processor
);