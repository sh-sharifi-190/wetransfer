import { IsOptional, IsString, Allow } from "class-validator";

class ShareSecurityDto {
    @Allow()
    password?: string;
    @Allow()
    maxViews?: number;
}

// Renamed class to CreateShareDTO (all caps DTO)
export class CreateShareDTO {
  @IsString()
  id: string;

  @IsOptional()
  @Allow()
  name?: string;

  @IsOptional()
  @Allow()
  description?: string;

  @IsOptional()
  @Allow()
  expiration: string;

  @IsOptional()
  @Allow()
  recipients: string[];

  @IsOptional()
  @Allow()
  security: ShareSecurityDto;
}