import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Stock } from '../../models/stock';

@Component({
  selector: 'app-stock-detail',
  imports: [
    CommonModule
  ],
  templateUrl: './stock-detail.component.html',
  styleUrl: './stock-detail.component.css'
})
export class StockDetailComponent {

  @Input() stock: Stock | null = null;
}
