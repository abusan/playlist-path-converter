import type { OutputFormat } from '../../domain/services/PathConversionService.js';

export interface ConvertInput {
  scanDir: string;
  baseDir: string;
  outputFormat: OutputFormat;
  makeBackup: boolean;
  removeHashComments: boolean;
  removeEmptyLines: boolean;
  dryRunFile?: string | undefined;
}
