import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { GetUser } from '../auth/get-user.decorator.js';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // GET /analytics/leaderboard -> Authenticated Users
  @Get('leaderboard')
  @UseGuards(JwtAuthGuard)
  getLeaderboard() {
    return this.analyticsService.getLeaderboard();
  }

  // GET /analytics/my-history -> Logged in User
  @Get('my-history')
  @UseGuards(JwtAuthGuard)
  getMyHistory(@GetUser('userId') userId: number) {
    return this.analyticsService.getMyHistory(userId);
  }

  // GET /analytics/admin-stats -> ADMIN only
  @Get('admin-stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getAdminStats() {
    return this.analyticsService.getAdminStats();
  }

  // GET /analytics/admin/payouts -> ADMIN only (Paginated & Searchable)
  @Get('admin/payouts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getAdminPayouts(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.analyticsService.getAdminPayouts(search, pageNum, limitNum);
  }
}
