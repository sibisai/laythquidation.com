import { Component, OnInit, NgZone, Output, EventEmitter } from '@angular/core';
import { FormControl } from '@angular/forms';
import { TripPlannerService } from '../trip-planner.service';

declare var google: any;

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  @Output() tripGenerated = new EventEmitter<any>();
  originControl = new FormControl('');
  stores: any[] = [];
  paginatedStores: any[] = [];
  map!: google.maps.Map;
  userLocation!: google.maps.LatLng;
  pageSize = 10;
  currentPage = 1;
  loading = false;
  selectedRowKeys: any[] = [];
  hasSelected = false;
  selectAll = false;
  routeInfo: any[] = [];
  googleMapsUrl = '';

  constructor(private tripPlannerService: TripPlannerService, private ngZone: NgZone) { }

  ngOnInit() {
    this.loadGoogleMapsScript().then(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
          this.userLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
          this.initMap();
        });
      } else {
        console.error("Geolocation is not supported by this browser.");
        this.initMap();
      }
    });
  }

  loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = (error) => reject(error);
      document.head.appendChild(script);
    });
  }

  initMap() {
    const input = document.getElementById('location-input') as HTMLInputElement;
    const autocomplete = new google.maps.places.Autocomplete(input);
    const mapElement = document.getElementById('map') as HTMLElement;

    this.map = new google.maps.Map(mapElement, {
      center: this.userLocation || { lat: 40.749933, lng: -73.98633 },
      zoom: 13,
      mapTypeControl: false
    });

    const marker = new google.maps.Marker({
      map: this.map,
      position: this.userLocation,
      title: 'Your Location'
    });

    autocomplete.addListener('place_changed', () => {
      this.ngZone.run(() => {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) {
          window.alert("No details available for input: '" + place.name + "'");
          return;
        }

        if (place.geometry.viewport) {
          this.map.fitBounds(place.geometry.viewport);
        } else {
          this.map.setCenter(place.geometry.location);
          this.map.setZoom(17);
        }

        marker.setPosition(place.geometry.location);
        this.calculateDistances(place.formatted_address || '');
      });
    });
  }

  calculateDistances(origin: string) {
    if (origin) {
      this.tripPlannerService.calculateDistance(origin).subscribe(
        response => {
          this.stores = response.top25Closest.map((store: any) => ({ ...store, selected: false }));
          this.updatePaginatedStores();
        },
        error => {
          console.error('Error calculating distances:', error);
        }
      );
    } else {
      console.error('Origin is undefined or empty');
    }
  }

  updatePaginatedStores() {
    this.paginatedStores = this.stores.slice((this.currentPage - 1) * this.pageSize, this.currentPage * this.pageSize);
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.updatePaginatedStores();
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

    const origin = this.originControl.value;  // Get origin from the input field
    if (!origin) {
      window.alert('Please enter a valid origin address.');
      return;
    }

    const locations = selectedStores.map(store => store.address);

    // Send data to the second endpoint
    this.tripPlannerService.generateRouteAndMetrics({ origin, locations }).subscribe(
      response => {
        this.routeInfo = response.route;
        this.googleMapsUrl = response.googleMapsUrl;
        this.tripGenerated.emit(response);  // Emit the response event
      },
      error => {
        console.error('Error generating route:', error);
      }
    );
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
}