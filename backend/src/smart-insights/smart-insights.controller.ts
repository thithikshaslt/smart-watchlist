import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WatchlistVisitsService } from './watchlist-visits.service';

@Controller('watchlists')
export class SmartInsightsController {
  constructor(private readonly watchlistVisits: WatchlistVisitsService) {}

  @Post(':id/visits')
  @HttpCode(HttpStatus.OK)
  recordVisit(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.watchlistVisits.recordVisit(user.id, id);
  }
}
