import * as fs from 'fs';
import type { OutputFormat } from '../../domain/services/PathConversionService.js';
import type { Encoding } from '../../application/dto/ConvertInput.js';

export interface EnvConfig {
  scanDir?: string;
  baseDir?: string;
  outputFormat?: OutputFormat;
  makeBackup?: boolean;
  removeHashComments?: boolean;
  removeEmptyLines?: boolean;
  dryRun?: boolean;
  dryRunFile?: string;
  encoding?: Encoding;
}

/**
 * 簡易 dotenv パーサー。依存を増やしたくないため自前実装。
 */
export function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const obj: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!key) continue;
    obj[key] = rest.join('=');
  }
  return obj;
}

export function configFromEnv(env: Record<string, string>): EnvConfig {
  const cfg: EnvConfig = {};
  if (env.SCAN_DIR) cfg.scanDir = env.SCAN_DIR;
  if (env.BASE_DIR) cfg.baseDir = env.BASE_DIR;
  if (env.OPT_OUTPUT_FORMAT) {
    const fmt = env.OPT_OUTPUT_FORMAT.trim().toLowerCase();
    cfg.outputFormat = fmt === 'windows' || fmt === 'win' || fmt === 'w' ? 'windows' : 'linux';
  }
  const bool = (val?: string) => val?.trim().toLowerCase() === 'true';
  if (bool(env.OPT_MAKE_BACKUP)) cfg.makeBackup = true; else cfg.makeBackup = false;
  if (bool(env.OPT_REMOVE_ALL)) {
    cfg.removeHashComments = true;
    cfg.removeEmptyLines = true;
  } else {
    if (bool(env.OPT_REMOVE_HASH_COMMENTS)) cfg.removeHashComments = true; else cfg.removeHashComments = false;
    if (bool(env.OPT_REMOVE_EMPTY_LINES)) cfg.removeEmptyLines = true; else cfg.removeEmptyLines = false;
  }
  if (bool(env.OPT_DRY_RUN)) cfg.dryRun = true; else cfg.dryRun = false;
  if (env.OPT_DRY_RUN_FILE) cfg.dryRunFile = env.OPT_DRY_RUN_FILE;

  if (env.OPT_ENCODING) {
    const enc = env.OPT_ENCODING.trim().toLowerCase();
    const allowed: Record<string, Encoding> = {
      'utf8': 'utf8',
      'utf8-bom': 'utf8-bom',
      'shift_jis': 'shift_jis',
      'euc-jp': 'euc-jp',
      'cp932': 'cp932',
      'cp51932': 'cp51932',
      'ascii': 'ascii'
    };
    const resolved = allowed[enc];
    if (resolved) {
      cfg.encoding = resolved;
    } else {
      throw new Error(`unsupported encoding in .env: ${env.OPT_ENCODING}`);
    }
  }

  return cfg;
}
