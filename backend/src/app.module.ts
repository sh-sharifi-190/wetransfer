import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "./auth/auth.module";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AppCacheModule } from "./cache/cache.module";
import { AppController } from "./app.controller";
import { ConfigModule } from "./config/config.module";
import { FileModule } from "./file/file.module";
import { JobsModule } from "./jobs/jobs.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ReverseShareModule } from "./reverseShare/reverseShare.module";
import { ShareModule } from "./share/share.module";
import { UserModule } from "./user/user.module";

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    ShareModule,
    FileModule,
    PrismaModule,
    JobsModule,
    UserModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    ReverseShareModule,
    AppCacheModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}