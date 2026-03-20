/**
 * RTL-SDR + Multimon-NG Source Adapter
 *
 * A complete source adapter that internally spawns an OS pipeline.
 */

import readline from 'readline';
import { spawn } from 'child_process';
import { Message } from '@pagermon/ingest-core';

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
      this._metricsHardwareInfo = metrics.gauge({
        name: 'adapter_hardware_info',
        help: 'Hardware and software information of the receiver',
        labelNames: ['tuner', 'device', 'decoder_version'],
      });
      this._metricsHardwareErrors = metrics.counter({
        name: 'adapter_hardware_errors_total',
        help: 'Total hardware related errors (e.g., PLL not locked)',
        labelNames: ['source'],
      });
      this._metricsDecodingStats = metrics.counter({
        name: 'adapter_decoding_stats_total',
        help: 'Decoding statistic counters from multimon-ng',
        labelNames: ['source', 'type'],
      });
      this._metricsSignalCertainty = metrics.histogram({
        name: 'adapter_signal_certainty',
        help: 'Signal certainty of decoding operations',
        labelNames: ['source'],
        buckets: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
      });
      this._metricsSyncLoss = metrics.counter({
        name: 'adapter_sync_lost_total',
        help: 'Total synchronization losses detected in the decoder',
        labelNames: ['source'],
      });
    }

    this.hardwareInfo = { tuner: 'unknown', device: 'unknown', decoder_version: 'unknown' };

    const adapterConfig = config.adapter || {};
    this.receiverConfig = {
      frequencies: (adapterConfig.frequencies || '')
        .toString()
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      gain: parseNumber(adapterConfig.gain),
      squelch: parseNumber(adapterConfig.squelch),
      ppm: parseNumber(adapterConfig.ppm),
      device: adapterConfig.device ?? null,
      sampleRate: (config.receiver && config.receiver.sampleRate) || '22050',
      extraArgs: parseArgList(adapterConfig.rtl_fm_extra_args),
      ...(config.receiver || {}),
    };
    this.decoderConfig = {
      protocols: (adapterConfig.protocols || '')
        .toString()
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      charset: adapterConfig.charset ?? null,
      format: parseOptionalString(adapterConfig.format),
      verbosityLevel: parseNumber(adapterConfig.verbosity_level) ?? 6,
      extraArgs: parseArgList(adapterConfig.multimon_extra_args),
      ...(config.decoder || {}),
    };

    if (!Array.isArray(this.receiverConfig.frequencies) || this.receiverConfig.frequencies.length === 0) {
      throw new Error('RTL-SDR adapter requires receiver.frequencies');
    }

    if (!Array.isArray(this.decoderConfig.protocols) || this.decoderConfig.protocols.length === 0) {
      throw new Error('RTL-SDR adapter requires decoder.protocols');
    }

    this.lineReader = null;
    this.running = false;
  }

  getName() {
    return 'rtl-sdr-multimon-ng';
  }

  _buildReceiverArgs() {
    const rx = this.receiverConfig;
    const args = ['-s', String(rx.sampleRate)];
    for (const freq of rx.frequencies) {
      args.push('-f', String(freq));
    }
    if (rx.gain !== null && rx.gain !== undefined) args.push('-g', String(rx.gain));
    if (rx.ppm !== null && rx.ppm !== undefined) args.push('-p', String(rx.ppm));
    if (rx.squelch !== null && rx.squelch !== undefined) args.push('-l', String(rx.squelch));
    if (rx.device !== null && rx.device !== undefined) args.push('-d', String(rx.device));
    args.push('-E', 'dc', '-F', '0', '-A', 'fast');
    if (Array.isArray(rx.extraArgs) && rx.extraArgs.length > 0) {
      args.push(...rx.extraArgs.map((arg) => String(arg)));
    }
    return args;
  }

  _buildDecoderArgs() {
    const tx = this.decoderConfig;
    const args = ['-t', 'raw'];
    if (tx.verbosityLevel !== null && tx.verbosityLevel !== undefined) {
      args.push('-v', String(tx.verbosityLevel));
    }
    for (const protocol of tx.protocols) {
      args.unshift('-a', protocol);
    }
    if (tx.charset) args.push('-C', tx.charset);
    if (tx.format) args.push('-f', tx.format);
    args.push('--timestamp', '--iso8601', '--json');
    if (Array.isArray(tx.extraArgs) && tx.extraArgs.length > 0) {
      args.push(...tx.extraArgs.map((arg) => String(arg)));
    }
    args.push('-');
    return args;
  }

  start(onMessage, onClose, onError) {
    const rxArgs = this._buildReceiverArgs();
    const txArgs = this._buildDecoderArgs();

    const escapeArg = (arg) => `'${String(arg).replace(/'/g, "'\\''")}'`;
    const rxCmd = `rtl_fm ${rxArgs.map(escapeArg).join(' ')}`;
    const txCmd = `multimon-ng ${txArgs.map(escapeArg).join(' ')}`;
    const combinedCmd = `${rxCmd} | ${txCmd}`;

    this.config.logger.info({ command: combinedCmd }, 'Spawning combined OS pipeline');

    let exited = false;

    this.process = spawn('sh', ['-c', combinedCmd], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.process.on('error', (err) => {
      this.config.logger.error({ err: err.message }, 'Pipeline process error');
      if (onError) onError(err);
    });

    this.process.on('exit', (code, signal) => {
      this.config.logger.error({ code, signal }, 'Pipeline process exited');
      if (!exited) {
        exited = true;
        this.running = false;
        if (onClose) onClose();
        if (code !== 0 && onError) onError(new Error(`Pipeline process exited with code ${code} and signal ${signal}`));
      }
    });

    if (this.process.stderr) {
      const errRl = readline.createInterface({ input: this.process.stderr });
      errRl.on('line', (line) => {
        this.config.logger.debug({ line }, 'pipeline stderr');
        this._parseTelemetry(line);
      });
    }

    this.lineReader = readline.createInterface({ input: this.process.stdout });
    this.running = true;

    this.lineReader.on('line', (line) => {
      try {
        const message = this.parseLine(line, this.label);
        if (message) {
          this._metricsDecoded?.inc({
            format: message.format || 'unknown',
            source: message.metadata?.source || this.label,
          });
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
      if (!exited) {
        exited = true;
        this.running = false;
        if (onClose) onClose();
      }
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

    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
    }
  }

  isRunning() {
    return this.running && this.process && !this.process.killed;
  }

  _parseTelemetry(line) {
    if (!line) return;

    if (line.includes('PLL not locked!')) {
      this._metricsHardwareErrors?.inc({ source: this.label });
    }

    if (line.includes('Error:') || line.includes('error decoding') || line.includes('Bit error')) {
      this._metricsDecodingStats?.inc({ source: this.label, type: 'decode_error' });
    }

    let updatedInfo = false;
    const tunerMatch = line.match(/Found (.+) tuner/i);
    if (tunerMatch) {
      this.hardwareInfo.tuner = tunerMatch[1].trim();
      updatedInfo = true;
    }

    const deviceMatch = line.match(/Using device \d+: (.+)/i);
    if (deviceMatch) {
      this.hardwareInfo.device = deviceMatch[1].trim();
      updatedInfo = true;
    }

    const versionMatch = line.match(/multimon-ng\s+([0-9.]+)/i);
    if (versionMatch) {
      this.hardwareInfo.decoder_version = versionMatch[1].trim();
      updatedInfo = true;
    }

    if (updatedInfo) {
      this._metricsHardwareInfo?.set(this.hardwareInfo, 1);
    }

    if (line.includes('<LOST SYNC>')) {
      this._metricsSyncLoss?.inc({ source: this.label });
    }

    const certaintyMatch = line.match(/Certainty:\s*(\d+)/i);
    if (certaintyMatch) {
      const certaintyVal = parseInt(certaintyMatch[1], 10);
      this._metricsSignalCertainty?.observe({ source: this.label }, certaintyVal);
    }
  }

  parseLine(line, label) {
    if (!line || line.trim().length === 0) {
      return null;
    }

    let jsonStr = line;
    const jsonStartLabel = line.indexOf('{');
    if (jsonStartLabel > 0) {
      const prefix = line.substring(0, jsonStartLabel);
      this._parseTelemetry(prefix);
      jsonStr = line.substring(jsonStartLabel);
    } else if (jsonStartLabel === -1) {
      this._parseTelemetry(line);
      return null;
    }

    try {
      const obj = JSON.parse(jsonStr);
      const demod = obj.demod_name || '';

      let msg;

      if (demod.includes('POCSAG')) {
        msg = this._parsePocsag(obj);
      } else if (demod.includes('FLEX')) {
        msg = this._parseFlex(obj);
      } else {
        this.config.logger.debug({ demod }, 'Unknown protocol');
        return null;
      }

      if (!msg) return null;

      const messageData = {
        address: msg.address,
        message: msg.message,
        format: msg.format,
        timestamp: msg.timestamp,
        time: msg.time,
        metadata: {
          protocol: demod,
          source: label,
        },
      };

      return new Message(messageData);
    } catch (err) {
      if (this.config && this.config.logger) {
        this.config.logger.debug({ err, rawLine: line }, 'JSON parse error');
      }
      return null;
    }
  }

  _parsePocsag(obj) {
    let format = 'tone';
    let message = '';

    if (obj.alpha !== undefined) {
      format = 'alpha';
      message = String(obj.alpha).trim();
    } else if (obj.numeric !== undefined) {
      format = 'numeric';
      message = String(obj.numeric).trim();
    }

    if ((format === 'alpha' || format === 'numeric') && !message) {
      return null;
    }

    let validMs = new Date(obj.timestamp).getTime();
    if (isNaN(validMs)) {
      validMs = Date.now();
    }
    const safeUnix = Math.floor(validMs / 1000);
    const safeTime = isNaN(new Date(obj.timestamp).getTime()) ? new Date(validMs).toISOString() : obj.timestamp;

    return {
      address: String(obj.address || 0) + String(obj.function || 0),
      message,
      format,
      timestamp: safeUnix,
      time: safeTime,
    };
  }

  _parseFlex(obj) {
    const rawFormat = (obj.format || obj.type || obj.message_type || '').toLowerCase();
    let message = (obj.message || '').toString().trim();

    let format = 'tone';
    if (rawFormat.includes('num')) {
      format = 'numeric';
    } else if (rawFormat.includes('hex')) {
      format = 'alpha';
      let asc = '';
      const hexStr = message.replace(/[^0-9a-fA-F]/g, '');
      for (let i = 0; i + 1 < hexStr.length; i += 2) {
        const charCode = parseInt(hexStr.slice(i, i + 2), 16);
        if (charCode >= 32 && charCode <= 126) asc += String.fromCharCode(charCode);
        else asc += '.';
      }
      message = asc.trim();
    } else if (rawFormat.includes('alpha') || rawFormat.includes('aln') || message.length > 0) {
      format = 'alpha';
    }

    if ((format === 'alpha' || format === 'numeric') && !message) {
      return null;
    }

    let validMs = new Date(obj.timestamp).getTime();
    if (isNaN(validMs)) {
      validMs = Date.now();
    }
    const safeUnix = Math.floor(validMs / 1000);
    const safeTime = isNaN(new Date(obj.timestamp).getTime()) ? new Date(validMs).toISOString() : obj.timestamp;

    return {
      address: obj.capcode || obj.address || '',
      message,
      format,
      timestamp: safeUnix,
      time: safeTime,
    };
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
      // Fall back
    }
  }

  return trimmed.split(/\s+/).filter(Boolean);
}

function parseOptionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default RtlSdrMultimonNgAdapter;
