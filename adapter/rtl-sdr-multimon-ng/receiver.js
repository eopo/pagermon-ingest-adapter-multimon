/**
 * RTL-SDR Receiver Adapter
 *
 * Concrete implementation for RTL-SDR USB receivers.
 */

import { spawn } from 'child_process';
import readline from 'readline';

class RtlSdrReceiver {
  constructor(config = {}) {
    this.config = config;
    this.process = null;
    this.frequencies = config.frequencies || [];
    this.gain = config.gain;
    this.squelch = config.squelch;
    this.ppm = config.ppm;
    this.device = config.device;
    this.sampleRate = config.sampleRate || '22050';
    this.extraArgs = Array.isArray(config.extraArgs) ? config.extraArgs : [];
  }

  getName() {
    return 'rtl-sdr';
  }

  spawn() {
    const args = ['-s', this.sampleRate];

    // Add frequencies
    this.frequencies.forEach((freq) => {
      args.push('-f', String(freq));
    });

    // Optional parameters
    if (this.gain !== null && this.gain !== undefined) args.push('-g', String(this.gain));
    if (this.ppm !== null && this.ppm !== undefined) args.push('-p', String(this.ppm));
    if (this.squelch !== null && this.squelch !== undefined) args.push('-l', String(this.squelch));
    if (this.device !== null && this.device !== undefined) args.push('-d', String(this.device));

    // Fixed parameters for pager reception
    args.push('-E', 'dc');
    args.push('-F', '0');
    args.push('-A', 'fast');

    // Passthrough for advanced rtl_fm flags that are not explicitly modeled.
    if (this.extraArgs.length > 0) {
      args.push(...this.extraArgs.map((arg) => String(arg)));
    }

    console.log(`[RTL-SDR] Spawning rtl_fm ${args.join(' ')}`);

    this.process = spawn('rtl_fm', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.process.on('error', (err) => {
      console.error('[RTL-SDR] Error:', err.message);
      process.exit(1);
    });

    this.process.on('exit', (code, signal) => {
      console.error(`[RTL-SDR] Process exited: code=${code} signal=${signal}`);
      const exitCode = typeof code === 'number' ? code : signal ? 1 : 0;
      process.exit(exitCode);
    });

    // Monitor stderr
    if (this.process.stderr) {
      const rl = readline.createInterface({ input: this.process.stderr });
      rl.on('line', (line) => {
        console.log('[RTL-SDR]', line);
        if (line.includes('status:')) {
          const match = /status: (\d)/.exec(line);
          if (match) process.exit(parseInt(match[1], 10));
        }
      });
    }

    return this.process;
  }

  getOutputStream() {
    if (!this.process || !this.process.stdout) {
      throw new Error('rtl_fm not running');
    }
    return this.process.stdout;
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

export default RtlSdrReceiver;
