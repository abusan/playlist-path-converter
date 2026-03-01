import * as fs from 'fs';
import type { FileWriter } from '../../application/useCases/ConvertPlaylistUseCase.js';

export class Writer implements FileWriter {
  read(filePath: string): string {
    if (!fs.existsSync(filePath)) {
      throw new Error(`file not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf-8');
  }

  write(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content, 'utf-8');
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
