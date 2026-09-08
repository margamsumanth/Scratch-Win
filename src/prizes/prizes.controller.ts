import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { PrizesService } from './prizes.service.js';
import { CreatePrizeDto } from './dto/create-prize.dto.js';
import { UpdatePrizeDto } from './dto/update-prize.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller('prizes')
export class PrizesController {
  constructor(private readonly prizesService: PrizesService) {}

  // 1. Create a new Prize (ADMIN only)
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() createPrizeDto: CreatePrizeDto) {
    return this.prizesService.create(createPrizeDto);
  }

  // 2. Get all Prizes (Authenticated Users)
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.prizesService.findAll();
  }

  // 3. Get single Prize by ID (Authenticated Users)
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.prizesService.findOne(id);
  }

  // 4. Update Prize by ID (ADMIN only)
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePrizeDto: UpdatePrizeDto,
  ) {
    return this.prizesService.update(id, updatePrizeDto);
  }

  // 5. Delete Prize by ID (ADMIN only)
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.prizesService.remove(id);
  }
}
