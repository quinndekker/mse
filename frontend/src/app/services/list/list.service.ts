// src/app/services/list.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface List {
  _id?: string;
  name: string;
  myStocks?: boolean;
  tickers: string[];
  user?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ListService {
  private readonly apiUrl = '/api/list'; 

  constructor(private http: HttpClient) {}

  /**
   * Create a new list for the authenticated user.
   * @param listName The display name of the list.
   * @returns Observable of the created List document.
   */
  createList(listName: string): Observable<List> {
    return this.http.post<List>(this.apiUrl, { listName }).pipe(
      catchError(err => {
        console.error('Create list error:', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Retrieve all lists that belong to the authenticated user.
   * @returns Observable of an array of List documents.
   */
  getUserLists(): Observable<List[]> {
    return this.http.get<List[]>(this.apiUrl).pipe(
      catchError(err => {
        console.error('Fetch lists error:', err);
        return throwError(() => err);
      })
    );
  }

  getListById(listId: string): Observable<List> {
    return this.http.get<List>(`${this.apiUrl}/${listId}`).pipe(
      catchError(err => {
        console.error('Fetch list by ID error:', err);
        return throwError(() => err);
      })
    );
  }

  addTickerToList(listId: string, ticker: string): Observable<List> {
    return this.http.post<List>(`${this.apiUrl}/add-ticker`, { listId, ticker }).pipe(
      catchError(err => {
        console.error('Add ticker error:', err);
        return throwError(() => err);
      })
    );
  }
}
