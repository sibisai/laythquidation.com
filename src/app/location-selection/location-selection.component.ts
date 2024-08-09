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
  origin: string = '';
  map!: google.maps.Map;

  constructor(private router: Router, private ngZone: NgZone) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.locations = navigation.extras.state['stores'];
      this.origin = navigation.extras.state['start'];
    }
  }

  ngOnInit(): void {
    console.log('Locations:', this.locations);
    console.log('Origin:', this.origin);
    this.loadGoogleMapsScript().then(() => {
      this.initMap();
      this.addMarkers();
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
    const mapElement = document.getElementById('map') as HTMLElement;

    this.map = new google.maps.Map(mapElement, {
      center: { lat: 34.0522, lng: -118.2437 }, // Default to Los Angeles, or customize
      zoom: 10,
      mapTypeControl: false
    });
  }

  addMarkers() {
    this.locations.forEach(location => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: location.address }, (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK) {
          const marker = new google.maps.Marker({
            map: this.map,
            position: results[0].geometry.location,
            title: location.storeName
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `<h4>${location.storeName}</h4><p>${location.address}</p><p>${location.phoneNumber}</p><p>Distance: ${location.distance}</p><p>Duration: ${location.duration}</p>`
          });

          marker.addListener('click', () => {
            this.ngZone.run(() => {
              infoWindow.open(this.map, marker);
            });
          });
        } else {
          console.error('Geocode failed: ' + status);
        }
      });
    });
  }

  selectLocation(location: any): void {
    console.log('Selected location:', location);
    // You can implement any logic here when a location is selected.
  }
}