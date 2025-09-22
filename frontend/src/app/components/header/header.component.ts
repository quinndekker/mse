import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth/auth.service';
import { User } from '../../models/user';
import { Router } from '@angular/router';
import { ListService, List } from '../../services/list/list.service';

@Component({
  selector: 'app-header',
  imports: [
    CommonModule
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  showItems: boolean = false;
  currentUser: User | null = null;
  profilePictureUrl: string | null = null;
  email: string | null = null;
  currentUserIsAdmin: boolean = false;
  userLists: List[] = [];
  myStocksId: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private listService: ListService
  ) {}


  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.showItems = true;
      this.currentUser = this.authService.getUser();
      this.profilePictureUrl = this.currentUser?.picture || null;
      this.email = this.currentUser?.email || null;
      this.currentUserIsAdmin = this.currentUser?.admin || false;
    }

    this.authService.userUpdate.subscribe(() => {
      this.updateItems();
    });
  }

  updateItems() {
    if (!this.authService.isLoggedIn()) {
      this.showItems = false;
      return;
    }

    this.showItems = true;
    this.currentUser = this.authService.getUser();
    this.profilePictureUrl = this.currentUser?.picture || null;
    this.email = this.currentUser?.email || null;
    this.currentUserIsAdmin = this.currentUser?.admin || false;
    this.getUserLists();
  }

  getUserLists() {
    this.listService.getUserLists().subscribe({
      next: lists => {
        this.userLists = lists;
      },
      error: err => {
        console.error('Error fetching user lists:', err);
      }
    });
  }

  navigateToProfile() {
    if (this.currentUser) {
      this.router.navigate(['/profile']);
    }
  }

  navigateToMyStocks() {
    // Ensure userLists is defined and has items before navigating
    if ( this.userLists.length <= 0) {
      return;
    }

    this.updateMyStocksId();
    if (this.myStocksId) {
      this.router.navigate(['/lists', this.myStocksId]);
    }
  }

  updateMyStocksId() {
    const myStocksList = this.userLists.find(list => list.name === 'My Stocks');
    if (myStocksList) {
      this.myStocksId = myStocksList._id || '';
    }
  }

  navigateToModels() {
    this.router.navigate(['/models']);
  }

  navigateToSearch() {
    this.router.navigate(['/search']);
  }

  navigateToAllUsers() {
    this.router.navigate(['/allusers']);
  }

  navigateToLists() {
    this.router.navigate(['/lists']);
  }

  navigateToSectors() {
    this.router.navigate(['/sectors']);
  }

  navigateToPredictions() {
    this.router.navigate(['/predictions']);
  }
}
