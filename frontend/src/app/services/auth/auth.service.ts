import { Injectable, Output, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../../models/user';
import { UserResponse } from '../../models/userResponse';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = '';
  private user?: User;
  private userKey = "user";
  private expiresAtKey = "expiresAt";

  constructor(
    private http: HttpClient,
    private router: Router
  ) { }

  @Output() userUpdate: EventEmitter<void> = new EventEmitter();

  loginWithGoogle(idToken: string): Observable<any> {
    return this.http.post<UserResponse>(`${this.apiUrl}/google`, { credential: idToken }).pipe(
      tap((response: UserResponse) => {
        this.user = response.user;
        localStorage.setItem(this.userKey, JSON.stringify(this.user));
        localStorage.setItem(this.expiresAtKey, JSON.stringify(response.expiresAt));
        this.userUpdate.emit();
      })
    );
  }

  isLoggedIn(): boolean {
    const expiresAt = JSON.parse(localStorage.getItem(this.expiresAtKey) || '0');
    if (expiresAt) {
      const now = new Date();
      const expirationDate = new Date(expiresAt);
      if (expirationDate < now) {
        localStorage.removeItem(this.userKey);
        localStorage.removeItem(this.expiresAtKey);
        this.userUpdate.emit();
        return false;
      }
    }
    return !!localStorage.getItem(this.userKey);
  }

  getUser(): User {
    return JSON.parse(localStorage.getItem(this.userKey) || '');
  }

  logout() {
    this.http.get(`${this.apiUrl}/logout`).subscribe(() => {
      localStorage.removeItem(this.userKey);
      localStorage.removeItem(this.expiresAtKey);
      this.userUpdate.emit();
      this.router.navigate(['/login']);
    });
  }
}
