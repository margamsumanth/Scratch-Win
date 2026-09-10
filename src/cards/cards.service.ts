import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { IssueCardDto } from './dto/issue-card.dto.js';
import * as crypto from 'crypto';
import * as os from 'os';

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
      purchaseAmount: dto.billAmount ? Number(dto.billAmount) : 0,
      expiresAt: dto.expiresAt ? dto.expiresAt : null,
    });

    // Generate QR Code URL for Mall Receipt Printing (Uses dynamic Mac Wi-Fi IP for phone scanning)
    const getLocalIp = () => {
      const interfaces = os.networkInterfaces();
      for (const devName in interfaces) {
        const iface = interfaces[devName];
        if (!iface) continue;
        for (const alias of iface) {
          if (alias.family === 'IPv4' && !alias.internal) {
            return alias.address;
          }
        }
      }
      return 'localhost';
    };
    const hostIp = process.env.HOST_IP || getLocalIp();
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

    // Calculate Purchase Tier Multiplier
    const purchaseAmt = card.purchaseAmount || 0;
    let tierMultiplier = 1.0;
    if (purchaseAmt >= 10000) {
      tierMultiplier = 3.0; // VIP Platinum (3.0x Win Boost)
    } else if (purchaseAmt >= 5000) {
      tierMultiplier = 2.0; // Gold (2.0x Win Boost)
    } else if (purchaseAmt >= 2000) {
      tierMultiplier = 1.5; // Silver (1.5x Win Boost)
    }

    // Scale available prize weights by tierMultiplier
    const winWeightSum = availablePrizes.reduce((sum, p) => sum + (p.probability * tierMultiplier), 0);
    const noWinWeight = Math.max(0, 100 - winWeightSum);
    const totalWeightPool = winWeightSum + noWinWeight;

    const randomPick = Math.random() * totalWeightPool;

    let cumulativeWeight = 0;
    let wonPrize: typeof prizes[0] | null = null;

    for (const prize of availablePrizes) {
      cumulativeWeight += (prize.probability * tierMultiplier);
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

  // 5. Get Public Card Info (For Guest QR Scan preview)
  async getPublicCardInfo(code: string) {
    const card = await this.prisma.db.orm.public.ScratchCard.where({ code }).first();
    if (!card) {
      throw new NotFoundException(`Scratch card with code '${code}' not found`);
    }
    const result = await this.prisma.db.orm.public.ScratchResult.where({ scratchCardId: card.id }).first();
    let prize = null;
    if (result && result.prizeId) {
      prize = await this.prisma.db.orm.public.Prize.where({ id: result.prizeId }).first();
    }
    return {
      id: card.id,
      code: card.code,
      status: card.status,
      isScratched: card.status === 'SCRATCHED',
      result: result ? {
        id: result.id,
        prizeAmount: result.prizeAmount,
        isRedeemed: result.isRedeemed,
        prizeTitle: prize ? prize.title : (result.prizeAmount > 0 ? 'Cash Prize' : null),
      } : null,
    };
  }

  // 6. Public Instant Scratch (Guest friendly scratch on QR Scan)
  async publicScratchCard(code: string) {
    const card = await this.prisma.db.orm.public.ScratchCard.where({ code }).first();
    if (!card) {
      throw new NotFoundException(`Scratch card with code '${code}' not found`);
    }
    if (card.status !== 'UNSCRATCHED') {
      const existingResult = await this.prisma.db.orm.public.ScratchResult.where({ scratchCardId: card.id }).first();
      let prize = null;
      if (existingResult && existingResult.prizeId) {
        prize = await this.prisma.db.orm.public.Prize.where({ id: existingResult.prizeId }).first();
      }
      return {
        message: existingResult && existingResult.prizeAmount > 0 ? 'Already scratched! Winner!' : 'Already scratched!',
        isWinner: existingResult ? existingResult.prizeAmount > 0 : false,
        prize: prize ? { id: prize.id, title: prize.title, amount: prize.amount } : null,
        result: existingResult,
      };
    }
    return this.scratchCard(code, card.userId);
  }

  // 7. Get All Cards Inventory with User & Prize details (ADMIN Only - Paginated)
  async getAllCardsAdmin(
    search?: string,
    status?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const cards = await this.prisma.db.orm.public.ScratchCard.all();
    const users = await this.prisma.db.orm.public.User.all();
    const results = await this.prisma.db.orm.public.ScratchResult.all();
    const prizes = await this.prisma.db.orm.public.Prize.all();

    const userMap = new Map(users.map((u) => [u.id, u]));
    const resultMap = new Map(results.map((r) => [r.scratchCardId, r]));
    const prizeMap = new Map(prizes.map((p) => [p.id, p]));

    let filtered = cards.map((card) => {
      const user = userMap.get(card.userId);
      const result = resultMap.get(card.id);
      const prize = result && result.prizeId ? prizeMap.get(result.prizeId) : null;

      return {
        id: card.id,
        code: card.code,
        status: card.status,
        purchaseAmount: card.purchaseAmount || 0,
        createdAt: card.createdAt,
        userId: card.userId,
        user: user
          ? { id: user.id, name: user.name, email: user.email, role: user.role }
          : { id: card.userId, name: 'Unknown User', email: 'N/A' },
        result: result
          ? {
              id: result.id,
              prizeAmount: result.prizeAmount,
              isRedeemed: result.isRedeemed,
              redeemedAt: result.redeemedAt,
              scratchedAt: result.scratchedAt,
              prize: prize ? { id: prize.id, title: prize.title, amount: prize.amount } : null,
            }
          : null,
      };
    });

    if (status && status !== 'ALL') {
      filtered = filtered.filter((c) => c.status === status);
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          (c.user.name && c.user.name.toLowerCase().includes(q)) ||
          c.user.email.toLowerCase().includes(q) ||
          c.user.id.toString() === q
      );
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (currentPage - 1) * limit;
    const paginatedCards = filtered.slice(startIndex, startIndex + limit);

    return {
      data: paginatedCards,
      pagination: {
        total,
        page: currentPage,
        limit,
        totalPages,
      },
    };
  }
}
