import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Config } from "@prisma/client";
import * as argon from "argon2";
import { EventEmitter } from "events";
import * as fs from "fs";
import { PrismaService } from "src/prisma/prisma.service";
import { stringToTimespan } from "src/utils/date.util";
import { parse as yamlParse } from "yaml";
import { YamlConfig } from "../../prisma/seed/config.seed";

@Injectable()
export class ConfigService extends EventEmitter {
  yamlConfig?: YamlConfig;
  logger = new Logger(ConfigService.name);

  constructor(
    @Inject("CONFIG_VARIABLES") private configVariables: Config[],
    private prisma: PrismaService,
  ) {
    super();
  }

  async initialize() {
    await this.loadYamlConfig();

    if (this.yamlConfig) {
      await this.migrateInitUser();
    }
  }

  private async loadYamlConfig() {
    let configFile: string = "";
    try {
      // Hardcoded path for Windows
      configFile = fs.readFileSync("F:/pingvin-share-1.13.0/backend/config.yaml", "utf8");
    } catch (e) {
      this.logger.log("Config.yaml is not set. Falling back to UI configuration.");
    }
    try {
      this.yamlConfig = yamlParse(configFile);
      if (this.yamlConfig) {
        for (const configVariable of this.configVariables) {
          const category = this.yamlConfig[configVariable.category];
          if (!category) continue;
          configVariable.value = category[configVariable.name];
          this.emit("update", configVariable.name, configVariable.value);
        }
      }
    } catch (e) {
      this.logger.error("Failed to parse config.yaml.", e);
    }
  }

  private async migrateInitUser(): Promise<void> {
    if (!this.yamlConfig?.initUser?.enabled) return;
    const userCount = await this.prisma.user.count({ where: { isAdmin: true } });
    if (userCount === 1) return;
    
    await this.prisma.user.create({
      data: {
        email: this.yamlConfig.initUser.email,
        username: this.yamlConfig.initUser.username,
        password: this.yamlConfig.initUser.password
          ? await argon.hash(this.yamlConfig.initUser.password)
          : null,
        isAdmin: this.yamlConfig.initUser.isAdmin,
      },
    });
  }

  // --- GOD MODE HELPER ---
  private getOverriddenValue(key: string, originalValue: string): string {
    if (key === 'share.allowRegistration') return 'true';
    if (key === 'share.allowUnauthenticatedShares') return 'true';
    if (key === 'share.maxExpiration') return '525600000'; 
    if (key === 'share.maxSize') return '100000000000'; // 100 GB
    if (key === 'general.appName') return 'WeTransfer';
    
    return originalValue;
  }

  get(key: `${string}.${string}`): any {
    const configVariable = this.configVariables.filter(
      (variable) => `${variable.category}.${variable.name}` == key,
    )[0];

    if (!configVariable) {
       if(key === 'share.allowRegistration') return true;
       return undefined; 
    }

    const rawValue = configVariable.value ?? configVariable.defaultValue;
    const value = this.getOverriddenValue(key, rawValue);

    if (configVariable.type == "number" || configVariable.type == "filesize")
      return parseInt(value);
    if (configVariable.type == "boolean") return value == "true";
    if (configVariable.type == "string" || configVariable.type == "text")
      return value;
    if (configVariable.type == "timespan") return stringToTimespan(value);
  }

  async getByCategory(category: string) {
    const configVariables = this.configVariables
      .filter((c) => !c.locked && category == c.category)
      .sort((c) => c.order);

    return configVariables.map((variable) => {
      const key = `${variable.category}.${variable.name}`;
      const rawValue = variable.value ?? variable.defaultValue;
      const value = this.getOverriddenValue(key, rawValue);

      return {
        ...variable,
        key: key,
        value: value,
        allowEdit: this.isEditAllowed(),
      };
    });
  }

  async list() {
    const configVariables = this.configVariables.filter((c) => !c.secret);
    return configVariables.map((variable) => {
      const key = `${variable.category}.${variable.name}`;
      const rawValue = variable.value ?? variable.defaultValue;
      const value = this.getOverriddenValue(key, rawValue);

      return {
        ...variable,
        key: key,
        value: value,
      };
    });
  }

  async updateMany(data: { key: string; value: string | number | boolean }[]) {
    if (!this.isEditAllowed()) throw new BadRequestException("Not allowed.");
    const response: Config[] = [];
    for (const variable of data) {
      response.push(await this.update(variable.key, variable.value));
    }
    return response;
  }

  async update(key: string, value: string | number | boolean) {
    if (!this.isEditAllowed()) throw new BadRequestException("Not allowed.");

    const configVariable = await this.prisma.config.findUnique({
      where: {
        name_category: {
          category: key.split(".")[0],
          name: key.split(".")[1],
        },
      },
    });

    if (!configVariable || configVariable.locked)
      throw new NotFoundException("Config variable not found");

    if (value === "") {
      value = null;
    } else if (
      typeof value != configVariable.type &&
      typeof value == "string" &&
      configVariable.type != "text" &&
      configVariable.type != "timespan"
    ) {
      throw new BadRequestException(
        `Config variable must be of type ${configVariable.type}`,
      );
    }

    this.validateConfigVariable(key, value);

    const updatedVariable = await this.prisma.config.update({
      where: {
        name_category: {
          category: key.split(".")[0],
          name: key.split(".")[1],
        },
      },
      data: { value: value === null ? null : value.toString() },
    });

    this.configVariables = await this.prisma.config.findMany();
    this.emit("update", key, value);
    return updatedVariable;
  }

  validateConfigVariable(key: string, value: string | number | boolean) {
    const validations = [
      {
        key: "share.shareIdLength",
        condition: (value: number) => value >= 2 && value <= 50,
        message: "Share ID length must be between 2 and 50",
      },
      {
        key: "share.zipCompressionLevel",
        condition: (value: number) => value >= 0 && value <= 9,
        message: "Zip compression level must be between 0 and 9",
      },
    ];

    const validation = validations.find((validation) => validation.key == key);
    if (validation && !validation.condition(value as any)) {
      throw new BadRequestException(validation.message);
    }
  }

  // --- FIXED: ALWAYS ALLOW EDIT ---
  isEditAllowed(): boolean {
    return true; // Always allow UI editing
  }
}