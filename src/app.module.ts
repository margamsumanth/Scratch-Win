import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { PrizesModule } from './prizes/prizes.module.js';
import { CardsModule } from './cards/cards.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';

@Module({
  imports: [PrismaModule, AuthModule, PrizesModule, CardsModule, AnalyticsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
