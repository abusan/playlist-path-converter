// 1. プレイリスト内のパスを一括変換するCLIを提供する
// 2. 指定したディレクトリ内の .m3u8 ファイルを処理する
// 3. パスを相対パスに変換して上書き保存する

// index.ts はエントリーポイントとして最低限のコードのみを持ち、
// 実際の処理は interfaces/cli へ委譲する。

import { runCli } from './interfaces/cli/ConsoleCli.js';
import { PathConversionService } from './domain/services/PathConversionService.js';
import type { OutputFormat as DomainOutputFormat } from './domain/services/PathConversionService.js';

// パス変換処理
export type OutputFormat = DomainOutputFormat;

// 以前は convertPaths が index に実装されていたが、
// ドメインサービスへ移行したためここではそのラッパーを提供する。
const _converter = new PathConversionService();
export function convertPaths(
  content: string,
  baseDir: string,
  outputFormat: OutputFormat = 'linux',
  removeHashComments: boolean = false,
  removeEmptyLines: boolean = false
): string {
  return _converter.convert(content, baseDir, outputFormat, removeHashComments, removeEmptyLines);
}

async function main() {
  await runCli();
}
// ESM と CJS の両方でエントリーポイント判定を行う。
import { fileURLToPath } from 'url';
const isEntry =
  (typeof require !== 'undefined' && require.main === module) ||
  (typeof import.meta !== 'undefined' && process.argv[1] === fileURLToPath(import.meta.url));

export async function mainEntry() {
  try {
    await main();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

if (isEntry) {
  mainEntry();
}
