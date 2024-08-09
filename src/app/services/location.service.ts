import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private origin: string | null = null;

  setOrigin(origin: string) {
    this.origin = origin;
  }

  getOrigin(): string | null {
    return this.origin;
  }

  clearOrigin() {
    this.origin = null;
  }
}