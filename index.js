#!/usr/bin/env node

import { bootstrapWithAdapter } from '@pagermon/ingest-core';
import Adapter from './adapter/rtl-sdr-multimon-ng/adapter.js';

bootstrapWithAdapter(Adapter);
