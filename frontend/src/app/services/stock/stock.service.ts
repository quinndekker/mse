import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class StockService {
  private apiUrl = '/api/stock';

  constructor(
    private http: HttpClient
  ) { }


  searchStocks(searchQuery: string, page: number = 1, limit: number = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}`, {
      params: { searchQuery, page, limit }
    }).pipe(
      catchError((error) => {
        console.error('Search error:', error);
        return throwError(() => error);
      }
    ));
  }

}
