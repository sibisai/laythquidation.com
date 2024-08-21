import { Component, OnInit, NgZone, ViewChild, ElementRef } from '@angular/core';
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
@ViewChild('locationContainer', { static: true }) locationContainer!: ElementRef;
  locations: any[] = [];
  filteredLocations: any[] = [];
  allSelectedLocations: any[] = [];
  map!: google.maps.Map;
  markers: any[] = [];
  selectedMarker: google.maps.Marker | null = null;
  originMarker: google.maps.Marker | null = null;
  radiusCircle: google.maps.Circle | null = null;
  markerLocationMap: Map<any, any> = new Map(); 
  searchTerm: string = '';
  loading = false;
  searchLoading = false;
  progressInterval: any;
  progress = 0;
  totalLocations = 0;
  maxRadius: number = 3000;
  selectedRadius: number = 25;
  selectedLocationIndex: number | null = null;
  AdvancedMarkerElement: any;
  PinElement: any;
  activePanelIndex: number | null = null;
  panelStyles: { [key: number]: { 'background-color': string } } = {};
  infoWindows: Map<any, google.maps.InfoWindow> = new Map();

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
  if (navigation?.extras.state && Array.isArray(navigation.extras.state['stores'])) {
    this.locations = navigation.extras.state['stores'];
  }

  // Initialize filteredLocations and other related properties
  this.filteredLocations = [...this.locations];
  this.totalLocations = this.filteredLocations.length;
  this.allSelectedLocations = Array.from(this.selectionService.getSelectedLocations());
}

async ngOnInit(): Promise<void> {
  await this.loadGoogleMapsScript();
  const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");
  this.AdvancedMarkerElement = AdvancedMarkerElement;
  this.PinElement = PinElement;
  this.initMap();
  const origin = this.locationService.getOrigin();
  if (origin) {
    this.addOriginMarker(origin);
  }
  this.addMarkers(); 
  this.filterLocations(); 
  this.filterLocationsByRadius(); 

  this.locationContainer.nativeElement.addEventListener('scroll', this.toggleTopButton.bind(this));
}
  get selectedLocationsCount(): number {
    return this.allSelectedLocations.length;
  }

  get selectedLocationIndices(): Set<string> {
    return this.selectionService.getSelectedLocations();
  }

scrollToTop(): void {
    this.locationContainer.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleTopButton(): void {
    const button = document.getElementById('back-to-up');
    if (this.locationContainer.nativeElement.scrollTop > 20) { // Show button after scrolling down 20px
      if (button) {
        button.classList.remove('d-none');
      }
    } else {
      if (button) {
        button.classList.add('d-none');
      }
    }
  }

filterLocations(): void {
  this.searchLoading = true;
  setTimeout(() => {
    const filteredBySearch = this.searchTerm.trim() === ''
        ? [...this.locations]
        : this.locations.filter(location =>
            location.storeName.toLowerCase().includes(this.searchTerm.toLowerCase())
          );
    this.filteredLocations = filteredBySearch.filter(location =>
        parseFloat(location.distance) <= this.selectedRadius
    );
    this.totalLocations = this.filteredLocations.length;
    this.syncSelectionState();
    this.clearAllMarkers();
    this.addMarkers();
    this.searchLoading = false;
  }, 500);
}
  
  syncSelectionState(): void {
    // New set to keep track of selected locations that still exist in the full list
    const retainedSelections = new Set<string>();

    // Loop through all locations, not just filtered ones, to retain selection state
    this.locations.forEach(location => {
        if (this.selectedLocationIndices.has(location.address)) {
            retainedSelections.add(location.address);
        }
    });

    // Update the selected indices with the retained selections
    this.selectedLocationIndices.clear();
    retainedSelections.forEach(id => this.selectedLocationIndices.add(id));

    // Now update the allSelectedLocations to match the current retained selections
    this.updateSelectedLocations();

}

updateSelectedLocations(): void {
    // Update the allSelectedLocations array to ensure it matches the selectedLocationIndices set
    this.allSelectedLocations = this.locations.filter(location => this.selectedLocationIndices.has(location.address));
}

// Method to clear the search and reset the filtered locations
clearSearch(): void {
    this.searchTerm = '';
    this.filterLocations(); 
    this.updateSelectedLocations();
}

filterLocationsByRadius(): void {
  this.filterLocations();
  this.updateRadiusCircle();
  this.adjustMapZoom();
}

adjustMapZoom(): void {
    if (this.map && this.radiusCircle) {
        const bounds = this.radiusCircle.getBounds(); // Get the bounds of the circle
        if (bounds) {
            this.map.fitBounds(bounds); // Adjust the map zoom and center to fit the circle within the map view
        }
    }
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
    mapId: 'DEMO_MAP_ID',
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

  // Initialize the radius circle
  this.radiusCircle = new google.maps.Circle({
    map: this.map,
    radius: this.selectedRadius * 1609.34, // Convert miles to meters
    fillColor: '#0000FF',
    fillOpacity: 0.2,
    strokeColor: '#0000FF',
    strokeOpacity: 0.8,
    strokeWeight: 2,
    clickable: false
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
          },
          zIndex: 9999
        });
        
        this.radiusCircle?.setCenter(this.originMarker?.getPosition() as google.maps.LatLng); // <-- Add this line
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

    // Method to update the radius circle
  updateRadiusCircle(): void {
    if (this.radiusCircle) {
      this.radiusCircle.setRadius(this.selectedRadius * 1609.34); // Convert miles to meters
    }
  }

addMarkers(): void {
  const batchSize = 100; // Number of markers to add per batch
  const delay = 100; // Milliseconds between each batch

  let batchStart = 0;

  const addBatch = () => {
    const batchEnd = Math.min(batchStart + batchSize, this.filteredLocations.length);
    for (let i = batchStart; i < batchEnd; i++) {
      const location = this.filteredLocations[i];
      this.addSingleMarker(location, i);
    }
    batchStart = batchEnd;

    if (batchStart < this.filteredLocations.length) {
      setTimeout(addBatch, delay); // Schedule the next batch
    }
  };

  addBatch(); // Start the batching process
}
addSingleMarker(location: any, index: number): void {
  const { AdvancedMarkerElement, PinElement } = this; 
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: location.address }, (results: any, status: any) => {
    if (status === google.maps.GeocoderStatus.OK) {
      const pin = new PinElement({
        background: this.selectedLocationIndices.has(location.address) ? '#0000FF' : '#FF0000', // Blue if selected, red if not
        glyph: `${index + 1}`,
        glyphColor: 'white',
        borderColor: 'white'
      });

      const marker = new AdvancedMarkerElement({
        map: this.map,
        position: results[0].geometry.location,
        title: location.storeName,
        content: pin.element
      });

      this.markers.push(marker);
      this.markerLocationMap.set(marker, location);

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333; padding: 10px; border-radius: 5px; background-color: #f9f9f9; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);">
            <h4 style="margin: 0; font-size: 16px; color: #007BFF;">${location.storeName}</h4>
            <div style="margin-top: 5px;">
              <strong>Address:</strong> ${location.address}
            </div>
            <div style="margin-top: 5px;">
              <strong>Phone:</strong> ${location.phoneNumber ? location.phoneNumber : 'N/A'}
            </div>
            <div style="margin-top: 5px;">
              <strong>Distance:</strong> ${location.distance ? location.distance : 'N/A'}
            </div>
            <div style="margin-top: 5px;">
              <strong>Duration:</strong> ${location.duration ? location.duration : 'N/A'}
            </div>
          </div>
        `
      });

      // Store the infoWindow reference
      this.infoWindows.set(marker, infoWindow);

      marker.addListener('gmp-click', () => {
        this.ngZone.run(() => {
          // Set the active panel index
          const panelIndex = this.filteredLocations.findIndex(loc => loc.address === location.address);
          this.togglePanel(panelIndex);  // This will update the panel styles accordingly

          // Scroll to the corresponding accordion item
          const accordionItem = document.getElementById(`accordion-item-${panelIndex}`);
          if (accordionItem) {
            accordionItem.scrollIntoView({ behavior: 'smooth' });
          }

          // Show the info window only when a marker is selected
          const infoWindow = this.infoWindows.get(marker);
          if (infoWindow) {
            infoWindow.open(this.map, marker);
          }
        });
      });
    } else {
      console.error('Geocode failed: ' + status);
    }
  });
}
  
updateMarkerIcon(marker: any, isSelected: boolean): void {
  if (marker.content) {
    // Get the original location's index or number (glyph)
    const location = this.markerLocationMap.get(marker);
    const glyph = this.filteredLocations.findIndex(loc => loc.address === location.address) + 1;

    // Create a new PinElement with the correct glyph
    const pin = new this.PinElement({
      background: isSelected ? '#0000FF' : '#FF0000', // Blue if selected, red if not
      glyphColor: 'white',
      borderColor: 'white',
      glyph: glyph.toString() // Set the correct number on the marker
    });

    // Update the marker's content with the new PinElement
    marker.content = pin.element;
  } else {
    console.error('Marker content is null or undefined');
  }
}
  
togglePanel(panelIndex: number): void {
  const isActive = this.activePanelIndex === panelIndex;
  this.activePanelIndex = isActive ? null : panelIndex;
  this.updatePanelStyles(panelIndex, !isActive);
}

updatePanelStyles(panelIndex: number, isActive: boolean): void {
  // Reset the styles for the previously active panel
  if (this.activePanelIndex !== null && this.activePanelIndex !== panelIndex) {
    this.panelStyles[this.activePanelIndex] = { 'background-color': 'transparent' };
  }

  // Update the styles for the current panel
  this.panelStyles[panelIndex] = { 'background-color': isActive ? '#d0e8ff' : 'transparent' };
}

onPanelChange(index: number, active: boolean): void {
  this.updatePanelStyles(index, active);

  // If the panel was just closed, reset the active panel index
  if (!active) {
    this.activePanelIndex = null;
  } else {
    this.activePanelIndex = index;
  }
}
isPanelActive(index: number): boolean {
  return this.activePanelIndex === index;
}

toggleSelection(location: any): void {
  const locationId = location.address;
  const marker = this.markers.find(m => this.markerLocationMap.get(m)?.address === locationId);
  const infoWindow = this.infoWindows.get(marker);

  if (this.selectedLocationIndices.has(locationId)) {
    this.selectedLocationIndices.delete(locationId);
    this.allSelectedLocations = this.allSelectedLocations.filter(loc => loc.address !== location.address);
    if (marker) {
      this.updateMarkerIcon(marker, false);
      // if (infoWindow) {
      //   infoWindow.close(); // Close the info window when unselected
      // }
    }
  } else {
    this.selectedLocationIndices.add(locationId);
    this.allSelectedLocations.push(location);
    if (marker) {
      this.updateMarkerIcon(marker, true);
      // if (infoWindow) {
      //   infoWindow.open(this.map, marker); // Open the info window when selected
      // }
    }
  }

  this.updateSelectedLocations();
}
clearAllSelections(): void {
  // Clear all selected locations
  this.selectedLocationIndices.clear();
  this.allSelectedLocations = [];

  // Close all info windows
  this.infoWindows.forEach((infoWindow) => {
    infoWindow.close();
  });

  // Reset all markers to unselected state
  this.markers.forEach(marker => {
    this.updateMarkerIcon(marker, false); // Pass false to indicate unselected state
  });
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

      // Temporarily filter the locations to only show selected ones
      const originalFilteredLocations = [...this.filteredLocations];
      this.filteredLocations = this.filteredLocations.filter(location =>
        this.selectedLocationIndices.has(location.address)
      );

      // Update markers to only show selected locations
      this.clearAllMarkers();  // Clear existing markers
      this.addMarkers();  // Re-add markers for filteredLocations

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
          // Restore the original locations and markers if the user cancels
          this.filteredLocations = originalFilteredLocations;
          this.clearAllMarkers();  // Clear existing markers
          this.addMarkers();  // Re-add markers for all locations
          console.log('User canceled the route generation.');
        }
      });
    } else {
      alert('Please select at least one location before submitting.');
    }
  }

  ngOnDestroy(): void {
    // Cleanup the event listener when the component is destroyed
    this.locationContainer.nativeElement.removeEventListener('scroll', this.toggleTopButton.bind(this));
  }
  
  clearAllMarkers(): void {
    this.markers.forEach(marker => {
      marker.map = null; // Remove marker from the map
    });
    this.markers = [];
  }


}
