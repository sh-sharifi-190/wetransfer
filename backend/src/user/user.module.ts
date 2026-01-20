import { Module } from "@nestjs/common";
import { UserController } from "./user.controller";
import { UserSevice } from "./user.service";
import { FileModule } from "src/file/file.module";

@Module({
  imports: [FileModule],
  providers: [UserSevice],
  controllers: [UserController],
  exports: [UserSevice],
})
export class UserModule {}