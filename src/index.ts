// 1. プレイリスト内のパスを一括変換するCLIを提供する
// 2. 指定したディレクトリ内の .m3u8 ファイルを処理する
// 3. パスを相対パスに変換して上書き保存する

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// simple dotenv-like parser (no dependency)
function parseEnvFile(filePath: string): Record<string, string> {
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

export interface EnvConfig {
  scanDir?: string;
  baseDir?: string;
  outputFormat?: OutputFormat;
  makeBackup?: boolean;
  removeHashComments?: boolean;
  removeEmptyLines?: boolean;
  dryRunFile?: string;
}

function configFromEnv(env: Record<string, string>): EnvConfig {
  const cfg: EnvConfig = {};
  if (env.SCAN_DIR) cfg.scanDir = env.SCAN_DIR;
  if (env.BASE_DIR) cfg.baseDir = env.BASE_DIR;
  if (env.OPT_OUTPUT_FORMAT) {
    const fmt = env.OPT_OUTPUT_FORMAT.trim().toLowerCase();
    cfg.outputFormat = fmt === 'windows' || fmt === 'win' || fmt === 'w' ? 'windows' : 'linux';
  }
  const bool = (val?: string) => val?.trim().toLowerCase() === 'true';
  if (bool(env.OPT_MAKE_BACKUP)) cfg.makeBackup = true;
  if (bool(env.OPT_REMOVE_ALL)) {
    cfg.removeHashComments = true;
    cfg.removeEmptyLines = true;
  }
  if (bool(env.OPT_REMOVE_HASH_COMMENTS)) cfg.removeHashComments = true;
  if (bool(env.OPT_REMOVE_EMPTY_LINES)) cfg.removeEmptyLines = true;
  if (env.OPT_DRY_RUN_FILE) cfg.dryRunFile = env.OPT_DRY_RUN_FILE;
  return cfg;
}

// パス変換処理
export type OutputFormat = 'windows' | 'linux';

export function convertPaths(
  content: string,
  baseDir: string,
  outputFormat: OutputFormat = 'linux',
  removeHashComments: boolean = false,
  removeEmptyLines: boolean = false
): string {
  // Windows のドライブレターやパス区切りを考慮してパスを正規化する
  const absolutePathRegex = /(?:[A-Za-z]:)?[\\/][^\s]+/g;
  const outSep = outputFormat === 'windows' ? '\\' : '/';

  const lines = content.split(/\r?\n/);
  const processed: string[] = [];
  for (const line of lines) {
    if (removeHashComments && line.trim().startsWith('#')) continue;
    if (removeEmptyLines && line.trim() === '') continue;
    const newLine = line.replace(absolutePathRegex, (match) => {
      const absolute = path.isAbsolute(match) ? match : path.resolve(baseDir, match);
      let rel = path.relative(baseDir, absolute);
      rel = rel.split(/[\\/]+/).filter(Boolean).join(outSep);
      return rel;
    });
    processed.push(newLine);
  }
  return processed.join('\n');
}

async function askQuestion(query: string, defaultVal?: string): Promise<string> {
  // add default value to prompt if provided
  const displayQuery = defaultVal !== undefined && defaultVal !== ''
    ? `${query} [${defaultVal}]: `
    : `${query}: `;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(displayQuery, ans => {
      rl.close();
      const trimmed = ans.trim();
      if (trimmed === '' && defaultVal !== undefined) {
        resolve(defaultVal);
      } else {
        resolve(trimmed);
      }
    });
  });
}

async function askYesNo(query: string, defaultBool: boolean = false): Promise<boolean> {
  const defStr = defaultBool ? 'y' : 'N';
  const ans = await askQuestion(query + ' (y/N)', defStr);
  return ans.trim().toLowerCase().startsWith('y');
}

async function main() {
  const args = process.argv.slice(2);
  // load .env early for defaults or load-env functionality
  const rawEnv = parseEnvFile(path.join(process.cwd(), '.env'));
  const envCfg = configFromEnv(rawEnv);

  let scanDir: string | undefined;
  let baseDir: string | undefined;
  let outputFormat: OutputFormat = envCfg.outputFormat || 'linux';
  let removeHashComments = envCfg.removeHashComments || false;
  let removeEmptyLines = envCfg.removeEmptyLines || false;
  let makeBackup = envCfg.makeBackup || false;
  let dryRunFile: string | undefined = envCfg.dryRunFile;

  let loadEnvMode = false;

  if (args.length > 0) {
    // detect load-env first
    args.forEach(arg => {
      if (arg.toLowerCase() === 'load-env' || arg.toLowerCase() === '--load-env') {
        loadEnvMode = true;
      }
    });

    if (!loadEnvMode && args.length >= 2) {
      [scanDir, baseDir] = args;
    }

    if (!loadEnvMode) {
      // オプションを解析
      // 3番目以降の引数をオプションとして処理
      args.forEach(arg => {
        switch (arg.toLowerCase()) {
          case 'load-env':
          case '--load-env':
          case 'env':
          case 'e':
            // already handled
            break;

          // バックアップ
          case 'backup':
          case 'bk':
            makeBackup = true;
            break;

          // 出力形式
          case 'windows':
          case 'win':
          case 'w':
            outputFormat = 'windows';
            break;
          case 'linux':
          case 'posix':
          case 'l':
            outputFormat = 'linux';
            break;
          
          // 削除対象の一括指定
          case 'remove-all':
          case 'ra':
            removeHashComments = true;
            removeEmptyLines = true;
            break;
          
          // コメント行削除
          case 'remove-comments':
          case 'rc':
            removeHashComments = true;
            break;
          
          // 空行削除
          case 'remove-empty-lines':
          case 're':
            removeEmptyLines = true;
            break;
          
          // dry-run
          case 'dry-run':
          case 'dry':
          case 'dr':
            // 次の引数をファイル名として扱う
            const parts = arg.split(/[:=]/);
            if (parts.length >= 2 && parts[1]) {
              dryRunFile = parts.slice(1).join(':');
            }
            break;

          default:
            // 解釈できないオプションに警告を出す
            if (arg.startsWith('-')) {
              console.warn(`警告: 不明なオプション "${arg}" は無視されます。`);
            }
            break;
        }
      });
    }
  } else {
    // interactive prompts with environment defaults
    scanDir = await askQuestion('処理対象のディレクトリを入力してください', envCfg.scanDir);
    baseDir = await askQuestion('相対パスの基準となるディレクトリを入力してください', envCfg.baseDir);
    const fmt = await askQuestion('出力パス形式を選択してください (windows/linux)', envCfg.outputFormat || 'linux');
    const lf = fmt.trim().toLowerCase();
    if (lf === 'windows' || lf === 'win' || lf === 'w') {
      outputFormat = 'windows';
    } else {
      outputFormat = 'linux';
    }

    const remAll = await askYesNo('全ての削除対象（先頭 # と空行）を一括で有効にしますか？', !!envCfg.removeHashComments && !!envCfg.removeEmptyLines);
    if (remAll) {
      removeHashComments = true;
      removeEmptyLines = true;
    } else {
      const rem = await askYesNo('先頭が # の行を削除しますか？', !!envCfg.removeHashComments);
      if (rem) removeHashComments = true;

      const remEmpty = await askYesNo('空行を削除しますか？', !!envCfg.removeEmptyLines);
      if (remEmpty) removeEmptyLines = true;
    }

    const bk = await askYesNo('変更前にバックアップを作成しますか？', !!envCfg.makeBackup);
    if (bk) {
      makeBackup = true;
    }

    const dr = await askQuestion('dry-run を行いますか？ (指定する場合はファイル名を入力)', envCfg.dryRunFile ? 'y' : 'N');
    if (dr.trim().toLowerCase().startsWith('y')) {
      const fname = await askQuestion('dry-run 対象のファイル名を入力してください（例: playlist.m3u8）', envCfg.dryRunFile || '');
      if (fname) {
        dryRunFile = fname.trim();
      }
    }
  }

  if (loadEnvMode) {
    // override from env and ignore other sources
    const cfg = configFromEnv(rawEnv);
    console.log('--- .env に設定されている内容 ---');
    console.log(JSON.stringify(cfg, null, 2));
    const agree = await askYesNo('上記設定で実行します。よろしいですか？', false);
    if (!agree) {
      console.log('中止されました。');
      process.exit(0);
    }
    if (!cfg.scanDir || !cfg.baseDir) {
      console.error('env ファイルに SCAN_DIR と BASE_DIR の両方を設定する必要があります。');
      process.exit(1);
    }
    scanDir = cfg.scanDir;
    baseDir = cfg.baseDir;
    if (cfg.outputFormat) outputFormat = cfg.outputFormat;
    if (cfg.makeBackup !== undefined) makeBackup = cfg.makeBackup;
    if (cfg.removeHashComments !== undefined) removeHashComments = cfg.removeHashComments;
    if (cfg.removeEmptyLines !== undefined) removeEmptyLines = cfg.removeEmptyLines;
    if (cfg.dryRunFile !== undefined) dryRunFile = cfg.dryRunFile;
  }

  if (!scanDir || !baseDir) {
    console.error('処理対象および基準ディレクトリを指定してください。');
    process.exit(1);
  }

  if (!fs.existsSync(scanDir) || !fs.statSync(scanDir).isDirectory()) {
    console.error(`指定した処理対象ディレクトリが存在しないかディレクトリではありません: ${scanDir}`);
    process.exit(1);
  }
  if (!fs.existsSync(baseDir) || !fs.statSync(baseDir).isDirectory()) {
    console.error(`指定した基準ディレクトリが存在しないかディレクトリではありません: ${baseDir}`);
    process.exit(1);
  }

  let m3u8Files = fs.readdirSync(scanDir).filter(f => path.extname(f) === '.m3u8');
  if (dryRunFile) {
    if (!m3u8Files.includes(dryRunFile)) {
      console.error(`dry-run 指定ファイルが見つかりません: ${dryRunFile}`);
      process.exit(1);
    }
    m3u8Files = [dryRunFile];
  }
  if (m3u8Files.length === 0) {
    console.log('指定ディレクトリに .m3u8 ファイルが見つかりません。');
    return;
  }

  // Backup if requested (and regardless of dry-run; user requested)
  let backupDir: string | undefined;
  if (makeBackup) {
    const ts = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const name = `backup_${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;
    backupDir = path.join(scanDir, name);
    fs.mkdirSync(backupDir, { recursive: true });
    m3u8Files.forEach(file => {
      const src = path.join(scanDir!, file);
      const dst = path.join(backupDir!, file);
      fs.copyFileSync(src, dst);
    });
    console.log(`バックアップを作成しました: ${backupDir}`);
  }

  m3u8Files.forEach(file => {
    const filePath = path.join(scanDir!, file);
    const original = fs.readFileSync(filePath, 'utf-8');
    const transformed = convertPaths(original, baseDir!, outputFormat, removeHashComments, removeEmptyLines);
    if (dryRunFile) {
      console.log('--- dry-run ---');
      console.log(`file: ${file}`);
      console.log('--- original ---');
      console.log(original);
      console.log('--- transformed ---');
      console.log(transformed);
      console.log('--- end dry-run ---');
    } else {
      fs.writeFileSync(filePath, transformed, 'utf-8');
      console.log(`"${file}" のパスを基準ディレクトリ "${baseDir}" に合わせて変換しました`);
    }
  });
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
