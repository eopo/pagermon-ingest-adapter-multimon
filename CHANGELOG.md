# Changelog

## [1.7.1](https://github.com/eopo/pagermon-ingest-adapter-multimon/compare/1.7.0...1.7.1) (2026-03-20)


### Bug Fixes

* verbosity level & parser change ([23de9e1](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/23de9e1cc3a1b33e3965d419cd6afdcae53467c4))
* verbosity level & parser change ([30b570f](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/30b570f4fe047889fbc3b4cedf5a9e677ebec715))

## [1.7.0](https://github.com/eopo/pagermon-ingest-adapter-multimon/compare/1.6.0...1.7.0) (2026-03-20)


### Features

* enhance telemetry parsing and metrics tracking for hardware and decoding errors ([62c5634](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/62c5634a3b7d8a2140a18966e444210bc79ecc93))
* enhance telemetry parsing and metrics tracking for hardware and… ([ab922b3](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/ab922b31c390e53f7a229b7fe6829dfa5fc0c716))

## [1.6.0](https://github.com/eopo/pagermon-ingest-adapter-multimon/compare/1.5.1...1.6.0) (2026-03-17)


### Features

* use sh pipe instead of node piping for increased performance ([9b461bd](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/9b461bd32af7033ae900bc19096baa354273390f))


### Bug Fixes

* apply suggestions ([654c1e3](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/654c1e39329fec49c9247d12892793e14f66c311))
* implement suggestions ([4c5a8b9](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/4c5a8b904e9f8852828b9d30f4a01b7ecdd6bcc2))
* switch to os pipe instead of node pipe ([5fc60e9](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/5fc60e91fdb2abb6804bab0fc0ff3f934d0a71f9))


### Reverts

* wrongfully removed os pipe ([72a9045](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/72a9045ca6c67b89c3180c4a10e31306a26dec89))

## [1.5.1](https://github.com/eopo/pagermon-ingest-adapter-multimon/compare/1.5.0...1.5.1) (2026-03-16)


### Bug Fixes

* don't set format per default ([806c301](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/806c301336c00e9d778bb8a76c48998122a98a95))

## [1.5.0](https://github.com/eopo/pagermon-ingest-adapter-multimon/compare/1.4.0...1.5.0) (2026-03-13)


### Features

* better logging ([85ba7bf](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/85ba7bfb3d5447f0dddaec89f44fd5f691938183))
* better metrics ([85ba7bf](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/85ba7bfb3d5447f0dddaec89f44fd5f691938183))
* update core to 1.5.0 ([01860be](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/01860be24754070f425fd5d533a5da084922b442))
* update core to 1.5.0 ([85ba7bf](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/85ba7bfb3d5447f0dddaec89f44fd5f691938183))

## [1.4.0](https://github.com/eopo/pagermon-ingest-adapter-multimon/compare/1.3.2...1.4.0) (2026-03-11)


### Features

* enforce logger requirement in RTL-SDR adapter and update tests to use vi ([385d70e](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/385d70eab417a488707a8e1bfe4e810dd9d6ceff))
* integrate logging and metrics ([0ad6e01](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/0ad6e012109b6b7fb614db11b62347fe0cf9cc91))
* validate logger configuration in MultimonNgDecoder and RtlSdrReceiver constructors ([22e3cc1](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/22e3cc1cd1cabe6f8a4d12a0daef4d17a3830c95))


### Bug Fixes

* Update Dockerfile and compose.yml for USB device access and runtime user configuration ([306fef6](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/306fef6d54d4eb5c4a87fbe9ea0fe39165c3878c))
* Update formatting commands in package.json to use .prettierrc configuration ([b242271](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/b242271f94c58df0ca760b75b5d34ed696774322))

## [1.3.2](https://github.com/eopo/pagermon-ingest-adapter-multimon/compare/1.3.1...1.3.2) (2026-03-10)


### Bug Fixes

* **deps:** bump @pagermon/ingest-core from 1.2.0 to 1.3.1 ([8672aa9](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/8672aa9b2540e05fe3cfb4791fc48391c4e1245f))
* **deps:** bump @pagermon/ingest-core from 1.2.0 to 1.3.1 ([5d60b95](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/5d60b950d6e0940389de98ae9a01937966100062))
* **deps:** bump actions/checkout from 4 to 6 ([07df24f](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/07df24fe9cc03e13f150da1797157e434a526e33))
* **deps:** bump actions/checkout from 4 to 6 ([969c307](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/969c307dfc4dd1bb7a9802ef401a66ab4420084b))
* **deps:** bump actions/setup-node from 4 to 6 ([04d6afa](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/04d6afa7105860cd43073b524b1a64b2c9b6ce7a))
* **deps:** bump actions/setup-node from 4 to 6 ([0fe882b](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/0fe882bdaece7e8ab455c479c40140b8f98192de))
* **deps:** bump peter-evans/create-pull-request from 6 to 8 ([55aa8e4](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/55aa8e4bfebd2a12d4d21e9280f21434bdd9b84f))
* **deps:** bump peter-evans/create-pull-request from 6 to 8 ([2d6c277](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/2d6c277b37c48035530dc36459b816e019c4d118))

## [1.3.1](https://github.com/eopo/pagermon-ingest-adapter-multimon/compare/v1.3.0...1.3.1) (2026-03-10)


### Bug Fixes

* **deps:** bump docker/login-action from 3 to 4 ([894e00b](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/894e00bed6bf395021d233961ee3d54f71f543ab))
* **deps:** bump docker/login-action from 3 to 4 ([6dabdcf](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/6dabdcf477447acc3ccb920c0d0ce50b2c109b9c))
* **deps:** bump docker/setup-buildx-action from 3 to 4 ([458dc0f](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/458dc0ff7c3a94e9b1e6ebbb9b65af9cf01ffa62))
* **deps:** bump docker/setup-buildx-action from 3 to 4 ([38d2909](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/38d2909bec17daf24238406db54654261963da70))
* **deps:** bump docker/setup-qemu-action from 3 to 4 ([fe4c34e](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/fe4c34e0ad14182d3d7a17eff1bc4b969a410ebc))
* **deps:** bump docker/setup-qemu-action from 3 to 4 ([6bfebaf](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/6bfebaf1766a85d8a1b8db7899eb86b47ef9b998))
* enhance release-please configuration ([3b52032](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/3b52032af8d692d4806596d2a92500e779f5ca0b))
* update commit message prefixes in dependabot config and CI workflows; ([3b52032](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/3b52032af8d692d4806596d2a92500e779f5ca0b))

## [1.3.0](https://github.com/eopo/pagermon-ingest-adapter-multimon/compare/v1.2.0...v1.3.0) (2026-03-10)


### Features

* update @pagermon/ingest-core to v1.2.0 ([e037391](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/e037391d11a726988541845a4d27653665897e7e))


### Bug Fixes

* skip lefthook install in production builds ([441fe72](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/441fe72ee1f0916e2d41c6dc94e8fced3c0e0a42))
* update API key header name and adjust test assertions in audio integration tests ([fb8cda2](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/fb8cda26ab17ac6b36fa384babbe1b4324b76c14))

## [1.2.0](https://github.com/eopo/pagermon-ingest-adapter-multimon/compare/v1.1.0...v1.2.0) (2026-03-10)


### Features

* update @pagermon/ingest-core to 1.1.0 ([cd4a48a](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/cd4a48ab8bbffbe35a4d0e755c21e493581adae8))


### Bug Fixes

* update npm version handling in core dependency update workflow ([2edb390](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/2edb3900df8c7efaf6942faea1a2649cc6c5bd9a))

## [1.1.0](https://github.com/eopo/pagermon-ingest-adapter-multimon/compare/v1.0.4...v1.1.0) (2026-03-10)


### Features

* add workflow to update core dependency and run tests ([bc9a2c1](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/bc9a2c19348d7f6f17a3ba820ce1eb21d044be7e))


### Bug Fixes

* Update 'no-unused-vars' rule to include additional patterns for ignored variables ([6f4231a](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/6f4231a131acf3ca244b9964148f32b32a458a91))

## [1.0.4](https://github.com/eopo/pagermon-ingest-adapter-multimon/compare/v1.0.3...v1.0.4) (2026-03-10)


### Bug Fixes

* Update @pagermon/ingest-core dependency to version 1.0.4 and adjust Dockerfile for npm ci ([6f9a4f4](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/6f9a4f43153ed012ff346b20176faa39693fe260))

## [1.0.3](https://github.com/eopo/pagermon-ingest-adapter-multimon/compare/v1.0.2...v1.0.3) (2026-03-10)


### Bug Fixes

* Update Docker workflow for multi-arch builds and adjust release workflow for manual triggering ([fd0b52c](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/fd0b52c96f787a4bf5e665a5b7b4a3d4adedc663))

## [1.0.2](https://github.com/eopo/pagermon-ingest-adapter-multimon/compare/v1.0.1...v1.0.2) (2026-03-10)


### Bug Fixes

* Add PAT ([3169b07](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/3169b078e41e4bf9910b97d75955e4d9eeda6b7c))

## [1.0.1](https://github.com/eopo/pagermon-ingest-adapter-multimon/compare/v1.0.0...v1.0.1) (2026-03-10)


### Bug Fixes

* Added missing dependencies for coverage test ([039c3aa](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/039c3aaf227f7c24fc0dd312118b2dff10a7e25f))
* Update package-lock ([3af6a8c](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/3af6a8c6c4ee80ec14cfb7cc8869326cfa84f6a5))
* Workflow configuration & Release Please Configuration ([3bfd0b1](https://github.com/eopo/pagermon-ingest-adapter-multimon/commit/3bfd0b1a2cbc93842409c91f1a006956155765ac))
