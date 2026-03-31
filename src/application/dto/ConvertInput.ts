import type { OutputFormat } from '../../domain/services/PathConversionService.js';

export type Encoding =
  | 'utf8'
  | 'utf8-bom'
  | 'shift_jis'
  | 'euc-jp'
  | 'cp932'
  | 'cp51932'
  | 'ascii';

export interface ConvertInput {
  scanDir: string;
  baseDir: string;
  outputFormat: OutputFormat;
  makeBackup: boolean;
  removeHashComments: boolean;
  removeEmptyLines: boolean;
  dryRunFile?: string | undefined;
  encoding?: Encoding;
}
