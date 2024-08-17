import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { RouteDataService } from '../services/route-data.service';
import { LocationService } from '../services/location.service';
import { SelectionService } from '../services/selection.service';
import { Location } from '@angular/common';

declare var google: any;

@Component({
  selector: 'app-route-info',
  templateUrl: './route-info.component.html',
  styleUrls: ['./route-info.component.css']
})
export class RouteInfoComponent implements OnInit, AfterViewInit {
  tripInfo: any;
  qrCodeUrl: string = '';
  showQRCode: boolean = false;
  map: google.maps.Map | null = null;

  constructor(
    private router: Router,
    private routeDataService: RouteDataService,
    private locationService: LocationService,
    private selectionService: SelectionService,
    private location: Location
  ) {}

  ngOnInit() {
    this.tripInfo = this.routeDataService.getRouteInfo();
    if (!this.tripInfo) {
      console.error('No trip info found');
      this.router.navigate(['/select-origin']);
      return;
    }

    // Use the QR code URL from the tripInfo
    this.qrCodeUrl = this.tripInfo.qrCodeUrl;
  }

  ngAfterViewInit() {
    this.loadGoogleMapsScript().then(() => {
      this.loadMap();
    }).catch(error => {
      console.error('Error loading Google Maps script:', error);
    });
  }
  ngOnDestroy() {
  // Clean up Google Maps listeners or any other resource
  if (this.map) {
    google.maps.event.clearInstanceListeners(this.map);
    this.map = null;
  }
  }
  
   toggleQRCode() {
    this.showQRCode = !this.showQRCode;
    const mapContainer = document.querySelector('.map-container');
    const qrCodeContainer = document.querySelector('.qr-code-container');

    if (this.showQRCode) {
      // Reveal the QR code with a smooth transition
      mapContainer?.classList.add('map-shrink');
      qrCodeContainer?.classList.add('show');
      this.map?.setZoom(10);
    } else {
      // Hide the QR code first, then expand the map
      qrCodeContainer?.classList.remove('show');
      setTimeout(() => {
        mapContainer?.classList.remove('map-shrink');
        this.map?.setZoom(10);
      }, 500); // Match the transition duration to avoid jumping
    }
  }

  loadMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('Map element not found');
      return;
    }

    const map = new google.maps.Map(mapElement, {
      center: { lat: 34.0522, lng: -118.2437 },
      zoom: 12,
      mapTypeControl: false
    });

    const bounds = new google.maps.LatLngBounds();

    // Decode the polyline data from the tripInfo
    const path = google.maps.geometry.encoding.decodePath(this.tripInfo.polylineData);

    // Define color mapping for traffic conditions
    const speedToColor: Record<'NORMAL' | 'SLOW' | 'TRAFFIC_JAM', string> = {
      "NORMAL": "#0000FF",  // Blue for no traffic
      "SLOW": "#FFFF00",    // Yellow
      "TRAFFIC_JAM": "#FF0000" // Red
    };

    // Create multiple polylines based on the traffic speed segments
    this.tripInfo.travelAdvisory.speedReadingIntervals.forEach((interval: any) => {
      const segmentPath = path.slice(interval.startPolylinePointIndex, interval.endPolylinePointIndex + 1);

      const strokeWeight = interval.speed === "NORMAL" ? 4 : 2;  // Make "NORMAL" traffic thicker

      const polyline = new google.maps.Polyline({
        path: segmentPath,
        strokeColor: speedToColor[interval.speed as keyof typeof speedToColor],
        strokeOpacity: 1.0,
        strokeWeight: strokeWeight
      });

      polyline.setMap(map);

      // Extend the bounds to include this segment of the path
      segmentPath.forEach((point: any) => bounds.extend(point));
    });

  // Add markers for waypoints
  if (this.tripInfo.waypointsForPins && this.tripInfo.waypointsForPins.length) {
    this.tripInfo.waypointsForPins.forEach((waypoint: string, index: number) => {
      const [lat, lng] = waypoint.split(',').map(Number);
      const position = new google.maps.LatLng(lat, lng);

      const marker = new google.maps.Marker({
        position,
        map,
        title: `Waypoint ${index + 1}: ${this.tripInfo.waypointsDurations[index]}`,
        label: {
          text: `${index + 1}`,  // Display the waypoint number
          color: 'white',
          fontSize: '15px'
        }
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `<h4>Waypoint ${index + 1}</h4><p>Duration: ${this.tripInfo.waypointsDurations[index]}</p>`
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      // Extend the bounds to include this waypoint
      bounds.extend(position);
    });
  }

    // Add a marker for the current location from LocationService
    const currentLocation = this.locationService.getOrigin();
    if (typeof currentLocation === 'string') {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: currentLocation }, (results: google.maps.GeocoderResult[], status: google.maps.GeocoderStatus) => {
        if (status === google.maps.GeocoderStatus.OK) {
          const location = results[0].geometry.location;

          const currentMarker = new google.maps.Marker({
            position: location,
            map,
            title: 'Your Current Location',
            icon: {
              url: 'assets/images/current_location.png',
              scaledSize: new google.maps.Size(40, 40),
              origin: new google.maps.Point(0, 0),
              anchor: new google.maps.Point(20, 20)
            }
          });

          const currentLocationInfoWindow = new google.maps.InfoWindow({
            content: `<h4>Your Current Location</h4><p>Latitude: ${location.lat()}</p><p>Longitude: ${location.lng()}</p>`
          });

          currentMarker.addListener('click', () => {
            currentLocationInfoWindow.open(map, currentMarker);
          });

          // Extend the bounds to include the current location
          bounds.extend(location);

          // Adjust the map's bounds after all elements are added
          map.fitBounds(bounds);
        } else {
          console.error('Geocode was not successful for the following reason: ' + status);
        }
      });
    } else if (currentLocation && (currentLocation as any).lat && (currentLocation as any).lng) {
      const currentMarker = new google.maps.Marker({
        position: currentLocation,
        map,
        title: 'Your Current Location',
        icon: {
          url: 'assets/images/current_location.png',
          scaledSize: new google.maps.Size(40, 40),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(20, 20)
        }
      });

      const currentLocationInfoWindow = new google.maps.InfoWindow({
        content: `<h4>Your Current Location</h4><p>Latitude: ${(currentLocation as any).lat}</p><p>Longitude: ${(currentLocation as any).lng}</p>`
      });

      currentMarker.addListener('click', () => {
        currentLocationInfoWindow.open(map, currentMarker);
      });

      // Extend the bounds to include the current location
      bounds.extend(currentLocation);

      // Adjust the map's bounds after all elements are added
      map.fitBounds(bounds);
    } else {
      console.error('Current location not found');
    }

    // Finally, fit the bounds to ensure the entire route is visible
    map.fitBounds(bounds);

    console.log("Bounds:", bounds);
  }

  viewInGoogleMaps() {
    window.open(this.tripInfo.googleMapsUrl, '_blank');
  }

// editRoute() {
//   this.location.back();
// }
  


newRoute() {
  this.routeDataService.clearRouteInfo();
  this.locationService.clearOrigin();
  this.selectionService.clearAllSelections();
  this.router.navigate(['/select-origin']);
}


  loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCVMfV8HMmQHWcgZfF1ry3PCQXSxVtwOeglibraries=geometry,places`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = (error) => reject(error);
      script.setAttribute('loading', 'async')
      document.head.appendChild(script);
    });
  }
}