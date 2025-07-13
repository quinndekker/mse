import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth/auth.service';
import { User } from '../../models/user';
import { Router } from '@angular/router';

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

  constructor(
    private authService: AuthService,
    private router: Router
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
  }

  navigateToProfile() {
    if (this.currentUser) {
      this.router.navigate(['/profile']);
    }
  }

  navigateToSearch() {
    this.router.navigate(['/search']);
  }

  navigateToAllUsers() {
    this.router.navigate(['/allusers']);
  }
}
