import * as readline from 'readline';
import type { ConvertInput } from '../../application/dto/ConvertInput.js';
import { configFromEnv, parseEnvFile } from './EnvLoader.js';
import type { OutputFormat } from '../../domain/services/PathConversionService.js';

async function askQuestion(query: string, defaultVal?: string): Promise<string> {
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

export class ArgParser {
  /**
   * プロセス引数と .env を読んで ConvertInput を構築する。
   * 実行時に対話的入力が必要な場合はプロンプトを表示するため async。
   */
  async parse(argv: string[]): Promise<ConvertInput> {
    // scanDir, baseDir, etc are filled stepwise
    const rawEnv = parseEnvFile(process.cwd() + '/.env');
    const envCfg = configFromEnv(rawEnv);

    let scanDir: string | undefined = envCfg.scanDir;
    let baseDir: string | undefined = envCfg.baseDir;
    let outputFormat: OutputFormat = envCfg.outputFormat || 'linux';
    let removeHashComments = envCfg.removeHashComments || false;
    let removeEmptyLines = envCfg.removeEmptyLines || false;
    let makeBackup = envCfg.makeBackup || false;
    let dryRunFile: string | undefined = envCfg.dryRunFile;

    let loadEnvMode = false;
    const args = argv.slice(2);

    if (args.length > 0) {
      args.forEach(arg => {
        switch (arg.toLowerCase()) {
          case 'load-env':
          case '--load-env':
          case 'env':
            loadEnvMode = true;
            break;
        }
      });

      if (!loadEnvMode && args.length >= 2) {
        [scanDir, baseDir] = args;
      }

      if (!loadEnvMode) {
        args.forEach(arg => {
          switch (arg.toLowerCase()) {
            case 'backup':
            case 'bk':
              makeBackup = true;
              break;
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
            case 'remove-all':
            case 'ra':
              removeHashComments = true;
              removeEmptyLines = true;
              break;
            case 'remove-comments':
            case 'rc':
              removeHashComments = true;
              break;
            case 'remove-empty-lines':
            case 're':
              removeEmptyLines = true;
              break;
            case 'dry-run':
            case 'dry':
            case 'dr':
              const parts = arg.split(/[:=]/);
              if (parts.length >= 2 && parts[1]) {
                dryRunFile = parts.slice(1).join(':');
              }
              break;
            default:
              if (arg.startsWith('-')) {
                console.warn(`警告: 不明なオプション "${arg}" は無視されます。`);
              }
              break;
          }
        });
      }
    } else {
      // interactive prompts
      scanDir = await askQuestion('処理対象のディレクトリを入力してください', envCfg.scanDir);
      baseDir = await askQuestion('相対パスの基準となるディレクトリを入力してください', envCfg.baseDir);
      const fmt = await askQuestion('出力パス形式を選択してください (windows/linux)', envCfg.outputFormat || 'linux');
      const lf = fmt.trim().toLowerCase();
      outputFormat = lf === 'windows' || lf === 'win' || lf === 'w' ? 'windows' : 'linux';

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

      const dr = await askYesNo('dry-run を行いますか？ (指定する場合はファイル名を入力)', !!envCfg.dryRun);
      if (dr) {
        const fname = await askQuestion('dry-run 対象のファイル名を入力してください（例: playlist.m3u8）', envCfg.dryRunFile || '');
        if (fname) {
          dryRunFile = fname.trim();
        }
      } else {
        dryRunFile = undefined;
      }
    }

    if (loadEnvMode) {
      const cfg = configFromEnv(rawEnv);
      console.log('--- .env に設定されている内容 ---');
      console.log(JSON.stringify(cfg, null, 2));
      const agree = await askYesNo('上記設定で実行します。よろしいですか？', false);
      if (!agree) {
        throw new Error('中止');
      }
      if (!cfg.scanDir || !cfg.baseDir) {
        throw new Error('env ファイルに SCAN_DIR と BASE_DIR の両方を設定する必要があります。');
      }

      // .env の内容で上書き
      scanDir = cfg.scanDir;
      baseDir = cfg.baseDir;

      if (cfg.outputFormat)                     outputFormat = cfg.outputFormat;
      if (cfg.makeBackup         !== undefined) makeBackup = cfg.makeBackup;
      if (cfg.removeHashComments !== undefined) removeHashComments = cfg.removeHashComments;
      if (cfg.removeEmptyLines   !== undefined) removeEmptyLines = cfg.removeEmptyLines;
      if (cfg.dryRun             !== undefined) {
        if (cfg.dryRun && !cfg.dryRunFile) {
          throw new Error('.env から dry-run を有効にする場合は OPT_DRY_RUN_FILE で対象ファイルを指定してください。');
        }
        if (!cfg.dryRun) {
          dryRunFile = undefined;
        }
      }
    }

    if (!scanDir || !baseDir) {
      throw new Error('処理対象および基準ディレクトリを指定してください。');
    }

    return {
      scanDir,
      baseDir,
      outputFormat,
      makeBackup,
      removeHashComments,
      removeEmptyLines,
      dryRunFile,
    };
  }
}
