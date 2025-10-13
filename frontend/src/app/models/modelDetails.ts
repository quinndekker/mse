import { Prediction } from './prediction';
export interface ModelDetails {
    _id: string;
    sector: string;
    timeframe: string;
    modelType: string;
    mse: number;
    trainingTimeSeconds: number;
    createdAt: string;
    updatedAt: string;
    sectorSpdr: string;  
    sectorName: string;
  }