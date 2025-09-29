import { Injectable } from '@angular/core';
import { 
  HttpClient,
  HttpParams
 } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PredictionService {
  private apiUrl = '/api/prediction'; 

  constructor(private http: HttpClient) {}

  createPrediction(ticker: string, modelType: string, predictionTimeline: string, sectorTicker="general"): Observable<any> {
    const payload = { ticker, modelType, predictionTimeline, sectorTicker };

    return this.http.post(`${this.apiUrl}`, payload).pipe(
      catchError((error) => {
        console.error('Prediction creation error:', error);
        return throwError(() => error);
      })
    );
  }

  getUserPredictions(ticker?: string): Observable<any> {
    const params = ticker && ticker.trim()
      ? new HttpParams().set('ticker', ticker.trim())
      : undefined;
  
    return this.http.get<any>(this.apiUrl, { params }).pipe(
      catchError((error) => {
        console.error('Error fetching user predictions:', error);
        return throwError(() => error);
      })
    );
  }
}
