import { Prediction } from '../models/prediction';
type Timeframe = '1d' | '2w' | '2m';
import { ModelDetails } from './modelDetails';
export interface ModelState {
  sector: string;
  timeframe: '1d' | '2w' | '2m';

  loading?: boolean;
  data?: any | null;
  error?: string | null;

  predLoading?: boolean;
  predError?: string | null;
  predictions?: Prediction[] | null;

  // NEW
  avgMSE?: number | null;
}