import { IsString, MinLength } from 'class-validator';

export const MIN_SEARCH_QUERY_LENGTH = 2;

export class SearchInstrumentsDto {
  @IsString()
  @MinLength(MIN_SEARCH_QUERY_LENGTH, {
    message: `Search query must be at least ${MIN_SEARCH_QUERY_LENGTH} characters long`,
  })
  q!: string;
}
