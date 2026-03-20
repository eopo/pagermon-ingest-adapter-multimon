# PagerMon Ingest — Multimon Adapter

[![Node.js](https://img.shields.io/badge/node-%3E%3D22.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/github/license/eopo/pagermon-ingest-adapter-multimon.svg)](LICENSE)
[![CI Status](https://img.shields.io/github/actions/workflow/status/eopo/pagermon-ingest-adapter-multimon/ci.yml?branch=main&label=CI)](https://github.com/eopo/pagermon-ingest-adapter-multimon/actions)
[![Docker Image Version](https://img.shields.io/docker/v/shutterfire/pagermon-ingest-multimon?label=docker%20image&sort=semver)](https://hub.docker.com/r/shutterfire/pagermon-ingest-multimon)

RTL-SDR + multimon-ng source adapter for PagerMon.

Supports POCSAG and FLEX pager protocols via RTL-SDR USB receivers.

## Container Images

Pre-built images are available from two registries:

- **Docker Hub**: `shutterfire/pagermon-ingest-multimon`
- **GitHub Container Registry**: `ghcr.io/eopo/pagermon-ingest-multimon`

Both registries contain identical images. Choose based on your preference:

```yaml
# Docker Hub (default)
image: shutterfire/pagermon-ingest-multimon:latest

# Or GitHub Container Registry
image: ghcr.io/eopo/pagermon-ingest-multimon:latest
```

To use GHCR, set in your `stack.env`:

```bash
INGEST_IMAGE=ghcr.io/eopo/pagermon-ingest-multimon:latest
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- RTL-SDR USB receiver
- Running PagerMon server instance
- API key from your PagerMon server

### Setup

1. **Copy the example environment file**

```bash
cp .env.example stack.env
```

2. **Edit `stack.env` with your settings**

Minimal required configuration:

```bash
# Your PagerMon server URL
INGEST_CORE__API_URL=http://pagermon:3000

# Stable target name used in metrics labels (recommended)
INGEST_CORE__API_NAME=pm-prod-a

# Your PagerMon API key (get this from server settings)
INGEST_CORE__API_KEY=your_api_key_here

# Optional alternative: Docker secret file for key
# INGEST_CORE__API_KEY_FILE=/run/secrets/pagermon_api_key

# Frequency in Hz (example: 163.000 MHz = 163000000)
INGEST_ADAPTER__FREQUENCIES=163000000

# Protocol (POCSAG512, POCSAG1200, POCSAG2400, or FLEX)
INGEST_ADAPTER__PROTOCOLS=POCSAG512
```

Rules for API key configuration:

- Per API target, `KEY` and `KEY_FILE` are mutually exclusive (do not set both)
- If `*_KEY_FILE` is unreadable or empty, startup fails with a configuration error

Optional multi-target configuration:

```bash
INGEST_CORE__API_1_URL=http://pagermon-a:3000
INGEST_CORE__API_1_NAME=pm-prod-a
INGEST_CORE__API_1_KEY=key_a

INGEST_CORE__API_2_URL=http://pagermon-b:3000
INGEST_CORE__API_2_NAME=pm-prod-b
INGEST_CORE__API_2_KEY_FILE=/run/secrets/pagermon_api2_key
```

3. **Start the stack**

```bash
docker compose up -d
```

4. **Check logs**

```bash
docker compose logs -f ingest
```

You should see initialization messages and decoded pager messages.

## Configuration Reference

### Core Settings

Configure PagerMon API connection and queue behavior.

| Variable                                  | Default              | Description                                             |
| ----------------------------------------- | -------------------- | ------------------------------------------------------- |
| `INGEST_CORE__API_URL`                    | _(required)_         | PagerMon server URL (e.g., `http://pagermon:3000`)      |
| `INGEST_CORE__API_NAME`                   | `target-1`           | Stable target name used in metrics labels               |
| `INGEST_CORE__API_KEY`                    | conditional          | API key from PagerMon server settings                   |
| `INGEST_CORE__API_KEY_FILE`               | conditional          | Docker secret file path for target 1 API key            |
| `INGEST_CORE__API_<n>_URL`                | optional             | Additional PagerMon target URL                          |
| `INGEST_CORE__API_<n>_NAME`               | `target-<n>`         | Stable target name for metrics labels                   |
| `INGEST_CORE__API_<n>_KEY`                | conditional          | API key for target `n`                                  |
| `INGEST_CORE__API_<n>_KEY_FILE`           | conditional          | Docker secret file path for target `n` API key          |
| `INGEST_CORE__LABEL`                      | `pagermon-ingest`    | Default source label when adapter does not set `source` |
| `INGEST_CORE__REDIS_URL`                  | `redis://redis:6379` | Redis connection URL                                    |
| `INGEST_CORE__ENABLE_DLQ`                 | `true`               | Enable dead-letter queue for failed messages            |
| `INGEST_CORE__HEALTH_CHECK_INTERVAL`      | `10000`              | Health check interval in milliseconds                   |
| `INGEST_CORE__HEALTH_UNHEALTHY_THRESHOLD` | `3`                  | Failures before marking unhealthy                       |
| `INGEST_CORE__METRICS_ENABLED`            | `false`              | Enable Prometheus metrics HTTP endpoint                 |
| `INGEST_CORE__METRICS_PORT`               | `9464`               | Metrics HTTP port inside the ingest container           |
| `INGEST_CORE__METRICS_HOST`               | `0.0.0.0`            | Metrics HTTP bind address                               |
| `INGEST_CORE__METRICS_PATH`               | `/metrics`           | Metrics HTTP endpoint path                              |
| `INGEST_CORE__METRICS_PREFIX`             | runtime default      | Prefix added to exported metric names                   |

### Adapter Settings

Configure RTL-SDR receiver and multimon-ng decoder.

#### Required

| Variable                      | Description                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| `INGEST_ADAPTER__FREQUENCIES` | Frequency in Hz (e.g., `163000000` for 163.0 MHz). Separate multiple with commas.            |
| `INGEST_ADAPTER__PROTOCOLS`   | Protocol(s): `POCSAG512`, `POCSAG1200`, `POCSAG2400`, `FLEX`. Separate multiple with commas. |

#### Optional

| Variable                              | Default   | Description                                                                                                                                                                                        |
| ------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INGEST_ADAPTER__GAIN`                | _(auto)_  | Tuner gain (0-50, or `auto`)                                                                                                                                                                       |
| `INGEST_ADAPTER__SQUELCH`             | `0`       | Squelch level (0-100)                                                                                                                                                                              |
| `INGEST_ADAPTER__PPM`                 | `0`       | Frequency correction in PPM                                                                                                                                                                        |
| `INGEST_ADAPTER__DEVICE`              | `0`       | RTL-SDR device index (if multiple receivers)                                                                                                                                                       |
| `INGEST_ADAPTER__CHARSET`             | `UTF-8`   | Character encoding for decoded messages                                                                                                                                                            |
| `INGEST_ADAPTER__VERBOSITY_LEVEL`     | `1`       | Telemetry verbosity for multimon-ng (`0` to disable, `1` for basic metrics, `2`+ for debug)                                                                                                        |
| `INGEST_ADAPTER__FORMAT`              | _(unset)_ | Optional decoder hint passed as `-f <value>` to multimon-ng only when set (e.g., `alpha`, `numeric`). The final PagerMon message format is resolved separately (see format resolution rules below) |
| `INGEST_ADAPTER__RTL_FM_EXTRA_ARGS`   | _(empty)_ | Optional passthrough args appended to `rtl_fm` command (whitespace-separated string or JSON array string, e.g., `-M fm -s 24000` or `["-M","fm","-s","24000"]`)                                    |
| `INGEST_ADAPTER__MULTIMON_EXTRA_ARGS` | _(empty)_ | Optional passthrough args appended to `multimon-ng` command (whitespace-separated string or JSON array string, e.g., `--label ingest-a` or `["--label","ingest-a"]`)                               |

The final PagerMon message `format` is resolved by ingest-core as normalized `alpha` or `numeric`.
Resolution order is: explicit `format` -> `metadata.format` -> fallback inference (`alpha` if message text exists, else `numeric`).
Protocol information such as `POCSAG1200` or `FLEX` remains separate from that normalized message type.

This adapter sets `metadata.protocol` (for example `POCSAG1200` / `FLEX1600`) and `metadata.format` per decoded line.
`source` is provided via `metadata.source` when available and is resolved by ingest-core; if empty, ingest-core applies `INGEST_CORE__LABEL` as default.

### Compose Runtime Variables

These variables are used by `compose.yml` itself (outside ingest-core adapter parsing):

| Variable              | Default                                       | Description                                          |
| --------------------- | --------------------------------------------- | ---------------------------------------------------- |
| `INGEST_IMAGE`        | `shutterfire/pagermon-ingest-multimon:latest` | Container image tag used for the `ingest` service    |
| `INGEST_METRICS_PORT` | `9464`                                        | Host/container port mapping for the metrics endpoint |

### Development/Test Variables

| Variable                | Default  | Description                                  |
| ----------------------- | -------- | -------------------------------------------- |
| `INGEST_TEST_LOG_LEVEL` | `silent` | Log level used by `npm run test:integration` |

### Example Configurations

#### Single frequency POCSAG

```bash
INGEST_ADAPTER__FREQUENCIES=163000000
INGEST_ADAPTER__PROTOCOLS=POCSAG1200
INGEST_ADAPTER__GAIN=30
```

#### Multiple frequencies

```bash
INGEST_ADAPTER__FREQUENCIES=163000000,163025000,163050000
INGEST_ADAPTER__PROTOCOLS=POCSAG512,POCSAG1200
```

#### FLEX protocol

```bash
INGEST_ADAPTER__FREQUENCIES=929000000
INGEST_ADAPTER__PROTOCOLS=FLEX
INGEST_ADAPTER__GAIN=40
```

## Metrics & Observability

The adapter exposes Prometheus-compatible metrics through the shared ingest-core runtime.

That means you get both:

- core runtime metrics for queueing, worker throughput, API health, and adapter state
- adapter-specific metrics for decode quality and parser behavior

### Enabling Metrics

By default, metrics collection is disabled. Enable the HTTP metrics endpoint:

```bash
# In stack.env:
INGEST_CORE__METRICS_ENABLED=true
INGEST_CORE__METRICS_PORT=9464       # Optional: default port
INGEST_CORE__METRICS_HOST=0.0.0.0    # Optional: HTTP bind address
INGEST_CORE__METRICS_PATH=/metrics   # Optional: HTTP endpoint path
```

If you change the port in `stack.env`, also change the compose port mapping variable so the container port and published port stay aligned:

```bash
INGEST_CORE__METRICS_PORT=9470
INGEST_METRICS_PORT=9470
```

Then retrieve metrics (from metrics port):

```bash
curl http://localhost:9464/metrics
```

### Core Runtime Metrics

With the default prefix `pagermon_ingest_`, the stack also exports shared ingest-core metrics such as:

- `pagermon_ingest_messages_enqueued_total`
- `pagermon_ingest_messages_processed_total{status="success",target_name="..."}`
- `pagermon_ingest_messages_failed_total{reason="...",target_name="..."}`
- `pagermon_ingest_message_process_duration_seconds{status="success|failure",target_name="..."}`
- `pagermon_ingest_last_message_timestamp_seconds{target_name="..."}`
- `pagermon_ingest_queue_depth_messages`
- `pagermon_ingest_api_up{target_name="..."}`
- `pagermon_ingest_health_check_failures_total{target_name="..."}`
- `pagermon_ingest_adapter_up`

### Adapter Metrics

The adapter registers three counters to understand signal processing flow.
The names below reflect the default prefix `pagermon_ingest_`.

| Metric                                           | Labels             | Description                                                                                                                                                       |
| ------------------------------------------------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pagermon_ingest_adapter_messages_decoded_total` | `format`, `source` | Counter of successfully decoded pager messages. `format` is usually `alpha` or `numeric`.                                                                         |
| `pagermon_ingest_adapter_messages_skipped_total` | `source`           | Counter of decoder output lines that produced no message (unknown protocol, invalid format, empty line). If this is high, check protocol/frequency configuration. |
| `pagermon_ingest_adapter_messages_errors_total`  | `source`           | Counter of exceptions during message parsing. Indicates corrupt decoder output or schema mismatches.                                                              |

If you override `INGEST_CORE__METRICS_PREFIX`, the exported names change accordingly.

### Example Metric Output

```
# Decoded 42 POCSAG alpha messages, skipped 8 lines, 0 errors
pagermon_ingest_adapter_messages_decoded_total{format="alpha",source="pagermon-ingest"} 42
pagermon_ingest_adapter_messages_skipped_total{source="pagermon-ingest"} 8
pagermon_ingest_adapter_messages_errors_total{source="pagermon-ingest"} 0

# If decode ratio is poor, high skipped % indicates:
# - Wrong frequency (capturing other signals)
# - Incorrect protocol configuration
# - Strong interference or weak signal
```

### Troubleshooting with Metrics

- **High `skipped_total`**: Many decoder lines produce no valid message. Verify `INGEST_ADAPTER__FREQUENCIES` and `INGEST_ADAPTER__PROTOCOLS` are correct for your region.
- **High `errors_total`**: Exceptions during decode. Review logs for `pagermon_ingest_adapter_messages_errors_total` increments and check for decoder binary/version issues.
- **Low `decoded_total`**: Few messages decoded despite correct config. Adjust `INGEST_ADAPTER__GAIN` or `INGEST_ADAPTER__SQUELCH` or verify pager traffic exists on your frequency.

### Grafana Dashboard

A pre-built Grafana dashboard is included in the `grafana/` directory for visualizing adapter metrics.

The bundled dashboard assumes the default metrics prefix `pagermon_ingest_`.
If you change `INGEST_CORE__METRICS_PREFIX`, update the Prometheus queries in the dashboard accordingly.

**Quick Start:**

1. Import `grafana/pagermon-adapter-dashboard.json` into Grafana
2. Select your Prometheus datasource
3. View real-time metrics and decode quality

**Dashboard Panels:**

- **Message Processing Rates** — Decoded, skipped, and error rates over time
- **Decode Quality %** — Cumulative quality percentage (good >90%, warning 50-89%, bad <50%)
- **Message Distribution** — Pie chart of decoded vs. skipped vs. errors (cumulative)
- **Counter Summary** — Table view of raw metric values

Use the bundled dashboard JSON directly from `grafana/pagermon-adapter-dashboard.json` and adapt the Prometheus queries if you change the metric prefix.

### Metrics for Adapter Authors

This adapter uses the same `config.metrics` interface that all custom adapters receive from `@pagermon/ingest-core`.

- Register counters, gauges, and histograms in the adapter constructor.
- Use unprefixed names in code such as `adapter_messages_decoded_total`.
- Let the runtime add the global prefix defined by `INGEST_CORE__METRICS_PREFIX`.
- Use labels for dimensions like `format` and `source` instead of creating separate metric names per protocol.

If you are building your own adapter, use the detailed guide in [../pagermon-ingest-core/ADAPTER_DEVELOPMENT.md](../pagermon-ingest-core/ADAPTER_DEVELOPMENT.md).

## Docker Compose Setup

The included `compose.yml` provides a complete stack:

- **ingest**: RTL-SDR multimon adapter
- **redis**: message queue (with persistence)

### Service Management

```bash
# Start
docker compose up -d

# Stop
docker compose down

# View logs
docker compose logs -f ingest

# Restart after config change
docker compose restart ingest

# Full reset (removes queue data)
docker compose down -v
docker compose up -d
```

### USB Device Access

The compose file uses `privileged: true` and runs the ingest service as `root` for reliable plug-and-play RTL-SDR access.

For hardened non-root mode, configure host udev rules and add the container user to the correct USB device group (often `plugdev`).

## Troubleshooting

### No messages appearing

1. **Check logs for errors**

```bash
docker compose logs ingest
```

2. **Verify frequency and protocol**

Use a known-good frequency where pager traffic is active.

3. **Verify API connectivity**

Check that `INGEST_CORE__API_URL` points to your PagerMon server and the API key is correct.

4. **Test RTL-SDR device**

```bash
docker compose exec ingest rtl_test
```

5. **Check Redis queue**

```bash
docker compose exec redis redis-cli
> LLEN bull:sdr-messages:wait
```

### Container exits immediately

- Check that RTL-SDR device is connected and accessible
- Verify `INGEST_ADAPTER__FREQUENCIES` and `INGEST_ADAPTER__PROTOCOLS` are set
- Review startup logs: `docker compose logs ingest`

### Poor decode quality

- Adjust `INGEST_ADAPTER__GAIN` (try values between 20-40)
- Tune `INGEST_ADAPTER__SQUELCH` (start low, increase if too many false positives)
- Verify `INGEST_ADAPTER__PPM` for frequency drift correction

## Advanced Topics

### Running Without Docker

Requires manual installation of `rtl-sdr` and `multimon-ng` packages.

```bash
npm install
npm start
```

### Custom Image Builds

```bash
docker build -t pagermon-ingest-multimon:custom .
```

Then edit `stack.env`:

```bash
INGEST_IMAGE=pagermon-ingest-multimon:custom
```

### Build Exactly From A Release Tag

For reproducible self-builds, build from a Git tag instead of a moving branch:

```bash
git fetch --tags
git checkout <release-tag>   # e.g. v1.2.0
docker build -t pagermon-ingest-multimon:<release-tag> .
```

Then edit `stack.env` to use the release-tagged image:

```bash
INGEST_IMAGE=pagermon-ingest-multimon:<release-tag>
```

### Multi-Receiver Setup

Run multiple compose stacks with different device indices:

```bash
# Stack 1
INGEST_CORE__LABEL=receiver-a
INGEST_ADAPTER__DEVICE=0
INGEST_ADAPTER__FREQUENCIES=163000000

# Stack 2
INGEST_CORE__LABEL=receiver-b
INGEST_ADAPTER__DEVICE=1
INGEST_ADAPTER__FREQUENCIES=169000000
```

## Development

For adapter developers and contributors:

```bash
npm run check
npm test
```

See core repository documentation for adapter architecture details:  
https://github.com/eopo/ingest-core

## Repository Structure

This repository provides:

- Adapter implementation (`adapter/rtl-sdr-multimon-ng/`)
- Container image with `rtl_fm` and `multimon-ng` pre-installed
- Compose stack template
- Integration and unit tests

Core runtime (queue/worker/API) comes from `@pagermon/ingest-core` dependency.
