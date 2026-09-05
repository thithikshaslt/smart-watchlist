import { ArrayMinSize, ArrayUnique, IsUUID } from 'class-validator';

export class ReorderWatchlistItemsDto {
  @IsUUID('4', { each: true })
  @ArrayUnique()
  @ArrayMinSize(1)
  instrumentIds!: string[];
}
