import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RouteDataService {
  private routeInfo: any;

  setRouteInfo(data: any) {
    this.routeInfo = data;
  }

  getRouteInfo() {
    return this.routeInfo;
  }
}