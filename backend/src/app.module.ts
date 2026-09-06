import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { InstrumentsModule } from './instruments/instruments.module';
import { MarketDataModule } from './market-data/market-data.module';
import { PrismaModule } from './prisma/prisma.module';
import { SmartInsightsModule } from './smart-insights/smart-insights.module';
import { UsersModule } from './users/users.module';
import { WatchlistsModule } from './watchlists/watchlists.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    InstrumentsModule,
    MarketDataModule,
    WatchlistsModule,
    SmartInsightsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
