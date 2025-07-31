import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PredictionService {
  private apiUrl = '/api/prediction'; 

  constructor(private http: HttpClient) {}

  createPrediction(ticker: string, modelType: string, predictionTimeline: string): Observable<any> {
    const payload = { ticker, modelType, predictionTimeline };

    return this.http.post(`${this.apiUrl}`, payload).pipe(
      catchError((error) => {
        console.error('Prediction creation error:', error);
        return throwError(() => error);
      })
    );
  }
}
