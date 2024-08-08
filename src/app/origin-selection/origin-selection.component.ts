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
  userLocation!: google.maps.LatLng;
  loading = false;

  constructor(
    private tripPlannerService: TripPlannerService,
    private ngZone: NgZone,
    private router: Router
  ) {}

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
        this.originControl.setValue(place.formatted_address);
      });
    });
  }

  proceedToStores() {
    const origin = this.originControl.value;
    if (origin) {
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