import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Watchlist } from '@prisma/client';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AddWatchlistItemDto } from './dto/add-watchlist-item.dto';
import { CreateWatchlistDto } from './dto/create-watchlist.dto';
import { ReorderWatchlistItemsDto } from './dto/reorder-watchlist-items.dto';
import { SetWatchlistViewDto } from './dto/set-watchlist-view.dto';
import { UpdateWatchlistDto } from './dto/update-watchlist.dto';
import { WatchlistsService } from './watchlists.service';

@Controller('watchlists')
export class WatchlistsController {
  constructor(private readonly watchlistsService: WatchlistsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWatchlistDto,
  ): Promise<Watchlist> {
    return this.watchlistsService.create(user.id, dto.name);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.watchlistsService.listForUser(user.id);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.watchlistsService.getOwned(user.id, id);
  }

  @Patch(':id')
  rename(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateWatchlistDto,
  ): Promise<Watchlist> {
    return this.watchlistsService.rename(user.id, id, dto.name);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.watchlistsService.remove(user.id, id);
  }

  @Post(':id/items')
  addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddWatchlistItemDto,
  ) {
    return this.watchlistsService.addItem(user.id, id, dto.instrumentId);
  }

  @Delete(':id/items/:instrumentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('instrumentId') instrumentId: string,
  ): Promise<void> {
    await this.watchlistsService.removeItem(user.id, id, instrumentId);
  }

  @Patch(':id/items/reorder')
  reorder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReorderWatchlistItemsDto,
  ) {
    return this.watchlistsService.reorder(user.id, id, dto.instrumentIds);
  }

  @Patch(':id/view')
  setView(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SetWatchlistViewDto,
  ) {
    return this.watchlistsService.setViewLens(user.id, id, dto.metrics);
  }
}
