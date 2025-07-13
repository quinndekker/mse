import { Stock } from './stock';

export interface StockList {
    stocks: Stock[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}