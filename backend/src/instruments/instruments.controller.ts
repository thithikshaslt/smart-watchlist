import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { Instrument } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import {
  CandleView,
  MarketDataService,
  QuoteView,
} from '../market-data/market-data.service';
import { SearchInstrumentsDto } from './dto/search-instruments.dto';
import { InstrumentsService } from './instruments.service';

@Controller('instruments')
export class InstrumentsController {
  constructor(
    private readonly instrumentsService: InstrumentsService,
    private readonly marketDataService: MarketDataService,
  ) {}

  @Public()
  @Get('search')
  search(@Query() dto: SearchInstrumentsDto): Promise<Instrument[]> {
    return this.instrumentsService.search(dto.q);
  }

  @Public()
  @Get(':id')
  async findById(@Param('id') id: string): Promise<Instrument> {
    const instrument = await this.instrumentsService.findById(id);
    if (!instrument) {
      throw new NotFoundException(`Instrument ${id} not found`);
    }
    return instrument;
  }

  @Public()
  @Get(':id/quote')
  async quote(
    @Param('id') id: string,
  ): Promise<{ available: boolean; quote: QuoteView | null }> {
    await this.assertInstrumentExists(id);
    const quote = await this.marketDataService.getLatestQuote(id);
    return { available: quote !== null, quote };
  }

  @Public()
  @Get(':id/history')
  async history(
    @Param('id') id: string,
    @Query('range') range: string,
  ): Promise<CandleView[]> {
    await this.assertInstrumentExists(id);
    return this.marketDataService.getHistory(id, range);
  }

  private async assertInstrumentExists(id: string): Promise<void> {
    const instrument = await this.instrumentsService.findById(id);
    if (!instrument) {
      throw new NotFoundException(`Instrument ${id} not found`);
    }
  }
}
