import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CardsService } from './cards.service.js';
import { IssueCardDto } from './dto/issue-card.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { GetUser } from '../auth/get-user.decorator.js';

@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  // 1. Issue Scratch Card -> ADMIN / Cashier only
  @Post('issue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  issueCard(@Body() dto: IssueCardDto) {
    return this.cardsService.issueCard(dto);
  }

  // 2. View My Scratch Cards -> Authenticated Users
  @Get('my-cards')
  @UseGuards(JwtAuthGuard)
  getMyCards(@GetUser('userId') userId: number) {
    return this.cardsService.getMyCards(userId);
  }

  // 3. Scratch a Card -> Authenticated Users
  @Post(':code/scratch')
  @UseGuards(JwtAuthGuard)
  scratchCard(
    @Param('code') code: string,
    @GetUser('userId') userId: number,
  ) {
    return this.cardsService.scratchCard(code, userId);
  }

  // 4. Redeem Winning Prize at Counter -> ADMIN / Cashier only
  @Post('redeem/:resultId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  redeemPrize(@Param('resultId', ParseIntPipe) resultId: number) {
    return this.cardsService.redeemPrize(resultId);
  }
}
