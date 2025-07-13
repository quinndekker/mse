import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user/user.service';
import { User } from '../../models/user';
import { UserListItemComponent } from '../user-list-item/user-list-item.component';

@Component({
  selector: 'app-all-users',
  imports: [
    CommonModule,
    UserListItemComponent
  ],
  templateUrl: './all-users.component.html',
  styleUrl: './all-users.component.css'
})
export class AllUsersComponent {
  users: User[] = [];

  constructor(
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (error) => {
        console.error('Error fetching users:', error);
      }
    });
  }

}
