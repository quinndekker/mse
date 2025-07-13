import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../models/user';
import { UserService } from '../../services/user/user.service';

@Component({
  selector: 'app-user-list-item',
  imports: [
    CommonModule
  ],
  templateUrl: './user-list-item.component.html',
  styleUrl: './user-list-item.component.css'
})
export class UserListItemComponent {
  @Input () user: User | null = null;

  constructor(
    private userService: UserService
  ) { 
  }

  promoteUser(): void {
    this.userService.promoteUser(this.user?._id || '').subscribe({
      next: (response) => {
        window.location.reload();
      },
      error: (err) => {
        console.error('Failed to promote user:', err);
      }
    });
  }

  demoteUser(): void {
    this.userService.demoteUser(this.user?._id || '').subscribe({
      next: (response) => {
        window.location.reload();
      },
      error: (err) => {
        console.error('Failed to demote user:', err);
      }
    });
  }

}
