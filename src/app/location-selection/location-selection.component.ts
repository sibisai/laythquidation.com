import { Component, OnInit, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TripPlannerService } from '../services/trip-planner.service';
import { RouteDataService } from '../services/route-data.service';
import { LocationService } from '../services/location.service';

declare var google: any;

@Component({
  selector: 'app-location-selection',
  templateUrl: './location-selection.component.html',
  styleUrls: ['./location-selection.component.css']
})
export class LocationSelectionComponent implements OnInit {
  locations: any[] = [];
  filteredLocations: any[] = [];
  paginatedLocations: any[] = [];
  map!: google.maps.Map;
  markers: google.maps.Marker[] = [];
  selectedMarker: google.maps.Marker | null = null;
  originMarker: google.maps.Marker | null = null;
  selectedLocationsCount = 0;
  selectedLocationIndices: Set<number> = new Set<number>();
  searchTerm: string = '';
  loading = false;
  currentPage = 1;
  pageSize = 10;
  totalLocations = 0;
  selectedLocationIndex: number | null = null;
  pageSizeOptions = [10, 15, 25, 50];

  constructor(
    private router: Router,
    private ngZone: NgZone,
    private modal: NzModalService,
    private tripPlannerService: TripPlannerService,
    private routeDataService: RouteDataService,
    private locationService: LocationService
  ) {
    // Retrieve locations from the service if available
    this.locations = this.routeDataService.getLocations() || [];
    if (this.locations.length > 0) {
      this.filteredLocations = [...this.locations];
      this.totalLocations = this.filteredLocations.length;
      this.paginateLocations();
    } else {
      const navigation = this.router.getCurrentNavigation();
      if (navigation?.extras.state) {
        this.locations = navigation.extras.state['stores'];
        this.filteredLocations = [...this.locations];
        this.totalLocations = this.filteredLocations.length;
        this.paginateLocations();
        const origin = navigation.extras.state['start'];
        this.locationService.setOrigin(origin);  // Set origin in LocationService
      }
    }
  }

  ngOnInit(): void {
    this.loadGoogleMapsScript().then(() => {
      this.initMap();
      const origin = this.locationService.getOrigin();  // Get origin from LocationService
      if (origin) {
        this.addOriginMarker(origin);
      }
      this.addMarkers();
    });
  }

  getMinValue(a: number, b: number): number {
    return Math.min(a, b);
  }

  paginateLocations() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedLocations = this.filteredLocations.slice(startIndex, endIndex);
  }

  filterLocations(): void {
    this.loading = true;
    setTimeout(() => {
      this.filteredLocations = this.locations.filter(location =>
        location.storeName.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
      this.totalLocations = this.filteredLocations.length;
      this.currentPage = 1;
      this.paginateLocations();
      this.addMarkers(); // Re-create markers after filtering
      this.loading = false;
    }, 500);
  }

  onPageIndexChange(page: number) {
    this.currentPage = page;
    this.paginateLocations();
    this.addMarkers(); // Re-create markers after page change
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1;
    this.paginateLocations();
    this.addMarkers(); // Re-create markers after page size change
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
    const mapElement = document.getElementById('map') as HTMLElement;

    this.map = new google.maps.Map(mapElement, {
      center: { lat: 34.0522, lng: -118.2437 },
      zoom: 10,
      mapTypeControl: false,
      zoomControlOptions: {
        position: google.maps.ControlPosition.LEFT_TOP
      },
      fullscreenControlOptions: {
        position: google.maps.ControlPosition.LEFT_TOP
      },
      streetViewControlOptions: {
        position: google.maps.ControlPosition.LEFT_TOP
      },
      mapTypeControlOptions: {
        position: google.maps.ControlPosition.LEFT_TOP
      }
    });
  }

  addOriginMarker(origin: string) {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: origin }, (results: any, status: any) => {
      if (status === google.maps.GeocoderStatus.OK) {
        this.originMarker = new google.maps.Marker({
          map: this.map,
          position: results[0].geometry.location,
          title: 'Origin Location',
          icon: {
            url: 'assets/images/current_location.png',
            scaledSize: new google.maps.Size(40, 40),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(20, 20)
          }
        });

        const center = this.originMarker?.getPosition() as google.maps.LatLng;
        const offsetLng = -0.3;
        const newCenter = {
          lat: center.lat(),
          lng: center.lng() - offsetLng
        };

        this.map.setCenter(newCenter);

        this.originMarker?.addListener('click', () => {
          this.ngZone.run(() => {
            const infoWindow = new google.maps.InfoWindow({
              content: `<h4>Origin Location</h4><p>${origin}</p>`
            });
            infoWindow.open(this.map, this.originMarker!);
          });
        });
      } else {
        console.error('Geocode failed for origin: ' + status);
      }
    });
  }

  addMarkers() {
    this.clearAllMarkers();

    this.paginatedLocations.forEach((location, index) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: location.address }, (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK) {
          const marker = new google.maps.Marker({
            map: this.map,
            position: results[0].geometry.location,
            title: location.storeName,
            label: {
              text: `${(this.currentPage - 1) * this.pageSize + index + 1}`,
              color: 'white',
              fontWeight: 'bold',
              fontSize: '16px'
            }
          });

          this.markers.push(marker);

          const infoWindow = new google.maps.InfoWindow({
            content: `<h4>${location.storeName}</h4><p>${location.address}</p><p>${location.phoneNumber}</p><p>Distance: ${location.distance}</p><p>Duration: ${location.duration}</p>`
          });

          marker.addListener('click', () => {
            this.ngZone.run(() => {
              infoWindow.open(this.map, marker);
              this.onMarkerClick(location);

              // Add listener for when the info window is closed to zoom out
              infoWindow.addListener('closeclick', () => {
                this.map.setZoom(10); // Set the zoom level back to a wider view
              });
            });
          });
        } else {
          console.error('Geocode failed: ' + status);
        }
      });
    });
  }

  onMarkerClick(location: any): void {
    console.log('Marker clicked for location:', location);
    this.highlightCard(location);
  }

  highlightCard(location: any): void {
    const highlightedIndex = this.paginatedLocations.findIndex(loc => loc.address === location.address);

    if (highlightedIndex !== -1) {
      const cardIndex = highlightedIndex % this.pageSize;

      this.selectedLocationIndex = cardIndex;

      const cardElement = document.querySelector(`.location-card-${cardIndex}`);
      cardElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      console.error('Location not found in filteredLocations');
    }
  }

  selectLocation(location: any): void {
    const selectedMarkerIndex = this.filteredLocations.findIndex(loc => loc.address === location.address);

    if (selectedMarkerIndex !== -1) {
      this.highlightCard(location);
      this.selectedLocationIndices.add(selectedMarkerIndex);
      this.selectedLocationsCount++;
    } else {
      console.error('Location not found in filteredLocations');
    }
  }

  clearAllSelections(): void {
    this.selectedMarker = null;
    this.selectedLocationsCount = 0;
    this.selectedLocationIndices.clear();
    if (this.originMarker) {
      const center = this.originMarker.getPosition() as google.maps.LatLng;
      this.map.setZoom(10);
      this.map.setCenter(center);
    } else {
      this.map.setZoom(10);
      this.map.setCenter({ lat: 34.0522, lng: -118.2437 });
    }
  }
  clearAllMarkers(): void {
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];
  }

 submitSelections(): void {
  if (this.selectedLocationsCount > 0) {
    const selectedLocations = this.filteredLocations
      .filter((loc, index) => this.selectedLocationIndices.has(index))
      .map(loc => loc.address);
    const origin = this.locationService.getOrigin() || '';
    const requestBody = {
      origin: origin,
      locations: selectedLocations
    };

    // Create a reference to the modal instance
    const modal = this.modal.confirm({
      nzTitle: 'Confirm Route Generation',
      nzContent: `You have selected ${this.selectedLocationsCount} locations. Do you want to generate the route?`,
      nzOkText: 'Yes',
      nzCancelText: 'No',
      nzOkLoading: this.loading, // Bind modal OK button loading state
      nzOnOk: () => {
        this.loading = true; // Start loading spinner

        this.tripPlannerService.generateRouteAndMetrics(requestBody).subscribe(
          (response: any) => {
            this.routeDataService.setRouteInfo(response);  // Store the data in RouteDataService
            this.loading = false; // Stop loading spinner
            modal.destroy(); // Destroy the modal
            this.router.navigate(['/route-info']); // Navigate to the route info page
          },
          (error: any) => {
            this.loading = false; // Stop loading spinner
            console.error('Error generating route:', error);
            alert('Failed to generate the route. Please try again.');
          }
        );

        return new Promise((resolve) => setTimeout(resolve, 0)); // Return a promise to handle async operation
      },
      nzOnCancel: () => {
        console.log('User canceled the route generation.');
      }
    });
  } else {
    alert('Please select at least one location before submitting.');
  }
}
}