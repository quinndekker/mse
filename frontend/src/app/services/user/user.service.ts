import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { User } from '../../models/user';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = '/api/user';

  constructor(
    private http: HttpClient
  ) { }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}`).pipe(
      catchError((error) => {
        console.error('Get all users error:', error);
        return throwError(() => error);
      })
    );
  }

  promoteUser(userId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${userId}/admin`, { userId }).pipe(
      catchError((error) => {
        console.error('Promote user error:', error);
        return throwError(() => error);
      })
    );
  }

  demoteUser(userId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${userId}/remove-admin`, { body: { userId } }).pipe(
      catchError((error) => {
        console.error('Demote user error:', error);
        return throwError(() => error);
      })
    );
  }
}
