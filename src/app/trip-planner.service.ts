import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TripPlannerService {
  private baseUrl = 'http://localhost:5001';

  constructor(private http: HttpClient) { }

  calculateDistance(origin: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/calculate-distance`, { origin });
  }

  generateRouteAndMetrics(data: { origin: string, locations: string[] }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/generate-route-and-metrics`, data);
  }
}