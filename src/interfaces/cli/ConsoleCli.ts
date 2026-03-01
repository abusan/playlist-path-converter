import { ArgParser } from '../../infrastructure/cli/ArgParser.js';
import { Scanner } from '../../infrastructure/filesystem/Scanner.js';
import { Writer } from '../../infrastructure/filesystem/Writer.js';
import { PathConversionService } from '../../domain/services/PathConversionService.js';
import { ConvertPlaylistUseCase } from '../../application/useCases/ConvertPlaylistUseCase.js';

export async function runCli() {
  const parser = new ArgParser();
  const scanner = new Scanner();
  const writer = new Writer();
  const converter = new PathConversionService();
  const useCase = new ConvertPlaylistUseCase(scanner, writer, converter);

  try {
    const input = await parser.parse(process.argv);
    useCase.execute(input);
    console.log('正常終了');
  } catch (err: any) {
    console.error(err.message || err);
    process.exit(1);
  }
}
