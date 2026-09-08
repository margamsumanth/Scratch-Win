import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { GetUser } from './get-user.decorator.js';

@Controller('auth')
export class AuthController {
    constructor (private readonly authService: AuthService) {}

    // post /auth/register

    @Post('register')
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
        
    }

    //POST /auth/login
    @Post('login')
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    //GET /auth/me ( Protected Route )
    
    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getProfile(@GetUser() user: any ) {
        return {
            user,
        };
    }

}