import { Prediction } from '../models/prediction';
type Timeframe = '1d' | '2w' | '2m';
import { ModelDetails } from './modelDetails';
export interface ModelState {
    sector: string;
    timeframe: Timeframe;
    loading: boolean;
    error?: string | null;
    data?: ModelDetails | null;
  
    predictions?: Prediction[] | null;
    predLoading?: boolean;
    predError?: string | null;
  
    // NEW
    avgAccuracy?: number | null;  // mean of valid accuracies
    accSampleSize?: number;       // how many predictions had accuracy
  }