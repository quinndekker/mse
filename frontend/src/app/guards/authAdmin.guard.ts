import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthAdminGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.authService.isLoggedIn()) {
      const user = this.authService.getUser();
      if (user && user.admin) {
        return true;
      } else {
        this.router.navigate(['/search']);
        return false;
      }
    } else {
        this.router.navigate(['/search']);
        return false;
    }
  }
}