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

# Your PagerMon API key (get this from server settings)
INGEST_CORE__API_KEY=your_api_key_here

# Frequency in Hz (example: 163.000 MHz = 163000000)
INGEST_ADAPTER__FREQUENCIES=163000000

# Protocol (POCSAG512, POCSAG1200, POCSAG2400, or FLEX)
INGEST_ADAPTER__PROTOCOLS=POCSAG512
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

| Variable                                  | Default              | Description                                        |
| ----------------------------------------- | -------------------- | -------------------------------------------------- |
| `INGEST_CORE__API_URL`                    | _(required)_         | PagerMon server URL (e.g., `http://pagermon:3000`) |
| `INGEST_CORE__API_KEY`                    | _(required)_         | API key from PagerMon server settings              |
| `INGEST_CORE__LABEL`                      | `pagermon-ingest`    | Source label for messages                          |
| `INGEST_CORE__REDIS_URL`                  | `redis://redis:6379` | Redis connection URL                               |
| `INGEST_CORE__ENABLE_DLQ`                 | `true`               | Enable dead-letter queue for failed messages       |
| `INGEST_CORE__HEALTH_CHECK_INTERVAL`      | `10000`              | Health check interval in milliseconds              |
| `INGEST_CORE__HEALTH_UNHEALTHY_THRESHOLD` | `3`                  | Failures before marking unhealthy                  |

### Adapter Settings

Configure RTL-SDR receiver and multimon-ng decoder.

#### Required

| Variable                      | Description                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| `INGEST_ADAPTER__FREQUENCIES` | Frequency in Hz (e.g., `163000000` for 163.0 MHz). Separate multiple with commas.            |
| `INGEST_ADAPTER__PROTOCOLS`   | Protocol(s): `POCSAG512`, `POCSAG1200`, `POCSAG2400`, `FLEX`. Separate multiple with commas. |

#### Optional

| Variable                  | Default  | Description                                  |
| ------------------------- | -------- | -------------------------------------------- |
| `INGEST_ADAPTER__GAIN`    | _(auto)_ | Tuner gain (0-50, or `auto`)                 |
| `INGEST_ADAPTER__SQUELCH` | `0`      | Squelch level (0-100)                        |
| `INGEST_ADAPTER__PPM`     | `0`      | Frequency correction in PPM                  |
| `INGEST_ADAPTER__DEVICE`  | `0`      | RTL-SDR device index (if multiple receivers) |
| `INGEST_ADAPTER__CHARSET` | `UTF-8`  | Character encoding for decoded messages      |
| `INGEST_ADAPTER__FORMAT`  | `alpha`  | Default message format hint                  |

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

The compose file uses `privileged: true` for plug-and-play RTL-SDR access.

For non-privileged mode, configure host udev rules and add container user to `plugdev` group.

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

### Build Exactly From A Release Tag

For reproducible self-builds, build from a Git tag instead of a moving branch:

```bash
git fetch --tags
git checkout <release-tag>   # e.g. v1.2.0
docker build -t pagermon-ingest-multimon:<release-tag> .
```

Edit `stack.env`:

```bash
INGEST_IMAGE=pagermon-ingest-multimon:custom
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
