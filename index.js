#!/usr/bin/env node

import { bootstrapWithAdapter } from '@pagermon/ingest-core/bootstrap.js';
import Adapter from './adapter/rtl-sdr-multimon-ng/adapter.js';

bootstrapWithAdapter(Adapter);
