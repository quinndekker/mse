import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ModelDetails } from '../../models/modelDetails';

@Injectable({
  providedIn: 'root'
})
export class ModelDetailsService {
  private apiUrl = '/api/modeldetails';

  constructor(private http: HttpClient) {}

  getModelDetails(modelType: string, timeframe: string, sector: string): Observable<ModelDetails> {
    const url = `${this.apiUrl}/${modelType}/${timeframe}/${sector}`;
    return this.http.get<ModelDetails>(url);
  }
}
