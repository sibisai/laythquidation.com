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

  constructor(
    private tripPlannerService: TripPlannerService,
    private ngZone: NgZone,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadGoogleMapsScript().then(() => {
      this.initMap();
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
      center: this.userLocation,
      zoom: 4, // Zoom out to show the entire USA
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
        this.originControl.setValue(place.formatted_address);

        this.showProceedButton = true;

        console.log('Selected address:', place.formatted_address);
      });
    });
  }

  useCurrentLocation() {
  if (navigator.geolocation) {
    this.loading = true;
    navigator.geolocation.getCurrentPosition(position => {
      this.ngZone.run(() => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const geocoder = new google.maps.Geocoder();
        const latLng = new google.maps.LatLng(lat, lng);

        geocoder.geocode({ 'location': latLng }, (results: google.maps.GeocoderResult[], status: google.maps.GeocoderStatus) => {
          if (status === google.maps.GeocoderStatus.OK && results[0]) {
            const address = results[0].formatted_address;
            this.originControl.setValue(address);
            this.map.setCenter(latLng);
            this.map.setZoom(17);
            this.showProceedButton = true;
            console.log('Current location address:', address);
          } else {
            window.alert('Geocoder failed due to: ' + status);
          }
          this.loading = false;
        });
      });
    }, () => {
      this.loading = false;
      window.alert('Geolocation failed or permission denied.');
    });
  } else {
    window.alert("Geolocation is not supported by this browser.");
  }
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