import { IsOptional, IsNumber, IsString, IsInt, Min, IsBoolean } from 'class-validator';

export class UpdatePrizeDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  probability?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  totalQuantity?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  remainingQuantity?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
