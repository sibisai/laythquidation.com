import { Component, OnInit, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TripPlannerService } from '../services/trip-planner.service';
import { RouteDataService } from '../services/route-data.service';
import { LocationService } from '../services/location.service';
import { SelectionService } from '../services/selection.service';

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
  allSelectedLocations: any[] = [];
  map!: google.maps.Map;
  markers: google.maps.Marker[] = [];
  selectedMarker: google.maps.Marker | null = null;
  originMarker: google.maps.Marker | null = null;
  markerLocationMap: Map<google.maps.Marker, any> = new Map();
  searchTerm: string = '';
  loading = false;
  progressInterval: any;
  progress = 0;
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
    private locationService: LocationService,
    private selectionService: SelectionService
  ) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.locations = navigation.extras.state['stores'];
      this.filteredLocations = [...this.locations];
      this.totalLocations = this.filteredLocations.length;
      this.paginateLocations();
      this.allSelectedLocations = Array.from(this.selectionService.getSelectedLocations());
    }
  }

  ngOnInit(): void {
    this.loadGoogleMapsScript().then(() => {
      this.initMap();
      const origin = this.locationService.getOrigin();
      if (origin) {
        this.addOriginMarker(origin);
      }
      this.addMarkers();
    });
  }

  get selectedLocationsCount(): number {
    return this.allSelectedLocations.length;
  }

  get selectedLocationIndices(): Set<number> {
    return this.selectionService.getSelectedLocations();
  }

  paginateLocations() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedLocations = this.filteredLocations.slice(startIndex, endIndex);
  }


filterLocations(): void {

  setTimeout(() => {
    this.filteredLocations = this.searchTerm.trim() === ''
      ? [...this.locations]
      : this.locations.filter(location =>
          location.storeName.toLowerCase().includes(this.searchTerm.toLowerCase())
        );
    this.totalLocations = this.filteredLocations.length;
    this.currentPage = 1;
    this.paginateLocations();

    // After filtering, update the selected state for displayed items
    this.filteredLocations.forEach(location => {
      const isSelected = this.allSelectedLocations.some(
        loc => loc.address === location.address
      );
      if (isSelected) {
        this.selectedLocationIndices.add(this.filteredLocations.indexOf(location));
      } else {
        this.selectedLocationIndices.delete(this.filteredLocations.indexOf(location));
      }
    });

    this.clearAllMarkers();
    this.addMarkers();
    this.loading = false;
  }, 500);
}
  

resetProgress(): void {
  clearInterval(this.progressInterval);
  this.progress = 100; // Ensure progress is set to 100

  // Apply the fade-out effect
  const progressBar = document.querySelector('.nz-progress');
  if (progressBar) {
    progressBar.classList.add('hide');
  }

  // Keep the progress bar showing "Done" for a short duration
  setTimeout(() => {
    this.loading = false; // Hide the progress bar by setting loading to false
  }, 800); // Adjust the delay as needed
}

  clearSearch(): void {
    this.searchTerm = '';
    this.filterLocations();
  }
  
  onPageIndexChange(page: number) {
    this.currentPage = page;
    this.paginateLocations();
    this.clearAllMarkers();
    this.addMarkers();
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1;
    this.paginateLocations();
    this.clearAllMarkers();
    this.addMarkers();
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

        this.map.setCenter(this.originMarker?.getPosition() as google.maps.LatLng);

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
          this.markerLocationMap.set(marker, location);

          const infoWindow = new google.maps.InfoWindow({
            content: `<h4>${location.storeName}</h4><p>${location.address}</p><p>${location.phoneNumber}</p><p>Distance: ${location.distance}</p><p>Duration: ${location.duration}</p>`
          });

          marker.addListener('click', () => {
            this.ngZone.run(() => {
              infoWindow.open(this.map, marker);
              this.onMarkerClick(marker);
            });
          });
        } else {
          console.error('Geocode failed: ' + status);
        }
      });
    });
  }

  onMarkerClick(marker: google.maps.Marker): void {
    const location = this.markerLocationMap.get(marker);
    console.log('location of marker click', location);
    if (location) {
      this.highlightCard(location);
    }
  }


  highlightCard(location: any): void {
    const highlightedIndex = this.filteredLocations.findIndex(loc => loc.address === location.address);

    if (highlightedIndex !== -1) {
      const cardIndex = highlightedIndex % this.pageSize;

      this.selectedLocationIndex = cardIndex;

      const cardElement = document.querySelector(`.location-card-${cardIndex}`);
      cardElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      console.error('Location not found in filteredLocations');
    }
  }

toggleSelection(location: any, index: number): void {
  const globalIndex = (this.currentPage - 1) * this.pageSize + index;

  if (this.selectedLocationIndices.has(globalIndex)) {
    this.selectedLocationIndices.delete(globalIndex);
    this.allSelectedLocations = this.allSelectedLocations.filter(
      loc => loc.address !== location.address
    );
  } else {
    this.selectedLocationIndices.add(globalIndex);
    this.allSelectedLocations.push(location);
  }
}

  clearAllSelections(): void {
    this.selectedLocationIndices.clear();
    this.allSelectedLocations = [];
  }

  getMinValue(a: number, b: number): number {
  return Math.min(a, b);
  }
  
  formatDone = (): string => 'Done';

submitSelections(): void {
  const origin = this.locationService.getOrigin();
  if (!origin) {
    alert('Origin is not set. Please provide a starting location.');
    return;
  }

    if (this.allSelectedLocations.length > 0) {
      const selectedAddresses = this.allSelectedLocations.map(loc => loc.address);
      const requestBody = {
        origin: origin,
        locations: selectedAddresses
      };
      console.log('requestbody', requestBody);

      this.modal.confirm({
        nzTitle: 'Confirm Route Generation',
        nzContent: `You have selected ${this.allSelectedLocations.length} locations. Do you want to generate the route?`,
        nzOkText: 'Yes',
        nzCancelText: 'No',
        nzOkLoading: this.loading,
        nzOnOk: () => {
          this.loading = true;
          this.progress = 0;

          // Simulate progress over 5-6 seconds
          const intervalTime = 5000 / 100; // Total time divided by 100 percent
          const increment = 2;
          const interval = setInterval(() => {
            if (this.progress < 100) {
              this.progress += increment;
            } else {
              clearInterval(interval);
            }
          }, intervalTime);
          this.tripPlannerService.generateRouteAndMetrics(requestBody).subscribe(
            (response: any) => {
              this.routeDataService.setRouteInfo(response);
              this.loading = false;
              this.progress = 100;
              clearInterval(interval);
              this.router.navigate(['/route-info']);
            },
            (error: any) => {
              this.loading = false;
              this.progress = 0;
              console.error('Error generating route:', error);
              alert('Failed to generate the route. Please try again.');
            }
          );

          return new Promise((resolve) => setTimeout(resolve, 0));
        },
        nzOnCancel: () => {
          console.log('User canceled the route generation.');
        }
      });
    } else {
      alert('Please select at least one location before submitting.');
    }
  }

  clearAllMarkers(): void {
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];
  }

}
