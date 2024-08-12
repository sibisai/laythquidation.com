import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SelectionService {
  private selectedLocationIndices: Set<string> = new Set<string>(); // Use Set<string> for string-based identifiers

  toggleSelection(index: string): void {
    if (this.selectedLocationIndices.has(index)) {
      this.selectedLocationIndices.delete(index);
    } else {
      this.selectedLocationIndices.add(index);
    }
  }

  getSelectedLocations(): Set<string> {
    return this.selectedLocationIndices;
  }

  getSelectedLocationsCount(): number {
    return this.selectedLocationIndices.size;
  }

  clearAllSelections(): void {
    this.selectedLocationIndices.clear();
  }
}