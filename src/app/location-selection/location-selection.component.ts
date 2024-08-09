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
  paginatedLocations: any[] = []; // Locations to display on the current page
  origin: string = '';
  map!: google.maps.Map;
  markers: google.maps.Marker[] = [];
  selectedMarker: google.maps.Marker | null = null;
  originMarker: google.maps.Marker | null = null;
  selectedLocationsCount = 0; // Count of selected locations
  selectedLocationIndices: Set<number> = new Set<number>(); // Track selected locations by index
  searchTerm: string = ''; // For search input
  loading = false; // Loading state for the nz-switch
  currentPage = 1; // Current page index
  pageSize = 10; // Default page size
  totalLocations = 0; // Total number of locations
  selectedLocationIndex: number | null = null; // Index of the selected location

  getMinValue(a: number, b: number): number {
    return Math.min(a, b);
  }

  constructor(private router: Router, private ngZone: NgZone) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.locations = navigation.extras.state['stores'];
      this.filteredLocations = [...this.locations]; // Initialize filtered locations
      this.totalLocations = this.filteredLocations.length;
      this.paginateLocations();
      this.origin = navigation.extras.state['start'];
    }
  }

  ngOnInit(): void {
    console.log('Locations:', this.locations);
    console.log('Origin:', this.origin);
    this.loadGoogleMapsScript().then(() => {
      this.initMap();
      this.addOriginMarker();
      this.addMarkers();
    });
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
      this.currentPage = 1; // Reset to the first page after filtering
      this.paginateLocations();
      this.clearAllMarkers();
      this.addMarkers();
      this.loading = false;
    }, 500);
  }

  onPageIndexChange(page: number) {
    this.currentPage = page;
    this.paginateLocations();
    this.clearAllMarkers();
    this.addMarkers();
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1; // Reset to the first page after changing page size
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
      center: { lat: 34.0522, lng: -118.2437 }, // Default to Los Angeles, or customize
      zoom: 10,
      mapTypeControl: false,
      zoomControlOptions: {
        position: google.maps.ControlPosition.LEFT_TOP // Move zoom controls
      },
      fullscreenControlOptions: {
        position: google.maps.ControlPosition.LEFT_TOP // Move fullscreen control
      },
      streetViewControlOptions: {
        position: google.maps.ControlPosition.LEFT_TOP // Move street view control
      },
      mapTypeControlOptions: {
        position: google.maps.ControlPosition.LEFT_TOP // Move map type control
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
          url: 'assets/images/current_location.png', // Path to your custom icon
          scaledSize: new google.maps.Size(40, 40), // Size of the icon
          origin: new google.maps.Point(0, 0), // The origin for the image
          anchor: new google.maps.Point(20, 20) // Anchor the image at the center
        }
      });

      const center = this.originMarker?.getPosition() as google.maps.LatLng;

      // Shift the map center to the left
      const offsetLng = -0.3; // Adjust this value to shift the map to the left
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
    this.paginatedLocations.forEach((location, index) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: location.address }, (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK) {
          const marker = new google.maps.Marker({
            map: this.map,
            position: results[0].geometry.location,
            title: location.storeName,
            label: {
              text: `${(this.currentPage - 1) * this.pageSize + index + 1}`, // Label with the entry number corresponding to the card
              color: 'white',
              fontWeight: 'bold',
              fontSize: '16px' // Increase the font size for better readability
            }
          });

          this.markers.push(marker);

          const infoWindow = new google.maps.InfoWindow({
            content: `<h4>${location.storeName}</h4><p>${location.address}</p><p>${location.phoneNumber}</p><p>Distance: ${location.distance}</p><p>Duration: ${location.duration}</p>`
          });

          marker.addListener('click', () => {
            this.ngZone.run(() => {
              infoWindow.open(this.map, marker);
              this.onMarkerClick(location); // Only highlight the card
            });
          });
        } else {
          console.error('Geocode failed: ' + status);
        }
      });
    });
  }

  highlightCard(location: any): void {
  // Find the index of the location
  const highlightedIndex = this.filteredLocations.findIndex(loc => loc.address === location.address);

  // Calculate the correct index based on the current page and page size
  const cardIndex = (this.currentPage - 1) * this.pageSize + highlightedIndex;

  // Set the highlighted index to the selectedLocationIndex
  this.selectedLocationIndex = cardIndex;

  // Scroll to the highlighted card
  const cardElement = document.querySelector(`.location-card-${cardIndex}`);
  cardElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

  onMarkerClick(location: any): void {
    console.log('Marker clicked for location:', location);

    // Highlight the card but don't select it
    this.highlightCard(location);
  }

  selectLocation(location: any): void {
    console.log('Selected location:', location);

    // Find the index of the location
    const selectedMarkerIndex = this.filteredLocations.findIndex(loc => loc.address === location.address);

    // Highlight and select the location
    this.highlightCard(location);

    // Mark the location as selected
    this.selectedLocationIndices.add(selectedMarkerIndex);

    // Update the selected locations count
    this.selectedLocationsCount++;
  }

  clearAllSelections(): void {
    this.selectedMarker = null;
    this.selectedLocationsCount = 0;
    this.selectedLocationIndices.clear(); // Clear all selected indices
    this.map.setZoom(10); // Zoom out the map
    this.map.setCenter({ lat: 34.0522, lng: -118.2437 }); // Reset to the original center
    console.log('All selections cleared.');
  }

  clearAllMarkers(): void {
    this.markers.forEach(marker => marker.setMap(null)); // Remove all markers from the map
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