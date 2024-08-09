import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RouteDataService {
  private routeInfo: any;
  private locations: any[] = [];  // Add a property to store locations

  setRouteInfo(data: any) {
    this.routeInfo = data;
  }

  getRouteInfo() {
    return this.routeInfo;
  }

  setLocations(locations: any[]) {
    this.locations = locations;  // Store locations
  }

  getLocations() {
    return this.locations;  // Retrieve locations
  }
}