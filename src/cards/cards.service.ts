import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { IssueCardDto } from './dto/issue-card.dto.js';
import * as crypto from 'crypto';

@Injectable()
export class CardsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Issue a new Scratch Card to a User (ADMIN / Cashier)
  async issueCard(dto: IssueCardDto) {
    // Verify user exists
    const user = await this.prisma.db.orm.public.User.where({ id: dto.userId }).first();
    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    // Generate unique card code (e.g. CARD-9A2F-8K3L)
    const randomBytes = crypto.randomBytes(4).toString('hex').toUpperCase();
    const cardCode = `CARD-${randomBytes.slice(0, 4)}-${randomBytes.slice(4)}`;

    const card = await this.prisma.db.orm.public.ScratchCard.create({
      code: cardCode,
      userId: dto.userId,
      status: 'UNSCRATCHED',
      expiresAt: dto.expiresAt ? dto.expiresAt : null,
    });

    // Generate QR Code URL for Mall Receipt Printing (Uses Mac Wi-Fi IP for phone scanning)
    const hostIp = process.env.HOST_IP || '192.168.0.166';
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=http://${hostIp}:4000/?code=${cardCode}`;

    return {
      message: 'Scratch card issued successfully for Mall Receipt',
      card,
      qrCodeUrl, // <-- Printable QR Code URL for Receipt!
    };
  }

  // 2. Fetch all cards owned by the logged-in User
  async getMyCards(userId: number) {
    return await this.prisma.db.orm.public.ScratchCard.where({ userId }).all();
  }

  // 3. CORE GAME ENGINE: Scratch a Card & Calculate Prize
  async scratchCard(code: string, userId: number) {
    // Find card by code
    const card = await this.prisma.db.orm.public.ScratchCard.where({ code }).first();

    if (!card) {
      throw new NotFoundException(`Scratch card with code '${code}' not found`);
    }

    // Security Check: Verify card belongs to logged-in user
    if (card.userId !== userId) {
      throw new ForbiddenException('You are not authorized to scratch this card');
    }

    // Double-Scratch Protection: Check if already scratched
    if (card.status !== 'UNSCRATCHED') {
      throw new BadRequestException('This scratch card has already been scratched or expired');
    }

    // Fetch active prizes with remaining stock > 0
    const prizes = await this.prisma.db.orm.public.Prize.where({ isActive: true }).all();
    const availablePrizes = prizes.filter((p) => p.remainingQuantity > 0);

    // Calculate Weighted Random Prize
    // -------------------------------------------------------------
    const winWeightSum = availablePrizes.reduce((sum, p) => sum + p.probability, 0);
    const noWinWeight = Math.max(0, 100 - winWeightSum);
    const totalWeightPool = winWeightSum + noWinWeight;

    const randomPick = Math.random() * totalWeightPool;

    let cumulativeWeight = 0;
    let wonPrize: typeof prizes[0] | null = null;

    for (const prize of availablePrizes) {
      cumulativeWeight += prize.probability;
      if (randomPick <= cumulativeWeight) {
        wonPrize = prize;
        break;
      }
    }
    // -------------------------------------------------------------

    // If prize won, decrement remainingQuantity by 1
    if (wonPrize) {
      await this.prisma.db.orm.public.Prize.where({ id: wonPrize.id }).update({
        remainingQuantity: Math.max(0, wonPrize.remainingQuantity - 1),
      });
    }

    // Create immutable ScratchResult ledger record with isRedeemed status
    const result = await this.prisma.db.orm.public.ScratchResult.create({
      scratchCardId: card.id,
      userId: userId,
      prizeId: wonPrize ? wonPrize.id : null,
      prizeAmount: wonPrize ? wonPrize.amount : 0,
      isRedeemed: false,
    });

    // Update ScratchCard status to SCRATCHED
    await this.prisma.db.orm.public.ScratchCard.where({ id: card.id }).update({
      status: 'SCRATCHED',
    });

    return {
      message: wonPrize ? `🎉 Congratulations! You won ${wonPrize.title}!` : '😢 Better luck next time!',
      isWinner: !!wonPrize,
      prize: wonPrize
        ? {
            id: wonPrize.id,
            title: wonPrize.title,
            amount: wonPrize.amount,
          }
        : null,
      result,
    };
  }

  // 4. Redeem Prize at Billing Counter (ADMIN / Cashier only)
  async redeemPrize(resultId: number) {
    const result = await this.prisma.db.orm.public.ScratchResult.where({ id: resultId }).first();

    if (!result) {
      throw new NotFoundException(`Result record with ID ${resultId} not found`);
    }

    if (result.isRedeemed) {
      throw new BadRequestException('This winning prize has ALREADY been redeemed at the counter!');
    }

    const updatedResult = await this.prisma.db.orm.public.ScratchResult.where({ id: resultId }).update({
      isRedeemed: true,
      redeemedAt: new Date().toISOString(),
    });

    return {
      message: '🎉 Prize successfully marked as REDEEMED at billing counter!',
      result: updatedResult,
    };
  }
}
