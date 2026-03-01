import type { ConvertInput } from '../dto/ConvertInput.js';
import type { ConvertResult } from '../dto/ConvertResult.js';
import { PathConversionService } from '../../domain/services/PathConversionService.js';

/**
 * スキャンや書き込みを抽象化したインターフェイス。
 * アプリケーション層では具象に依存しない。
 */
export interface FileScanner {
  listM3u8(scanDir: string): string[];
  makeBackup?(scanDir: string, files: string[]): string | undefined;
}

export interface FileWriter {
  read(filePath: string): string;
  write(filePath: string, content: string): void;
  logDryRun?(file: string, original: string, transformed: string): void;
}

export class ConvertPlaylistUseCase {
  constructor(
    private readonly scanner: FileScanner,
    private readonly writer: FileWriter,
    private readonly converter: PathConversionService
  ) {}

  execute(input: ConvertInput): ConvertResult {
    const {
      scanDir,
      baseDir,
      outputFormat,
      makeBackup,
      removeHashComments,
      removeEmptyLines,
      dryRunFile,
    } = input;

    let files = this.scanner.listM3u8(scanDir);
    if (dryRunFile) {
      if (!files.includes(dryRunFile)) {
        throw new Error(`dry-run file not found: ${dryRunFile}`);
      }
      files = [dryRunFile];
    }

    const backupDir = makeBackup && this.scanner.makeBackup
      ? this.scanner.makeBackup(scanDir, files)
      : undefined;

    for (const file of files) {
      const path = scanDir + '/' + file;
      const original = this.writer.read(path);
      const transformed = this.converter.convert(
        original,
        baseDir,
        outputFormat,
        removeHashComments,
        removeEmptyLines
      );
      if (dryRunFile && this.writer.logDryRun) {
        this.writer.logDryRun(file, original, transformed);
      } else {
        this.writer.write(path, transformed);
      }
    }

    const result: ConvertResult = { processedFiles: files };
    if (backupDir !== undefined) {
      result.backupDir = backupDir;
    }
    return result;
  }
}
