import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { User } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import * as argon from "argon2";
import { Request, Response } from "express";
import * as moment from "moment";
import { ConfigService } from "src/config/config.service";
import { PrismaService } from "src/prisma/prisma.service";
import { UserSevice } from "../user/user.service";
import { AuthRegisterDTO } from "./dto/authRegister.dto";
import { AuthSignInDTO } from "./dto/authSignIn.dto";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private userService: UserSevice,
  ) {}
  private readonly logger = new Logger(AuthService.name);

  async signUp(dto: AuthRegisterDTO, ip: string, isAdmin?: boolean) {
    const isFirstUser = (await this.prisma.user.count()) == 0;

    const hash = dto.password ? await argon.hash(dto.password) : null;
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          username: dto.username,
          password: hash,
          isAdmin: isAdmin ?? isFirstUser,
        },
      });

      const { refreshToken, refreshTokenId } = await this.createRefreshToken(
        user.id,
      );
      const accessToken = await this.createAccessToken(user, refreshTokenId);

      this.logger.log(`User ${user.email} signed up from IP ${ip}`);
      return { accessToken, refreshToken, user };
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code == "P2002") {
          const duplicatedField: string = e.meta.target[0];
          throw new BadRequestException(
            `A user with this ${duplicatedField} already exists`,
          );
        }
      }
    }
  }

  async signIn(dto: AuthSignInDTO, ip: string) {
    if (!dto.email && !dto.username) {
      throw new BadRequestException("Email or username is required");
    }

    // Standard Password Login
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });

    if (user?.password && (await argon.verify(user.password, dto.password))) {
      this.logger.log(
        `Successful password login for user ${user.email} from IP ${ip}`,
      );
      return this.generateToken(user);
    }

    this.logger.log(
      `Failed login attempt for user ${dto.email || dto.username} from IP ${ip}`,
    );
    throw new UnauthorizedException("Wrong email or password");
  }

  async generateToken(user: User) {
    // Check if the user has TOTP enabled
    if (user.totpVerified) {
      const loginToken = await this.createLoginToken(user.id);
      return { loginToken };
    }

    const { refreshToken, refreshTokenId } = await this.createRefreshToken(user.id);
    const accessToken = await this.createAccessToken(user, refreshTokenId);

    return { accessToken, refreshToken };
  }

  // --- Disabled / Empty Functions (Since Email is deleted) ---
  async requestResetPassword(email: string) { return; }
  async resetPassword(token: string, newPassword: string) { return; }
  // -----------------------------------------------------------

  async updatePassword(user: User, newPassword: string, oldPassword?: string) {
    const isPasswordValid =
      !user.password || (await argon.verify(user.password, oldPassword));

    if (!isPasswordValid) throw new ForbiddenException("Invalid password");

    const hash = await argon.hash(newPassword);

    await this.prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hash },
    });

    return this.createRefreshToken(user.id);
  }

  async createAccessToken(user: User, refreshTokenId: string) {
    return this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
        refreshTokenId,
      },
      {
        expiresIn: "15min",
        secret: this.config.get("internal.jwtSecret"),
      },
    );
  }

  async signOut(accessToken: string) {
    const { refreshTokenId } =
      (this.jwtService.decode(accessToken) as {
        refreshTokenId: string;
      }) || {};

    if (refreshTokenId) {
      await this.prisma.refreshToken
        .delete({ where: { id: refreshTokenId } })
        .catch((e) => {
          if (e.code != "P2025") throw e;
        });
    }
  }

  async refreshAccessToken(refreshToken: string) {
    const refreshTokenMetaData = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!refreshTokenMetaData || refreshTokenMetaData.expiresAt < new Date())
      throw new UnauthorizedException();

    return this.createAccessToken(
      refreshTokenMetaData.user,
      refreshTokenMetaData.id,
    );
  }

  async createRefreshToken(userId: string, idToken?: string) {
    const sessionDuration = this.config.get("general.sessionDuration");
    const { id, token } = await this.prisma.refreshToken.create({
      data: {
        userId,
        expiresAt: moment()
          .add(sessionDuration.value, sessionDuration.unit)
          .toDate(),
      },
    });

    return { refreshTokenId: id, refreshToken: token };
  }

  async createLoginToken(userId: string) {
    const loginToken = (
      await this.prisma.loginToken.create({
        data: { userId, expiresAt: moment().add(5, "minutes").toDate() },
      })
    ).token;

    return loginToken;
  }

  addTokensToResponse(
    response: Response,
    refreshToken?: string,
    accessToken?: string,
  ) {
    const isSecure = this.config.get("general.secureCookies");
    if (accessToken)
      response.cookie("access_token", accessToken, {
        sameSite: "lax",
        secure: isSecure,
        maxAge: 1000 * 60 * 60 * 24 * 30 * 3, // 3 months
      });
    if (refreshToken) {
      const now = moment();
      const sessionDuration = this.config.get("general.sessionDuration");
      const maxAge = moment(now)
        .add(sessionDuration.value, sessionDuration.unit)
        .diff(now);
      response.cookie("refresh_token", refreshToken, {
        path: "/api/auth/token",
        httpOnly: true,
        sameSite: "strict",
        secure: isSecure,
        maxAge,
      });
    }
  }

  async getIdOfCurrentUser(request: Request): Promise<string | null> {
    if (!request.cookies.access_token) return null;
    try {
      const payload = await this.jwtService.verifyAsync(
        request.cookies.access_token,
        {
          secret: this.config.get("internal.jwtSecret"),
        },
      );
      return payload.sub;
    } catch {
      return null;
    }
  }

  async verifyPassword(user: User, password: string) {
    return argon.verify(user.password, password);
  }
}