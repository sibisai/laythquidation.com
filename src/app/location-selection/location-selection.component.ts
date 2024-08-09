import { Component, OnInit, NgZone } from '@angular/core';
import { Router } from '@angular/router';

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
  origin: string = '';
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

  constructor(private router: Router, private ngZone: NgZone) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.locations = navigation.extras.state['stores'];
      this.filteredLocations = [...this.locations];
      this.totalLocations = this.filteredLocations.length;
      this.paginateLocations();
      this.origin = navigation.extras.state['start'];
    }
  }

  ngOnInit(): void {
    this.loadGoogleMapsScript().then(() => {
      this.initMap();
      this.addOriginMarker();
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

  addOriginMarker() {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: this.origin }, (results: any, status: any) => {
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
              content: `<h4>Origin Location</h4><p>${this.origin}</p>`
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

  // Find the index of the location within the filtered locations
  // const markerIndex = this.paginatedLocations.findIndex(loc => loc.address === location.address);

  // if (markerIndex !== -1 && this.markers[markerIndex]) {
    // Zoom in on the map to the marker's location
    // this.map.setZoom(10); // Set the zoom level to a closer view

    // Highlight the card but don't select it
    this.highlightCard(location);
}

highlightCard(location: any): void {
    const highlightedIndex = this.paginatedLocations.findIndex(loc => loc.address === location.address);

    if (highlightedIndex !== -1) {
        const cardIndex = highlightedIndex % this.pageSize;

        this.selectedLocationIndex = cardIndex;

        const cardElement = document.querySelector(`.location-card-${cardIndex}`);
        cardElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // No map zoom or centering actions here
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
    this.router.navigate(['/route-info'], {
    state: {
    selectedLocations: this.filteredLocations.filter((loc, index) => this.selectedLocationIndices.has(index)),
    origin: this.origin
  }
  });
  } else {
    alert('Please select at least one location before submitting.');
  }
  }
}