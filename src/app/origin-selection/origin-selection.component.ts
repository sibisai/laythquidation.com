import { Component, OnInit, NgZone } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TripPlannerService } from '../services/trip-planner.service';
import { LocationService } from '../services/location.service';
import { LocationPermissionDialogComponent } from '../location-permission-dialog/location-permission-dialog.component';

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
  locationSet = false; // Flag to check if the location is set
  autocomplete!: google.maps.places.Autocomplete;
  marker!: google.maps.Marker;

  constructor(
    private tripPlannerService: TripPlannerService,
    private ngZone: NgZone,
    private router: Router,
    private modal: NzModalService,
    private locationService: LocationService
  ) {}

  ngOnInit() {
    this.loadGoogleMapsScript().then(() => {
      this.initMap();
      this.checkLocationAccess();
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
      title: 'Your Location',
      icon: {
        url: 'assets/images/current_location.png', // Path to your custom icon
        scaledSize: new google.maps.Size(40, 40), // Size of the icon
        origin: new google.maps.Point(0, 0), // The origin for the image
        anchor: new google.maps.Point(20, 20) // Anchor the image
      }
    });

    this.autocomplete.addListener('place_changed', () => {
      this.ngZone.run(() => {
        const place = this.autocomplete.getPlace();
        console.log('place selected:', place);
        if (!place.geometry || !place.geometry.location) {
          window.alert("No details available for input: '" + place.name + "'");
          return;
        }

        this.map.setCenter(place.geometry.location);
        this.map.setZoom(17);
        this.marker.setPosition(place.geometry.location);
        if (place.formatted_address) {
          this.originControl.setValue(place.formatted_address);
          this.locationService.setOrigin(place.formatted_address); // Set origin in LocationService
          // Show the proceed button when an address is selected
          this.showProceedButton = true;
          this.locationSet = true; // Set the locationSet flag to true
          // Log the selected address
          console.log('Selected address:', place.formatted_address);
        } else {
          console.error('No formatted address available');
        }
      });
    });
  }

  checkLocationAccess() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          this.locationAccessGranted = true; // Set flag to true if location access is granted
          this.userLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
          this.map.setCenter(this.userLocation);
          this.marker.setPosition(this.userLocation);
          this.map.setZoom(17);
        },
        () => {
          this.ngZone.run(() => {
            this.map.setCenter(this.userLocation);
            this.map.setZoom(3.5); // Set initial zoom level
          });
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
      this.map.setCenter(this.userLocation);
      this.map.setZoom(3.5); // Set initial zoom level
    }
  }

  useCurrentLocation() {
    this.loading = true;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          this.locationAccessGranted = true;
          this.setUserLocation(position.coords.latitude, position.coords.longitude);
        },
        () => {
          this.openLocationPermissionDialog();
        }
      );
    } else {
      this.openLocationPermissionDialog();
    }
  }

  setUserLocation(lat: number, lng: number) {
    const latLng = new google.maps.LatLng(lat, lng);
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ 'location': latLng }, (results: google.maps.GeocoderResult[], status: google.maps.GeocoderStatus) => {
      this.ngZone.run(() => {
        if (status === google.maps.GeocoderStatus.OK && results[0]) {
          const formattedAddress = results[0].formatted_address;
          this.originControl.setValue(formattedAddress);
          this.locationService.setOrigin(formattedAddress); // Set origin in LocationService
          this.map.setCenter(latLng);
          this.map.setZoom(17);
          this.marker.setPosition(latLng);

          // Update the autocomplete input value directly
          (document.getElementById('location-input') as HTMLInputElement).value = formattedAddress;
          
          // Show the proceed button
          this.showProceedButton = true;
          this.locationSet = true; // Set the locationSet flag to true
        } else {
          window.alert('Geocoder failed due to: ' + status);
        }
        this.loading = false;
      });
    });
  }

  clearCurrentLocation() {
    this.originControl.setValue('');
    (document.getElementById('location-input') as HTMLInputElement).value = '';
    this.showProceedButton = false;
    this.locationSet = false;
    this.locationService.clearOrigin(); // Clear origin in LocationService
    this.map.setCenter(new google.maps.LatLng(37.0902, -95.7129)); // Reset to default center
    this.map.setZoom(3.5); // Reset to default zoom level
    this.marker.setPosition(new google.maps.LatLng(37.0902, -95.7129));
  }

  openLocationPermissionDialog(): void {
    const modal = this.modal.create({
      nzTitle: 'Location Access Required',
      nzContent: LocationPermissionDialogComponent,
      nzCentered: true,
      nzFooter: null
    });

    modal.afterClose.subscribe(result => {
      if (result) {
        // If the dialog closed with result true, it means user chose to proceed
        this.setUserLocation(34.0522, -118.2437); // Los Angeles coordinates
      }
    });
  }

  proceedToStores() {
    const start = this.originControl.value;
    if (start) {
      this.modal.confirm({
        nzTitle: 'Proceed with this origin location?',
        nzContent: `You have selected "${start}" as your origin. Do you want to continue?`,
        nzOkText: 'Yes',
        nzCancelText: 'No',
        nzOnOk: () => {
          this.loading = true;
          this.tripPlannerService.calculateDistance({ origin: start }).subscribe(
            response => {
              this.router.navigate(['/select-locations'], { state: { stores: response.top25Closest, start } });
              this.loading = false;
            },
            error => {
              console.error('Error calculating distances:', error);
              this.loading = false;
            }
          );
        },
        nzOnCancel: () => {
          // If the user cancels, nothing happens
          console.log('User canceled proceeding to store selection.');
        }
      });
    } else {
      window.alert('Please enter a valid origin address.');
    }
  }
}