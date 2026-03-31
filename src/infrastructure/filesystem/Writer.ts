import * as fs from 'fs';
import * as iconv from 'iconv-lite';
import type { FileWriter } from '../../application/useCases/ConvertPlaylistUseCase.js';
import type { Encoding } from '../../application/dto/ConvertInput.js';

const normalizeEncodingName = (encoding: Encoding): { iconvName: string; bom: boolean } => {
  switch (encoding) {
    case 'utf8':
      return { iconvName: 'utf8', bom: false };
    case 'utf8-bom':
      return { iconvName: 'utf8', bom: true };
    case 'shift_jis':
      return { iconvName: 'Shift_JIS', bom: false };
    case 'euc-jp':
      return { iconvName: 'EUC-JP', bom: false };
    case 'cp932':
      return { iconvName: 'cp932', bom: false };
    case 'cp51932':
      return { iconvName: 'CP51932', bom: false };
    case 'ascii':
      return { iconvName: 'ascii', bom: false };
    default:
      // TypeScript コンパイル時に網羅されているため通常は到達しない。
      throw new Error(`unsupported encoding: ${encoding}`);
  }
};

export class Writer implements FileWriter {
  read(filePath: string, encoding: Encoding = 'utf8'): string {
    if (!fs.existsSync(filePath)) {
      throw new Error(`file not found: ${filePath}`);
    }
    const raw = fs.readFileSync(filePath);
    const { iconvName, bom } = normalizeEncodingName(encoding);
    const decoded = iconv.decode(raw, iconvName);
    if (bom && decoded.startsWith('\uFEFF')) {
      return decoded.slice(1);
    }
    // utf8-bom read should strip BOM, other encodings are preserved as-is.
    return decoded;
  }

  write(filePath: string, content: string, encoding: Encoding = 'utf8'): void {
    const { iconvName, bom } = normalizeEncodingName(encoding);
    let buffer = iconv.encode(content, iconvName);
    if (bom) {
      buffer = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), buffer]);
    }
    fs.writeFileSync(filePath, buffer);
  }

  logDryRun(file: string, original: string, transformed: string): void {
    console.log('--- dry-run ---');
    console.log(`file: ${file}`);
    console.log('--- original ---');
    console.log(original);
    console.log('--- transformed ---');
    console.log(transformed);
    console.log('--- end dry-run ---');
  }
}
