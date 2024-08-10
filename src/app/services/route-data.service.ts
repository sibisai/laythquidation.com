import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RouteDataService {
  private routeInfo: any = null;
  private locations: any[] = [];
  private origin: string | null = null;
  private selectedLocationIndices: Set<number> = new Set<number>();
  private currentPage: number = 1;

  getRouteInfo() {
    return this.routeInfo;
  }

  setRouteInfo(info: any) {
    this.routeInfo = info;
  }

  clearRouteInfo() {
    this.routeInfo = null;
    this.locations = [];
    this.origin = null;
    this.selectedLocationIndices.clear();
    this.currentPage = 1;
  }

  getLocations() {
    return this.locations;
  }

  setLocations(locations: any[]) {
    this.locations = locations;
  }

  getOrigin() {
    return this.origin;
  }

  setOrigin(origin: string) {
    this.origin = origin;
  }

  getSelectedLocationIndices(): Set<number> {
    return this.selectedLocationIndices;
  }

  setSelectedLocationIndices(indices: Set<number>) {
    this.selectedLocationIndices = indices;
  }

  getCurrentPage(): number {
    return this.currentPage;
  }

  setCurrentPage(page: number) {
    this.currentPage = page;
  }
}