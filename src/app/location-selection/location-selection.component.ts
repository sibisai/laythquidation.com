import { Component, OnInit, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TripPlannerService } from '../services/trip-planner.service';
import { RouteDataService } from '../services/route-data.service';
import { LocationService } from '../services/location.service';
import { SelectionService } from '../services/selection.service';
import { debounce } from 'lodash';
declare var google: any;

interface Location {
  address: string;
  storeName: string;
  phoneNumber?: string;
  distance?: number;
  duration?: string;
}

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
  totalLocations = 0;
  maxRadius: number = 3000;
  selectedRadius: number = 100;
  selectedLocationIndex: number | null = null;

  constructor(
    private router: Router,
    private ngZone: NgZone,
    private modal: NzModalService,
    private tripPlannerService: TripPlannerService,
    private routeDataService: RouteDataService,
    private locationService: LocationService,
    private selectionService: SelectionService
) {
    this.filterLocations = debounce(this.filterLocations.bind(this), 300);
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.locations = navigation.extras.state['stores'];
      this.filteredLocations = [...this.locations];
      console.log('Filtered Locations:', this.filteredLocations);
      this.totalLocations = this.filteredLocations.length;
      this.allSelectedLocations = Array.from(this.selectionService.getSelectedLocations());
      console.log('locations initialized:', this.locations);
    }
  }

ngOnInit(): void {
  console.log('ngOnInit triggered');
  this.loadGoogleMapsScript().then(() => {
    this.initMap();
    const origin = this.locationService.getOrigin();
    if (origin) {
      this.addOriginMarker(origin);
    }
    this.addMarkers();
  });
  console.log('Initial filteredLocations:', this.filteredLocations);
}

  get selectedLocationsCount(): number {
    return this.allSelectedLocations.length;
  }

  get selectedLocationIndices(): Set<string> {
    return this.selectionService.getSelectedLocations();
  }

filterLocations(): void {
    setTimeout(() => {
        // **Log the current selections before filtering**
        console.log('Before filtering, selected locations:', this.allSelectedLocations);

        // Filter by search term first
        const filteredBySearch = this.searchTerm.trim() === ''
            ? [...this.locations]
            : this.locations.filter(location =>
                location.storeName.toLowerCase().includes(this.searchTerm.toLowerCase())
            );

        // Then filter by radius using the selectedRadius value
        this.filteredLocations = filteredBySearch.filter(location =>
            parseFloat(location.distance) <= this.selectedRadius
        );

        // **Update total locations count**
        this.totalLocations = this.filteredLocations.length;
        console.log('Filtered Locations:', this.filteredLocations.length); // Debugging: Check the number of filtered locations

        // **Sync selection state after filtering**
        this.syncSelectionState(); // Ensure selection state is consistent

        this.clearAllMarkers();
        this.addMarkers();
        this.loading = false;

        // **Log the selections after filtering to check if they were cleared**
        console.log('After filtering, selected locations:', this.allSelectedLocations);
    }, 500);
}
  
syncSelectionState(): void {
    // Ensure the selectedLocationIndices reflects the selection state across all locations
    const newSelectedIndices = new Set<string>(); // Assuming address is a string

    this.filteredLocations.forEach((location) => {
        if (this.selectedLocationIndices.has(location.address)) {
            newSelectedIndices.add(location.address);
        }
    });

    // **Log the current selection state before clearing and updating**
    console.log('Before sync, selectedLocationIndices:', this.selectedLocationIndices);
    console.log('Before sync, newSelectedIndices:', newSelectedIndices);

    // **Update the selection indices**
    this.selectedLocationIndices.clear();
    newSelectedIndices.forEach(id => this.selectedLocationIndices.add(id));

    // **Log the updated selection state to verify it remains consistent**
    console.log('After sync, selectedLocationIndices:', this.selectedLocationIndices);

    // Update the visual selection state
    this.updateSelectedLocations();
}
updateSelectedLocations(): void {
    // **Log before updating selected locations**
    console.log('Before updating, allSelectedLocations:', this.allSelectedLocations);

    // Update the allSelectedLocations array to ensure it matches the selectedLocationIndices set
    this.allSelectedLocations = this.locations.filter(location => this.selectedLocationIndices.has(location.address));

    // **Log after updating to ensure selections are maintained**
    console.log('After updating, allSelectedLocations:', this.allSelectedLocations);
}

// Method to clear the search and reset the filtered locations
clearSearch(): void {
    this.searchTerm = '';
    this.filterLocations(); 
    this.updateSelectedLocations(); // Ensure the visual state is consistent with the actual selected locations
}

// Method to handle location radius change and re-filter locations
filterLocationsByRadius(): void {
    this.filterLocations(); // Use the existing filter logic with the updated radius
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
  this.filteredLocations.forEach((location: any, index: number) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: location.address }, (results: any, status: any) => {
      if (status === google.maps.GeocoderStatus.OK) {
        const marker = new google.maps.Marker({
          map: this.map,
          position: results[0].geometry.location,
          title: location.storeName,
          label: {
            text: `${index + 1}`,
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
    this.selectedLocationIndex = highlightedIndex;

    const cardElement = document.querySelector(`.location-card-${highlightedIndex}`);
    cardElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    console.error('Location not found in filteredLocations');
  }
}

toggleSelection(location: any): void {
    const locationId = location.address; // Use a unique identifier

    if (this.selectedLocationIndices.has(locationId)) {
        // If the location is already selected, remove it from both selectedLocationIndices and allSelectedLocations
        this.selectedLocationIndices.delete(locationId);
        this.allSelectedLocations = this.allSelectedLocations.filter(
            loc => loc.address !== location.address
        );
    } else {
        // If the location is not selected, add it to both selectedLocationIndices and allSelectedLocations
        this.selectedLocationIndices.add(locationId);
        this.allSelectedLocations.push(location);
    }

    // **Log the state after toggling a selection**
    console.log('After toggling selection, selectedLocationIndices:', this.selectedLocationIndices);
    console.log('After toggling selection, allSelectedLocations:', this.allSelectedLocations);

    this.updateSelectedLocations(); // Ensure that the allSelectedLocations is consistent with the selectedLocationIndices
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
