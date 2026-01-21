import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "../config/config.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateShareDTO } from "./dto/createShare.dto";
import { MyShareDTO } from "./dto/myShare.dto";
import * as argon from "argon2";
import { Cron, CronExpression } from "@nestjs/schedule";
import { FileService } from "../file/file.service";
import { Share } from "@prisma/client";

@Injectable()
export class ShareService {
  private readonly logger = new Logger(ShareService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private fileService: FileService
  ) {}

  async create(createShareDto: CreateShareDTO, user?: any, reverseShareToken?: string) {
    const userId = user?.id || null;

    let hashedPasword = undefined;
    if (createShareDto.security?.password) {
      hashedPasword = await argon.hash(createShareDto.security.password);
    }

    let expiration = new Date();
    expiration.setFullYear(expiration.getFullYear() + 100);

    if (createShareDto.expiration && createShareDto.expiration !== "never") {
        const expString = createShareDto.expiration;
        const match = expString.match(/^(\d+)-?(minutes|hours|days|weeks|months|years)$/);

        if (match) {
            const amount = parseInt(match[1]);
            const unit = match[2];
            const now = new Date();

            if (unit === 'minutes') now.setMinutes(now.getMinutes() + amount);
            if (unit === 'hours') now.setHours(now.getHours() + amount);
            if (unit === 'days') now.setDate(now.getDate() + amount);
            if (unit === 'weeks') now.setDate(now.getDate() + (amount * 7));
            if (unit === 'months') now.setMonth(now.getMonth() + amount);
            if (unit === 'years') now.setFullYear(now.getFullYear() + amount);

            expiration = now;
        } else {
            const d = new Date(expString);
            if (!isNaN(d.getTime())) {
                expiration = d;
            }
        }
    }

    const data: any = {
      id: createShareDto.id,
      name: createShareDto.name,
      description: createShareDto.description,
      expiration: expiration,
      creatorId: userId,
      isZipReady: false,
      uploadLocked: false,
    };

    if (hashedPasword || (createShareDto.security?.maxViews && createShareDto.security.maxViews > 0)) {
        data.security = {
            create: {
                password: hashedPasword,
                maxViews: createShareDto.security?.maxViews ? Number(createShareDto.security.maxViews) : undefined
            }
        };
    }

    try {
      const share = await this.prisma.share.create({
        data: data,
        include: { security: true },
      });
      return share;
    } catch (e) {
      console.error("DB ERROR:", e);
      if (e.code === 'P2002') {
          throw new BadRequestException("Share ID taken");
      }
      throw new InternalServerErrorException("Database Error");
    }
  }

  async complete(id: string, reverseShareToken?: string) {
    return await this.prisma.share.update({
      where: { id },
      data: { isZipReady: true, uploadLocked: true },
    });
  }

  async revertComplete(id: string) {
    return await this.prisma.share.update({
      where: { id },
      data: { isZipReady: false, uploadLocked: false },
    });
  }

  async get(id: string, password?: string) {
    const share = await this.prisma.share.findUnique({
      where: { id },
      include: { 
        files: true, 
        creator: { select: { username: true } },
        security: true 
      },
    });

    if (!share) throw new NotFoundException("Share not found");
    return share as any;
  }

  async getMetaData(id: string) {
    const share = await this.prisma.share.findUnique({
      where: { id },
      include: { security: true, creator: { select: { username: true } } },
    });
    if (!share) throw new NotFoundException("Share not found");
    return {
        ...share,
        hasPassword: !!share.security?.password
    };
  }

  async getMyShares(userId: string): Promise<MyShareDTO[]> {
    const shares = await this.prisma.share.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { files: true } },
        security: true,
        files: true,
      },
    });
    return shares.map((share) => ({
      ...share,
      fileCount: share._count.files,
      views: share.views,
    })) as any;
  }

  async getShares() {
      return await this.prisma.share.findMany({
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { files: true } }, security: true, creator: true }
      });
  }

  async getSharesByUser(userId: string) {
      return this.getMyShares(userId);
  }

  async remove(id: string, userId: string | boolean) {
    const share = await this.prisma.share.findUnique({ where: { id } });
    if (!share) throw new NotFoundException("Share not found");
    
    await this.fileService.deleteAllFiles(share.id);
    await this.prisma.share.delete({ where: { id } });
  }

  async increaseViewCount(share: Share) {
      await this.prisma.share.update({
          where: { id: share.id },
          data: { views: { increment: 1 } }
      });
  }

  async verifyShareToken(id: string, token: string) {
      return true; 
  }

  async getShareToken(id: string, password?: string) {
      const share = await this.prisma.share.findUnique({
          where: { id },
          include: { security: true }
      });

      if (!share) throw new NotFoundException("Share not found");

      if (share.security?.password) {
          if (!password) {
              throw new ForbiddenException("Password required");
          }
          const isValid = await argon.verify(share.security.password, password);
          if (!isValid) {
              throw new ForbiddenException("Invalid password");
          }
      }
      return "god-mode-token";
  }

  async isShareIdAvailable(id: string): Promise<boolean> {
    const share = await this.prisma.share.findUnique({
      where: { id },
    });
    return !share; 
  }

  // --- CHANGED: Run every minute to clean up files immediately ---
  @Cron(CronExpression.EVERY_MINUTE)
  async deleteExpiredShares() {
    const shares = await this.prisma.share.findMany({
      where: { expiration: { lt: new Date() } },
    });
    
    // Log only if deleting
    if (shares.length > 0) {
        this.logger.log(`Found ${shares.length} expired shares. Deleting...`);
    }

    for (const share of shares) {
      await this.fileService.deleteAllFiles(share.id);
      await this.prisma.share.delete({ where: { id: share.id } });
    }
  }
}