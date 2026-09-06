import { ArrayUnique, IsArray, IsIn } from 'class-validator';
import { VIEW_LENS_METRICS, ViewLensMetric } from '../view-lens-metrics';

export class SetWatchlistViewDto {
  @IsArray()
  @ArrayUnique()
  @IsIn(VIEW_LENS_METRICS, { each: true })
  metrics!: ViewLensMetric[];
}
