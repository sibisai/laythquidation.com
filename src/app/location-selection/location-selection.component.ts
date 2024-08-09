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
  markers: google.maps.Marker[] = [];
  selectedMarker: google.maps.Marker | null = null;
  originMarker: google.maps.Marker | null = null;

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
      this.addOriginMarker();
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

  addOriginMarker() {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: this.origin }, (results: any, status: any) => {
      if (status === google.maps.GeocoderStatus.OK) {
        this.originMarker = new google.maps.Marker({
          map: this.map,
          position: results[0].geometry.location,
          title: 'Origin Location',
          label: {
            text: "O", // Label for the origin (e.g., "O" for Origin)
            color: 'white',
            fontWeight: 'bold',
            fontSize: '16px' // Increase the font size for better readability
          }
        });

        this.map.setCenter(this.originMarker?.getPosition() as google.maps.LatLng);

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
    this.locations.forEach((location, index) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: location.address }, (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK) {
          const marker = new google.maps.Marker({
            map: this.map,
            position: results[0].geometry.location,
            title: location.storeName,
            label: {
              text: `${index + 1}`, // Label with the entry number corresponding to the card
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

    // Find the marker corresponding to the selected location
    const selectedMarkerIndex = this.locations.findIndex(loc => loc.address === location.address);
    const selectedMarker = this.markers[selectedMarkerIndex];

    if (this.selectedMarker) {
      // Reset the previously selected marker to its default state
      this.selectedMarker.setLabel({
        text: `${selectedMarkerIndex + 1}`, // Reset to the original label
        color: 'white',
        fontWeight: 'bold',
        fontSize: '16px'
      });
    }

    // Highlight the selected marker
    this.selectedMarker = selectedMarker;
    this.map.setCenter(selectedMarker.getPosition() as google.maps.LatLng);
  }
}