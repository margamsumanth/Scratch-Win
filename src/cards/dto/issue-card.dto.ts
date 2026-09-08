import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class IssueCardDto {
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @IsString()
  @IsOptional()
  expiresAt?: string;
}
