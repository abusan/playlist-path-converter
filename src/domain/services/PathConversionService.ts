import { PlaylistPath } from '../models/PlaylistPath.js';

export type OutputFormat = 'windows' | 'linux';

/**
 * ドメインサービス：コンテンツ全体のパス変換ロジック
 */
export class PathConversionService {
  /**
   * @param content 変換対象となるプレイリストファイル内容
   * @param baseDir 相対パスの基準ディレクトリ
   * @param outputFormat 出力パスの形式
   * @param removeHashComments 先頭 `#` の行を削除するか
   * @param removeEmptyLines 空行を削除するか
   */
  convert(
    content: string,
    baseDir: string,
    outputFormat: OutputFormat = 'linux',
    removeHashComments: boolean = false,
    removeEmptyLines: boolean = false
  ): string {
    const absolutePathRegex = /(?:[A-Za-z]:)?[\\/][^\s]+/g;
    const outSep = outputFormat === 'windows' ? '\\' : '/';

    const lines = content.split(/\r?\n/);
    const processed: string[] = [];
    for (const line of lines) {
      if (removeHashComments && line.trim().startsWith('#')) continue;
      if (removeEmptyLines && line.trim() === '') continue;
      const newLine = line.replace(absolutePathRegex, (match) => {
        const pp = new PlaylistPath(match);
        return pp.toRelative(baseDir, outSep);
      });
      processed.push(newLine);
    }
    return processed.join('\n');
  }
}
