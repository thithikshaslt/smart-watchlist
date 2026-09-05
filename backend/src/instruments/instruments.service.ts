import { Injectable } from '@nestjs/common';
import { Instrument } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InstrumentsService {
  constructor(private readonly prisma: PrismaService) {}

  search(query: string): Promise<Instrument[]> {
    return this.prisma.instrument.findMany({
      where: {
        OR: [
          { symbol: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { symbol: 'asc' },
    });
  }

  findById(id: string): Promise<Instrument | null> {
    return this.prisma.instrument.findUnique({ where: { id } });
  }
}
