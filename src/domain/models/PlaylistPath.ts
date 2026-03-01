import * as path from 'path';

/**
 * ドメイン層で使うパス変換の値オブジェクト。
 * 現状では比較的シンプルだが、将来的にルールが増える可能性を見越している。
 */
export class PlaylistPath {
  constructor(public readonly original: string) {}

  /**
   * 指定された基準ディレクトリをもとに相対パスに変換し、
   * 出力形式に応じた区切り文字に調整する。
   */
  toRelative(baseDir: string, outSep: string): string {
    // 絶対パスに見えるかどうかを判定し、必要なら resolve
    const absolute = path.isAbsolute(this.original)
      ? this.original
      : path.resolve(baseDir, this.original);

    let rel = path.relative(baseDir, absolute);
    rel = rel.split(/[\\/]+/).filter(Boolean).join(outSep);
    return rel;
  }
}
