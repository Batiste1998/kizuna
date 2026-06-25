import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dir = resolve(process.cwd(), config.getOrThrow<string>('UPLOAD_DIR'));
        mkdirSync(dir, { recursive: true });
        const maxMb = config.getOrThrow<number>('MAX_UPLOAD_MB');
        return {
          storage: diskStorage({
            destination: dir,
            filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
          }),
          limits: { fileSize: maxMb * 1024 * 1024 },
        };
      },
    }),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
