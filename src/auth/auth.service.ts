import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // 1. Register User
  async register(dto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.prisma.db.orm.public.User.where({
      email: dto.email,
    }).first();

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Hash password with bcrypt (salt rounds = 10)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    // Create user in PostgreSQL
    const user = await this.prisma.db.orm.public.User.create({
      email: dto.email,
      password: hashedPassword,
      name: dto.name || null,
      role: 'USER',
    });

    // Generate JWT Token
    const token = this.generateJwtToken(user.id, user.email, user.role);

    return {
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken: token,
    };
  }

  // 2. Login User
  async login(dto: LoginDto) {
    // Find user by email
    const user = await this.prisma.db.orm.public.User.where({
      email: dto.email,
    }).first();

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Compare provided password with stored hash
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate JWT Token
    const token = this.generateJwtToken(user.id, user.email, user.role);

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken: token,
    };
  }

  // Helper: Generate JWT Token
  private generateJwtToken(userId: number, email: string, role: string): string {
    const payload = { sub: userId, email, role };
    return this.jwtService.sign(payload);
  }

  // 3. Get All Users with Search & Pagination (ADMIN Only)
  async getAllUsersAdmin(search?: string, page: number = 1, limit: number = 10) {
    const allUsers = await this.prisma.db.orm.public.User.all();
    const allCards = await this.prisma.db.orm.public.ScratchCard.all();
    const allResults = await this.prisma.db.orm.public.ScratchResult.all();

    let filtered = allUsers;
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.name && u.name.toLowerCase().includes(q)) ||
          u.role.toLowerCase().includes(q) ||
          u.id.toString() === q
      );
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (currentPage - 1) * limit;
    const paginatedUsers = filtered.slice(startIndex, startIndex + limit);

    // Compute user stats
    const data = paginatedUsers.map((u) => {
      const userCards = allCards.filter((c) => c.userId === u.id);
      const userResults = allResults.filter((r) => r.userId === u.id);
      const totalWon = userResults.reduce((sum, r) => sum + (r.prizeAmount || 0), 0);

      return {
        id: u.id,
        name: u.name || 'Anonymous User',
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        totalCards: userCards.length,
        totalWins: userResults.filter((r) => r.prizeAmount > 0).length,
        totalWonAmount: totalWon,
      };
    });

    return {
      data,
      pagination: {
        total,
        page: currentPage,
        limit,
        totalPages,
      },
    };
  }

  // 4. Update Profile Info (Name / Email)
  async updateProfile(userId: number, name?: string, email?: string) {
    const user = await this.prisma.db.orm.public.User.where({ id: userId }).first();
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (email && email !== user.email) {
      const existing = await this.prisma.db.orm.public.User.where({ email }).first();
      if (existing) {
        throw new BadRequestException('Email is already taken by another account');
      }
    }

    await this.prisma.db.orm.public.User.where({ id: userId }).update({
      name: name !== undefined ? name : user.name,
      email: email !== undefined ? email : user.email,
    });

    const updatedUser = await this.prisma.db.orm.public.User.where({ id: userId }).first();
    if (!updatedUser) {
      throw new BadRequestException('Failed to retrieve updated user profile');
    }

    const token = this.generateJwtToken(updatedUser.id, updatedUser.email, updatedUser.role);

    return {
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
      accessToken: token,
    };
  }

  // 5. Change Password
  async changePassword(userId: number, currentPassword?: string, newPassword?: string) {
    if (!currentPassword || !newPassword) {
      throw new BadRequestException('Current password and new password are required');
    }

    if (newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters long');
    }

    const user = await this.prisma.db.orm.public.User.where({ id: userId }).first();
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await this.prisma.db.orm.public.User.where({ id: userId }).update({
      password: hashedPassword,
    });

    return {
      message: 'Password changed successfully',
    };
  }
}
