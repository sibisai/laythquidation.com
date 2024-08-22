import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private origin: string | null = null;
  private originCoordinates: { latitude: number; longitude: number } | null = null;

  setOrigin(origin: string, latitude: number, longitude: number) {
    this.origin = origin;
    this.originCoordinates = { latitude, longitude };
  }

  getOrigin(): string | null {
    return this.origin;
  }

  getOriginCoordinates(): { latitude: number; longitude: number } | null {
    return this.originCoordinates;
  }

  clearOrigin() {
    this.origin = null;
    this.originCoordinates = null;
  }
}