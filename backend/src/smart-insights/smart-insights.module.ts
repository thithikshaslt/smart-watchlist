import { Module } from '@nestjs/common';
import { WatchlistsModule } from '../watchlists/watchlists.module';
import { SmartInsightsController } from './smart-insights.controller';
import { WatchlistVisitsService } from './watchlist-visits.service';

@Module({
  imports: [WatchlistsModule],
  controllers: [SmartInsightsController],
  providers: [WatchlistVisitsService],
})
export class SmartInsightsModule {}
