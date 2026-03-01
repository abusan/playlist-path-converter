import * as fs from 'fs';
import * as path from 'path';
import type { FileScanner } from '../../application/useCases/ConvertPlaylistUseCase.js';

export class Scanner implements FileScanner {
  listM3u8(scanDir: string): string[] {
    if (!fs.existsSync(scanDir) || !fs.statSync(scanDir).isDirectory()) {
      throw new Error(`scanDir is not a directory: ${scanDir}`);
    }
    return fs.readdirSync(scanDir).filter(f => path.extname(f) === '.m3u8');
  }

  makeBackup(scanDir: string, files: string[]): string {
    const ts = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const name = `backup_${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;
    const backupDir = path.join(scanDir, name);
    fs.mkdirSync(backupDir, { recursive: true });
    files.forEach(file => {
      fs.copyFileSync(path.join(scanDir, file), path.join(backupDir, file));
    });
    console.log(`バックアップを作成しました: ${backupDir}`);
    return backupDir;
  }
}
