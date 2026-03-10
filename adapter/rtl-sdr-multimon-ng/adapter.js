/**
 * RTL-SDR + Multimon-NG Source Adapter
 *
 * A complete source adapter that internally composes a receiver and decoder.
 */

import readline from 'readline';
import RtlSdrReceiver from './receiver.js';
import MultimonNgDecoder from './decoder.js';

class RtlSdrMultimonNgAdapter {
  constructor(config = {}) {
    this.config = config;
    this.label = config.label || 'pagermon-ingest';
    const baseLogger = config.logger;
    const metrics = config.metrics || null;

    if (!baseLogger || typeof baseLogger.child !== 'function') {
      throw new Error('RTL-SDR adapter requires config.logger with child() method');
    }

    if (metrics) {
      this._metricsDecoded = metrics.counter({
        name: 'adapter_messages_decoded_total',
        help: 'Total messages successfully decoded by the adapter',
        labelNames: ['format', 'source'],
      });
      this._metricsSkipped = metrics.counter({
        name: 'adapter_messages_skipped_total',
        help: 'Total lines from the decoder that produced no message (unknown protocol, validation failure, empty)',
        labelNames: ['source'],
      });
      this._metricsErrors = metrics.counter({
        name: 'adapter_messages_errors_total',
        help: 'Total adapter message parse errors',
        labelNames: ['source'],
      });
    }

    const adapterConfig = config.adapter || {};
    const receiverConfig = {
      frequencies: (adapterConfig.frequencies || '')
        .toString()
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      gain: parseNumber(adapterConfig.gain),
      squelch: parseNumber(adapterConfig.squelch),
      ppm: parseNumber(adapterConfig.ppm),
      device: adapterConfig.device ?? null,
      extraArgs: parseArgList(adapterConfig.rtl_fm_extra_args),
      ...(config.receiver || {}),
    };
    const decoderConfig = {
      protocols: (adapterConfig.protocols || '')
        .toString()
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      charset: adapterConfig.charset ?? null,
      format: adapterConfig.format || 'alpha',
      extraArgs: parseArgList(adapterConfig.multimon_extra_args),
      ...(config.decoder || {}),
    };

    if (!Array.isArray(receiverConfig.frequencies) || receiverConfig.frequencies.length === 0) {
      throw new Error('RTL-SDR adapter requires receiver.frequencies');
    }

    if (!Array.isArray(decoderConfig.protocols) || decoderConfig.protocols.length === 0) {
      throw new Error('RTL-SDR adapter requires decoder.protocols');
    }

    this.receiver = new RtlSdrReceiver({
      ...receiverConfig,
      logger: baseLogger.child({ component: 'receiver' }),
    });
    this.decoder = new MultimonNgDecoder({
      ...decoderConfig,
      logger: baseLogger.child({ component: 'decoder' }),
    });
    this.lineReader = null;
    this.running = false;
  }

  getName() {
    return 'rtl-sdr-multimon-ng';
  }

  start(onMessage, onClose, onError) {
    this.receiver.spawn();
    this.decoder.spawn();

    const rxOut = this.receiver.getOutputStream();
    const txIn = this.decoder.getInputStream();
    rxOut.pipe(txIn);

    const decoderOut = this.decoder.getOutputStream();
    this.lineReader = readline.createInterface({ input: decoderOut });
    this.running = true;

    this.lineReader.on('line', (line) => {
      try {
        const message = this.decoder.parseLine(line, this.label);
        if (message) {
          this._metricsDecoded?.inc({ format: message.format || 'unknown', source: this.label });
          onMessage(message);
        } else {
          this._metricsSkipped?.inc({ source: this.label });
        }
      } catch (err) {
        this._metricsErrors?.inc({ source: this.label });
        if (onError) onError(err);
      }
    });

    this.lineReader.on('close', () => {
      this.running = false;
      if (onClose) onClose();
    });

    this.lineReader.on('error', (err) => {
      if (onError) onError(err);
    });
  }

  stop() {
    this.running = false;

    if (this.lineReader) {
      this.lineReader.close();
      this.lineReader = null;
    }

    this.decoder.kill();
    this.receiver.kill();
  }

  isRunning() {
    return this.running && this.receiver.isRunning() && this.decoder.isRunning();
  }
}

function parseNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = parseFloat(String(value));
  return Number.isNaN(parsed) ? null : parsed;
}

function parseArgList(value) {
  if (!value || typeof value !== 'string') {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v));
      }
    } catch {
      // Fall back to whitespace split
    }
  }

  return trimmed.split(/\s+/).filter(Boolean);
}

export default RtlSdrMultimonNgAdapter;
