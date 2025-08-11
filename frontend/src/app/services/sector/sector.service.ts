import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SectorService {
  private apiUrl = '/api/sector';

  constructor(
    private http: HttpClient
  ) { }

  getSectorByName(sectorName: string): Observable<any> {
      return this.http.get(`${this.apiUrl}/${sectorName}`).pipe(
        catchError((error) => {
          console.error('error getting sector details:', error);
          return throwError(() => error);
        }
      ));
    }
}
