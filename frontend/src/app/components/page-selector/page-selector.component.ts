import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-selector',
  imports: [
    CommonModule
  ],
  templateUrl: './page-selector.component.html',
  styleUrl: './page-selector.component.css'
})
export class PageSelectorComponent {
  @Input() page: number = 1;
  @Input() totalPages: number = 1;
  @Output() pageUpdate = new EventEmitter<number>();

  selectPage(page: number) {
    this.pageUpdate.emit(page);
  }
}
