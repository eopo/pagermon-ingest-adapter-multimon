FROM debian:bookworm-slim AS multimon-builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    cmake \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN git clone --depth 1 https://github.com/EliasOenal/multimon-ng.git /tmp/multimon-ng && \
    cmake -S /tmp/multimon-ng -B /tmp/multimon-ng/build && \
    cmake --build /tmp/multimon-ng/build && \
    cmake --install /tmp/multimon-ng/build && \
    strip /usr/local/bin/multimon-ng && \
    rm -rf /tmp/multimon-ng

FROM node:25-bookworm-slim

ARG CORE_NPM_PACKAGE=@pagermon/ingest-core@latest

ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    rtl-sdr \
    && rm -rf /var/lib/apt/lists/*

COPY --from=multimon-builder /usr/local/bin/multimon-ng /usr/local/bin/multimon-ng

WORKDIR /app

# Install runtime core from npm registry (published package).
RUN npm init -y && npm install --omit=dev "$CORE_NPM_PACKAGE" && npm cache clean --force

COPY --chown=node:node adapter /app/adapter
COPY --chown=node:node index.js /app/index.js

USER node

CMD ["node", "index.js"]
