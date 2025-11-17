import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ListService, List } from '../../services/list/list.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-lists',
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './lists.component.html',
  styleUrl: './lists.component.css'
})
export class ListsComponent {
  lists: List[] = [];
  newListName: string = '';

  loading = false;
  errorMsg = '';

  constructor(
    private listService: ListService,
    private router: Router
  ) {};

  ngOnInit(): void {
    this.fetchLists();
  }

  fetchLists(): void {
    this.loading = true;
    this.listService.getUserLists().subscribe({
      next: (data) => { this.lists = data; this.loading = false; },
      error: (err) => { this.errorMsg = err.message || 'Failed to load lists'; this.loading = false; }
    });
  }

  addList(): void {
    if (!this.newListName.trim()) {
      return;
    }
    this.loading = true;
    this.listService.createList(this.newListName.trim()).subscribe({
      next: (created) => {
        this.lists.push(created);
        this.newListName = '';      // clear input
        this.loading = false;
      },
      error: (err) => {
        this.errorMsg = err.error?.message || 'Could not create list';
        this.loading = false;
      }
    });
  }

  openList(id: string): void {
    this.router.navigate(['/lists', id]);
  }

  confirmDelete(listId: string, name: string): void {
    const ok = window.confirm(`Are you sure you want to delete the list "${name}"?`);
    if (!ok) return;
  
    this.listService.deleteList(listId).subscribe({
      next: (res) => {
        this.lists = this.lists.filter(l => l._id !== listId);
        console.log(res.message);
      },
      error: (err) => {
        console.error('Failed to delete list:', err);
      }
    });
  }
}
