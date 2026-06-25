import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'node:fs';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { DocumentsService } from './documents.service';

@UseGuards(AuthGuard)
@Controller()
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get('alternants/:alternantId/documents')
  list(@CurrentUser() user: AuthUser, @Param('alternantId') alternantId: string) {
    return this.service.list(user, alternantId);
  }

  @Post('alternants/:alternantId/documents')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser() user: AuthUser,
    @Param('alternantId') alternantId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('category') category?: string,
  ) {
    if (!file) throw new BadRequestException('Fichier manquant');
    return this.service.record(user, alternantId, file, category);
  }

  @Get('documents/:documentId/download')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('documentId') documentId: string,
  ): Promise<StreamableFile> {
    const { document, path } = await this.service.getForDownload(user, documentId);
    return new StreamableFile(createReadStream(path), {
      type: document.mimeType,
      disposition: `attachment; filename="${encodeURIComponent(document.originalName)}"`,
    });
  }

  @Delete('documents/:documentId')
  remove(@CurrentUser() user: AuthUser, @Param('documentId') documentId: string) {
    return this.service.remove(user, documentId);
  }
}
