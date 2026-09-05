import { IsUUID } from 'class-validator';

export class AddWatchlistItemDto {
  @IsUUID()
  instrumentId!: string;
}
