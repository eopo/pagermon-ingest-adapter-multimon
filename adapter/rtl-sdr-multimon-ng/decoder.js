/**
 * Multimon-NG Decoder Adapter
 *
 * Concrete implementation for the multimon-ng decoder.
 */

import { spawn } from 'child_process';
import readline from 'readline';
import Message from '@pagermon/ingest-core/lib/message/Message.js';

class MultimonNgDecoder {
  constructor(config = {}) {
    this.config = config;
    const { logger } = config;
    if (
      !logger ||
      typeof logger.info !== 'function' ||
      typeof logger.error !== 'function' ||
      typeof logger.debug !== 'function'
    ) {
      throw new Error('MultimonNgDecoder requires config.logger with info(), error() and debug() methods');
    }
    this.logger = logger;
    this.protocols = config.protocols || [];
    this.charset = config.charset;
    this.format = config.format || 'alpha';
    this.extraArgs = Array.isArray(config.extraArgs) ? config.extraArgs : [];
  }

  getName() {
    return 'multimon-ng';
  }

  spawn() {
    const args = ['-t', 'raw'];

    // Add protocols
    this.protocols.forEach((protocol) => {
      args.unshift('-a', protocol);
    });

    // Optional parameters
    if (this.charset) args.push('-C', this.charset);
    if (this.format) args.push('-f', this.format);

    // Output format
    args.push('--timestamp');
    args.push('--iso8601');
    args.push('--json');
    args.push('-');

    // Passthrough for advanced multimon-ng flags that are not explicitly modeled.
    if (this.extraArgs.length > 0) {
      args.push(...this.extraArgs.map((arg) => String(arg)));
    }

    this.logger.info({ args }, 'Spawning multimon-ng');

    this.process = spawn('multimon-ng', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.process.on('error', (err) => {
      this.logger.error({ err: err.message }, 'Process error');
      process.exit(1);
    });

    this.process.on('exit', (code, signal) => {
      this.logger.error({ code, signal }, 'Process exited');
      const exitCode = typeof code === 'number' ? code : signal ? 1 : 0;
      process.exit(exitCode);
    });

    // Monitor stderr
    if (this.process.stderr) {
      const rl = readline.createInterface({ input: this.process.stderr });
      rl.on('line', (line) => {
        this.logger.debug({ line }, 'stderr');
        if (line.includes('status:')) {
          const match = /status: (\d)/.exec(line);
          if (match) process.exit(parseInt(match[1], 10));
        }
      });
    }

    return this.process;
  }

  getInputStream() {
    if (!this.process || !this.process.stdin) {
      throw new Error('multimon-ng not running');
    }
    return this.process.stdin;
  }

  getOutputStream() {
    if (!this.process || !this.process.stdout) {
      throw new Error('multimon-ng not running');
    }
    return this.process.stdout;
  }

  parseLine(line, label) {
    if (!line || line.trim().length === 0) {
      return null;
    }

    try {
      const obj = JSON.parse(line);
      const demod = obj.demod_name || '';

      let msg;

      if (demod.includes('POCSAG')) {
        msg = this._parsePocsag(obj);
      } else if (demod.includes('FLEX')) {
        msg = this._parseFlex(obj);
      } else {
        this.logger.debug({ demod }, 'Unknown protocol');
        return null;
      }

      if (!msg) return null;

      // Create normalized Message object
      const message = new Message({
        address: msg.address,
        message: msg.message,
        format: msg.format,
        source: label,
        timestamp: msg.timestamp,
        time: msg.time,
      });

      const validation = message.validate();
      if (!validation.valid) {
        this.logger.debug({ errors: validation.errors }, 'Invalid message');
        return null;
      }

      return message;
    } catch {
      return null;
    }
  }

  _parsePocsag(obj) {
    const alpha = (obj.alpha || '').toString().trim();
    const numeric = (obj.numeric || '').toString().trim();

    const format = alpha.length > 0 ? 'alpha' : 'numeric';
    const message = format === 'alpha' ? alpha : numeric;

    if (!message && format === 'alpha') {
      return null;
    }

    return {
      address: String(obj.address || 0) + String(obj.function || 0),
      message,
      format,
      timestamp: Math.floor(new Date(obj.timestamp).getTime() / 1000),
      time: obj.timestamp,
    };
  }

  _parseFlex(obj) {
    const format = (obj.format || obj.type || obj.message_type || 'alpha').toLowerCase().includes('num')
      ? 'numeric'
      : 'alpha';

    const message = (obj.message || '').toString().trim();

    if (!message && format === 'alpha') {
      return null;
    }

    return {
      address: obj.capcode || obj.address || '',
      message,
      format,
      timestamp: Math.floor(new Date(obj.timestamp).getTime() / 1000),
      time: obj.timestamp,
    };
  }

  kill() {
    if (this.process) {
      this.process.kill('SIGTERM');
    }
  }

  isRunning() {
    return this.process && !this.process.killed;
  }
}

export default MultimonNgDecoder;
