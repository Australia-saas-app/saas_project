import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateActivityDto {
  @ApiProperty({ description: 'The action performed' })
  @IsString()
  action: string;

  @ApiProperty({ description: 'The resource that was acted upon (e.g., user, profile, document)', required: false })
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiProperty({ description: 'The ID of the resource', required: false })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiProperty({ description: 'Additional details about the activity', required: false })
  @IsOptional()
  @IsObject()
  details?: Record<string, any>;

  @ApiProperty({ description: 'The IP address from which the activity originated', required: false })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({ description: 'The user agent string of the client', required: false })
  @IsOptional()
  @IsString()
  userAgent?: string;
}
