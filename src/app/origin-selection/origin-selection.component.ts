import { Component, OnInit, NgZone } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { TripPlannerService } from '../trip-planner.service';

declare var google: any;

@Component({
  selector: 'app-origin-selection',
  templateUrl: './origin-selection.component.html',
  styleUrls: ['./origin-selection.component.css']
})
export class OriginSelectionComponent implements OnInit {
  originControl = new FormControl('');
  map!: google.maps.Map;
  userLocation: google.maps.LatLng = new google.maps.LatLng(37.0902, -95.7129); // Default to center of USA
  loading = false;
  showProceedButton = false;
  locationAccessGranted = false; // Flag to check if location access is granted
  autocomplete!: google.maps.places.Autocomplete;
  marker!: google.maps.Marker;

  constructor(
    private tripPlannerService: TripPlannerService,
    private ngZone: NgZone,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadGoogleMapsScript().then(() => {
      this.initMap();
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          position => {
            this.locationAccessGranted = true; // Set flag to true if location access is granted
            this.userLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            this.map.setCenter(this.userLocation);
            this.marker.setPosition(this.userLocation);
            this.map.setZoom(9)
          },
          () => {
            console.error("Location access denied. Allow location access to use current location.");
            this.map.setCenter(this.userLocation);
            this.map.setZoom(3.5); // Set initial zoom level
          }
        );
      } else {
        console.error("Geolocation is not supported by this browser.");
        this.map.setCenter(this.userLocation);
        this.map.setZoom(3.5); // Set initial zoom level
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
    this.autocomplete = new google.maps.places.Autocomplete(input);
    const mapElement = document.getElementById('map') as HTMLElement;

    this.map = new google.maps.Map(mapElement, {
      center: this.userLocation,
      zoom: 3.5,
      mapTypeControl: false
    });

    this.marker = new google.maps.Marker({
      map: this.map,
      position: this.userLocation,
      title: 'Your Location'
    });

    this.autocomplete.addListener('place_changed', () => {
      this.ngZone.run(() => {
        const place = this.autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) {
          window.alert("No details available for input: '" + place.name + "'");
          return;
        }

        this.map.setCenter(place.geometry.location);
        this.map.setZoom(17);
        this.marker.setPosition(place.geometry.location);
        if (place.formatted_address) {
          this.originControl.setValue(place.formatted_address);
          // Show the proceed button when an address is selected
          this.showProceedButton = true;
          // Log the selected address
          console.log('Selected address:', place.formatted_address);
        } else {
          console.error('No formatted address available');
        }
      });
    });
  }

  useCurrentLocation() {
    if (!navigator.geolocation) {
      window.alert("Geolocation is not supported by this browser.");
      return;
    }

    this.loading = true;
    navigator.geolocation.getCurrentPosition(
      position => {
        this.ngZone.run(() => {
          this.userLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ 'location': this.userLocation }, (results: google.maps.GeocoderResult[], status: google.maps.GeocoderStatus) => {
            if (status === google.maps.GeocoderStatus.OK && results[0]) {
              const formattedAddress = results[0].formatted_address;
              this.originControl.setValue(formattedAddress);
              this.map.setCenter(this.userLocation);
              this.map.setZoom(17);
              this.marker.setPosition(this.userLocation);

              // Update the autocomplete input value directly
              (document.getElementById('location-input') as HTMLInputElement).value = formattedAddress;

              // Show the proceed button
              this.showProceedButton = true;
            } else {
              window.alert('Geocoder failed due to: ' + status);
            }
            this.loading = false;
          });
        });
      },
      () => {
        this.ngZone.run(() => {
          window.alert("Location access denied. Allow location access to use current location.");
          this.loading = false;
        });
      }
    );
  }

  proceedToStores() {
    const origin = this.originControl.value;
    if (origin) {
      console.log('Address sent to endpoint:', origin);
      this.loading = true;
      this.tripPlannerService.calculateDistance(origin).subscribe(
        response => {
          this.router.navigate(['/location-selection'], { state: { stores: response.top25Closest, origin } });
          this.loading = false;
        },
        error => {
          console.error('Error calculating distances:', error);
          this.loading = false;
        }
      );
    } else {
      window.alert('Please enter a valid origin address.');
    }
  }
}