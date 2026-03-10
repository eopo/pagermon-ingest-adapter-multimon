import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';

const coreLoggerPath = fileURLToPath(new URL('../pagermon-ingest-core/lib/runtime/logger.js', import.meta.url));

export default defineConfig({
  test: {
    alias: {
      '@ingest-core-logger': coreLoggerPath,
    },
  },
  resolve: {
    alias: {
      '@ingest-core-logger': coreLoggerPath,
    },
  },
});
