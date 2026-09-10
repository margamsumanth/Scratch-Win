import { Controller, Post, Get, Patch, Body, UseGuards, Query } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { Roles } from './roles.decorator.js';
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

    // GET /auth/admin/users (ADMIN Only - Search & Paginated)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get('admin/users')
    async getAllUsersAdmin(
      @Query('search') search?: string,
      @Query('page') page?: string,
      @Query('limit') limit?: string,
    ) {
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 10;
      return this.authService.getAllUsersAdmin(search, pageNum, limitNum);
    }

    // PATCH /auth/update-profile
    @UseGuards(JwtAuthGuard)
    @Patch('update-profile')
    async updateProfile(
      @GetUser('userId') userId: number,
      @Body('name') name?: string,
      @Body('email') email?: string,
    ) {
      return this.authService.updateProfile(userId, name, email);
    }

    // PATCH /auth/change-password
    @UseGuards(JwtAuthGuard)
    @Patch('change-password')
    async changePassword(
      @GetUser('userId') userId: number,
      @Body('currentPassword') currentPassword?: string,
      @Body('newPassword') newPassword?: string,
    ) {
      return this.authService.changePassword(userId, currentPassword, newPassword);
    }

}