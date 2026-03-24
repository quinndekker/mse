import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SectorService } from '../../services/sector/sector.service';
import { ActivatedRoute } from '@angular/router';
import { StockListComponent } from '../stock-list/stock-list.component';
import { StockList } from '../../models/stockList';
import { Stock } from '../../models/stock';

@Component({
  selector: 'app-sector',
  imports: [
    CommonModule,
    StockListComponent,
  ],
  templateUrl: './sector.component.html',
  styleUrl: './sector.component.css'
})
export class SectorComponent {
  readonly limit = 10;
  sector: string | undefined;
  stockList: StockList | null = null;
  private allStocks: Stock[] = [];

  constructor(
    private sectorService: SectorService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.sector = this.route.snapshot.paramMap.get('sector') ?? undefined;

    if (!this.sector) {
      console.error('Sector is missing in route.');
      return;
    }
    this.sectorService.getSectorByName(this.sector).subscribe({
      next: (data) => {
        if (Array.isArray(data)) {
          this.allStocks = data.map((stock) => ({
            ticker: stock.ticker || 'N/A',
            name: stock.name || 'N/A',
            open: 0, close: 0, high: 0, low: 0,
            volume: 0, change: 0, changePercent: 0, price: 0
          }));
          this.setPage(1);
        }
      },
      error: (error) => {
        console.error('Error fetching sector data:', error);
      }
    });
  }

  setPage(page: number): void {
    const total = this.allStocks.length;
    const totalPages = Math.ceil(total / this.limit);
    const start = (page - 1) * this.limit;
    this.stockList = {
      stocks: this.allStocks.slice(start, start + this.limit),
      total,
      page,
      limit: this.limit,
      totalPages
    };
  }
}
