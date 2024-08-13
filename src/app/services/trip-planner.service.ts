import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TripPlannerService {
  // private apiUrl = 'http://localhost:5001';
  private apiUrl = 'https://route-plug-9cc83536ca43.herokuapp.com';

  constructor(private http: HttpClient) {}

  calculateDistance(data: { origin: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/calculate-distance`, data);
  }

  generateRouteAndMetrics(data: { origin: string, locations: string[] }): Observable<any> {
    return this.http.post(`${this.apiUrl}/generate-route-and-metrics`, data);
  }
}