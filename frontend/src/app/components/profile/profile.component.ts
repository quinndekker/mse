import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth/auth.service';
import { User } from '../../models/user';

@Component({
  selector: 'app-profile',
  imports: [
    CommonModule
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  currentUser: User | null = null;
  profilePictureUrl: string | null = null;
  email: string | null = null;
  firstName: string | null = null;
  lastName: string | null = null;
  userCreatedAt: Date | null = null;
  userIconUrl: string = 'https://cdn-icons-png.flaticon.com/512/12225/12225935.png';

  constructor (
    private authService: AuthService
  ) {}

  ngOnInit(): void {
      if (!this.authService.isLoggedIn()) {
          return;
          // this.authService.logout();
      }

      this.currentUser = this.authService.getUser();
      if (this.currentUser) {
          this.profilePictureUrl = this.currentUser.picture || null;
          this.email = this.currentUser.email || null;
          this.firstName = this.currentUser.firstName || null;
          this.lastName = this.currentUser.lastName || null;
          this.userCreatedAt = new Date(this.currentUser.createdAt || Date.now());
          this.userIconUrl = this.currentUser.picture || 'https://cdn-icons-png.flaticon.com/512/12225/12225935.png';
      }
  }

  logout(): void {
    this.authService.logout();
  }
}
