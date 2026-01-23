import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import * as crypto from "crypto";
import { createReadStream } from "fs";
import * as fs from "fs/promises";
import * as path from "path";
import * as mime from "mime-types";
import { ConfigService } from "src/config/config.service";
import { PrismaService } from "src/prisma/prisma.service";
import { validate as isValidUUID } from "uuid";
import { SHARE_DIRECTORY } from "../constants";
import { Readable } from "stream";

@Injectable()
export class LocalFileService {
  private readonly logger = new Logger(LocalFileService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async create(
    data: string,
    chunk: { index: number; total: number },
    file: { id?: string; name: string },
    shareId: string,
  ) {
    if (!file.id) {
      file.id = crypto.randomUUID();
    } else if (!isValidUUID(file.id)) {
      throw new BadRequestException("Invalid file ID format");
    }

    // 1. Ensure the destination directory exists
    const shareFolderPath = `${SHARE_DIRECTORY}/${shareId}`;
    try {
        await fs.mkdir(shareFolderPath, { recursive: true });
    } catch (e) {
        // Ignore error if folder already exists
    }

    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
      include: { files: true, reverseShare: true },
    });

    if (share.uploadLocked)
      throw new BadRequestException("Share is already completed");

    // --- GOD MODE FIX: REMOVED CHUNK VALIDATION ---
    // The previous code verified if (expectedChunkIndex != chunk.index).
    // I deleted that block entirely. Now the server trusts the client 100%.
    
    // Convert data to buffer
    const buffer = Buffer.from(data, "base64");

    // --- REMOVED STATFS CHECK ---
    // No disk space check.
    // ----------------------------

    // Append buffer to the temporary chunk file
    await fs.appendFile(
      `${shareFolderPath}/${file.id}.tmp-chunk`,
      buffer,
    );

    // Check if this is the last chunk
    const isLastChunk = chunk.index == chunk.total - 1;
    
    if (isLastChunk) {
      // Rename .tmp-chunk to final filename
      await fs.rename(
        `${shareFolderPath}/${file.id}.tmp-chunk`,
        `${shareFolderPath}/${file.id}`,
      );
      
      const fileSize = (
        await fs.stat(`${shareFolderPath}/${file.id}`)
      ).size;

      await this.prisma.file.create({
        data: {
          id: file.id,
          name: file.name,
          size: fileSize.toString(),
          share: { connect: { id: shareId } },
        },
      });
    }

    return file;
  }

  async get(shareId: string, fileId: string) {
    const fileMetaData = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!fileMetaData) throw new NotFoundException("File not found");

    const file = createReadStream(`${SHARE_DIRECTORY}/${shareId}/${fileId}`);

    return {
      metaData: {
        mimeType: mime.contentType(fileMetaData.name.split(".").pop()) || 'application/octet-stream',
        ...fileMetaData,
        size: fileMetaData.size,
      },
      file,
    };
  }

  async remove(shareId: string, fileId: string) {
    const fileMetaData = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!fileMetaData) throw new NotFoundException("File not found");

    try {
        await fs.unlink(`${SHARE_DIRECTORY}/${shareId}/${fileId}`);
    } catch (e) {
        this.logger.warn(`Could not delete file from disk: ${e.message}`);
    }

    await this.prisma.file.delete({ where: { id: fileId } });
  }

  async deleteAllFiles(shareId: string) {
    try {
        await fs.rm(`${SHARE_DIRECTORY}/${shareId}`, {
          recursive: true,
          force: true,
        });
    } catch(e) {
        this.logger.error(`Failed to delete folder: ${e.message}`);
    }
  }

  async getZip(shareId: string): Promise<Readable> {
    return new Promise((resolve, reject) => {
      const zipPath = `${SHARE_DIRECTORY}/${shareId}/archive.zip`;
      
      const zipStream = createReadStream(zipPath);

      zipStream.on("error", (err) => {
        reject(new InternalServerErrorException(err));
      });

      zipStream.on("open", () => {
        resolve(zipStream);
      });
    });
  }
}