import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
    @IsEmail({},  { message: ' Please provide a valid email address'})
    @IsNotEmpty()
    email: string;

    @IsString()
    @MinLength(6, { message: ' Passowrd must be at least 6 Characters long ' })
    password: string;

    @IsString()
    @IsOptional()
    name?: string;
}