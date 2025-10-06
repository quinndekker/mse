export type ModelType = 'lstm' | 'gru' | 'rnn';
export type Timeframe = '1d' | '2w' | '2m';

export interface Prediction {
  _id?: string;
  id?: string;
  ticker: string;
  modelType: ModelType;
  predictionTimeline: Timeframe;
  status: 'Pending' | 'Completed' | string;
  startDate: string | Date;
  endDate?: string | Date | null;
  predictedPrice?: number | null;
  priceDifference?: number | null;
  predictionAccuracy?: number | null;
  sector?: string | "general";
}