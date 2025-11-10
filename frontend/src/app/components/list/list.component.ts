import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListService, List } from '../../services/list/list.service';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs';
import { Router } from '@angular/router';


@Component({
  selector: 'app-list',
  imports: [
    CommonModule
  ],
  templateUrl: './list.component.html',
  styleUrl: './list.component.css'
})
export class ListComponent {
  list: List | null = null;
  loading = true;
  errorMsg = '';

  constructor(
    private listService: ListService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap(params => {
          const id = params.get('id') as string;
          return this.listService.getListById(id);
        })
      )
      .subscribe({
        next: list => {
          this.list = list;
          this.loading = false;
        },
        error: err => {
          this.errorMsg = err.error?.message || 'Could not load list.';
          this.loading = false;
        }
      });
  }

  navigateToStock(ticker: string): void {
    if (ticker) {
      this.router.navigate(['/stock', ticker]);
    } else {
      console.warn('Ticker is undefined or empty.');
    }
  }

  confirmRemove(ticker: string, ev?: Event): void {
    ev?.stopPropagation();
    if (!this.list?._id) return;
  
    const ok = window.confirm(`Remove ${ticker} from "${this.list.name}"?`);
    if (!ok) return;
  
    this.removeTicker(ticker);
  }
  
  private removeTicker(ticker: string): void {
    if (!this.list?._id) return;
  
    // Optimistic update
    const prevTickers = [...(this.list.tickers || [])];
    this.list.tickers = prevTickers.filter(t => t !== ticker);
  
    this.listService.removeTickerFromList(this.list._id, ticker).subscribe({
      next: (updated) => {
        // trust server truth; also covers concurrent changes
        this.list = updated;
      },
      error: (err) => {
        // rollback
        this.list!.tickers = prevTickers;
        this.errorMsg = err?.error?.message || 'Failed to remove ticker.';
        console.error('Remove ticker failed:', err);
      }
    });
  }

}
