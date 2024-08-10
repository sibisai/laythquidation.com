import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SelectionService {
  private selectedLocationIndices: Set<number> = new Set<number>();

  toggleSelection(index: number): void {
    if (this.selectedLocationIndices.has(index)) {
      this.selectedLocationIndices.delete(index);
    } else {
      this.selectedLocationIndices.add(index);
    }
  }

  getSelectedLocations(): Set<number> {
    return this.selectedLocationIndices;
  }

  getSelectedLocationsCount(): number {
    return this.selectedLocationIndices.size;
  }

  clearAllSelections(): void {
    this.selectedLocationIndices.clear();
  }
}