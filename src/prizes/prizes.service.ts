import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePrizeDto } from './dto/create-prize.dto.js';
import { UpdatePrizeDto } from './dto/update-prize.dto.js';

@Injectable()
export class PrizesService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Create a new Prize
  async create(dto: CreatePrizeDto) {
    const remainingQuantity = dto.remainingQuantity ?? dto.totalQuantity;

    const prize = await this.prisma.db.orm.public.Prize.create({
      title: dto.title,
      amount: dto.amount ?? 0,
      probability: dto.probability,
      totalQuantity: dto.totalQuantity,
      remainingQuantity: remainingQuantity,
      isActive: dto.isActive ?? true,
    });

    return prize;
  }

  // 2. Find all Prizes
  async findAll() {
    return await this.prisma.db.orm.public.Prize.all();
  }

  // 3. Find one Prize by ID
  async findOne(id: number) {
    const prize = await this.prisma.db.orm.public.Prize.where({ id }).first();

    if (!prize) {
      throw new NotFoundException(`Prize with ID ${id} not found`);
    }

    return prize;
  }

  // 4. Update a Prize by ID
  async update(id: number, dto: UpdatePrizeDto) {
    await this.findOne(id); // Ensure prize exists

    const updatedPrize = await this.prisma.db.orm.public.Prize.where({ id }).update(dto);

    return updatedPrize;
  }

  // 5. Delete a Prize by ID
  async remove(id: number) {
    await this.findOne(id); // Ensure prize exists

    await this.prisma.db.orm.public.Prize.where({ id }).delete();

    return { message: `Prize with ID ${id} successfully deleted` };
  }
}
