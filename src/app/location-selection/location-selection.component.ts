import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TripPlannerService } from '../trip-planner.service';

@Component({
  selector: 'app-location-selection',
  templateUrl: './location-selection.component.html',
  styleUrls: ['./location-selection.component.css']
})
export class LocationSelectionComponent implements OnInit {
  origin: string = '';
  stores: any[] = [];
  paginatedStores: any[] = [];
  pageSize = 10;
  currentPage = 1;
  loading = false;
  selectedRowKeys: any[] = [];
  hasSelected = false;
  selectAll = false;

  constructor(private router: Router, private tripPlannerService: TripPlannerService) {}

  ngOnInit() {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { origin: string, originLatLng: any };

    if (state && state.origin) {
      this.origin = state.origin;
      this.calculateDistances(state.origin);
    } else {
      this.router.navigate(['/origin-selection']);
    }
  }

  calculateDistances(origin: string) {
    this.loading = true;
    this.tripPlannerService.calculateDistance(origin).subscribe(
      response => {
        this.stores = response.top25Closest.map((store: any) => ({ ...store, selected: false }));
        this.updatePaginatedStores();
        this.loading = false;
      },
      error => {
        console.error('Error calculating distances:', error);
        this.loading = false;
      }
    );
  }

  updatePaginatedStores() {
    this.paginatedStores = this.stores.slice((this.currentPage - 1) * this.pageSize, this.currentPage * this.pageSize);
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.updatePaginatedStores();
  }

  onSelectRow(store: any, event: any) {
    store.selected = event.target.checked;
    this.selectedRowKeys = this.stores.filter(store => store.selected).map(store => store.key);
    this.hasSelected = this.selectedRowKeys.length > 0;
  }

  toggleSelectAll(checked: boolean) {
    this.selectAll = checked;
    this.paginatedStores.forEach(store => store.selected = checked);
    this.onSelectRow(this.paginatedStores, checked);
  }

  generateRoute() {
    const selectedStores = this.stores.filter(store => store.selected);
    if (selectedStores.length > 10) {
      window.alert('You can select up to 10 addresses only.');
      return;
    }

    if (selectedStores.length === 0) {
      window.alert('Please select at least one location.');
      return;
    }

    const locations = selectedStores.map(store => store.address);
    this.router.navigate(['/route-info'], { state: { origin: this.origin, locations } });
  }
}