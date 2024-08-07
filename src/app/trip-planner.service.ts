import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TripPlannerService {
  private apiUrl = 'http://localhost:5001'; // Adjust the URL according to your backend setup

  constructor(private http: HttpClient) { }

  generateRoute(origin: string, locations: string[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/generate-route-and-metrics`, { origin, locations });
  }

  calculateDistance(origin: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/calculate-distance`, { origin });
  }
}