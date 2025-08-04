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

}
