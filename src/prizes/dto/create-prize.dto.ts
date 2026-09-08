import { IsNotEmpty, IsNumber, IsString, IsInt, Min, IsBoolean, IsOptional } from 'class-validator';

export class CreatePrizeDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsNumber()
  @Min(0)
  probability: number;

  @IsInt()
  @Min(0)
  totalQuantity: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  remainingQuantity?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
