// Guitar Flow's tap on the microphone.
//
// The browser hands audio over 128 frames at a time. That is far too short a window to ask what
// note it is, so this gathers the quanta into blocks the size the analysis wants and posts each
// one as signed 16-bit PCM — the same shape the phones send, so this file is the only place in
// the app that knows the microphone is a browser's.
//
// It does not resample. The audio context is opened at the rate the analysis asks for and the
// browser resamples the microphone into it in native code, which is better than anything worth
// writing here.
class MicProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super(options);
    this.block = new Int16Array(options.processorOptions.blockSamples);
    this.filled = 0;
  }

  process(inputs) {
    // Before the microphone track goes live there is a stretch with no input at all, and Firefox
    // hands over an empty frame now and then even after it does.
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      const sample = Math.max(-1, Math.min(1, channel[i]));
      this.block[this.filled++] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      if (this.filled === this.block.length) {
        // A copy travels: the next quantum starts filling this same buffer straight away.
        this.port.postMessage(this.block.slice());
        this.filled = 0;
      }
    }
    return true;
  }
}

registerProcessor('vibra-mic', MicProcessor);
