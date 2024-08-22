import { Component, OnInit, AfterViewInit, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { RouteDataService } from '../services/route-data.service';
import { LocationService } from '../services/location.service';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { TripPlannerService } from '../services/trip-planner.service';
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
  loading: boolean = false;
  AdvancedMarkerElement: any;
  PinElement: any;
  activePanelIndex: number | null = null;
  infoWindows: Map<any, google.maps.InfoWindow> = new Map();

  constructor(
    private router: Router,
    private routeDataService: RouteDataService,
    private locationService: LocationService,
    private selectionService: SelectionService,
    private location: Location,
    private tripPlannerService: TripPlannerService,
    private ngZone: NgZone, // Make sure to include NgZone here
    private modal: NzModalService,
    private nzMessageService: NzMessageService
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
      return google.maps.importLibrary("marker"); // Import marker library
    }).then(({ AdvancedMarkerElement, PinElement }) => {
      this.AdvancedMarkerElement = AdvancedMarkerElement;
      this.PinElement = PinElement;
      this.loadMap();
    }).catch(error => {
      console.error('Error loading Google Maps script:', error);
    });
  }

  ngOnDestroy() {
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
    mapTypeControl: false,
    mapId: '7199e2fcf31ab2c5' // Your Map ID
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

      const pin = new this.PinElement({
        background: '#FF0000', // Set your desired color
        glyph: `${index + 1}`,
        glyphColor: 'white',
        borderColor: 'white'
      });

      const marker = new this.AdvancedMarkerElement({
        map: map,
        position,
        title: `Waypoint ${index + 1}: ${this.tripInfo.waypointsDurations[index]}`,
        content: pin.element
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333; padding: 10px; border-radius: 5px; background-color: #f9f9f9; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);">
            <h4 style="margin: 0; font-size: 16px; color: #007BFF;">Waypoint ${index + 1}</h4>
            <div style="margin-top: 5px;">
              <strong>Duration:</strong> ${this.tripInfo.waypointsDurations[index]}
            </div>
            <button id="deleteWaypointBtn-${index}" style="margin-top: 10px; padding: 5px 10px; background-color: red; color: white; border: none; border-radius: 5px; cursor: pointer;">Delete</button>
          </div>
        `
      });

      marker.addListener('gmp-click', () => {
        infoWindow.open(map, marker);

        // Set up the delete button listener
        google.maps.event.addListenerOnce(infoWindow, 'domready', () => {
          document.getElementById(`deleteWaypointBtn-${index}`)?.addEventListener('click', () => {
            this.ngZone.run(() => this.deleteWaypoint(index));
          });
        });
      });

      bounds.extend(position);
    });
  }

const currentLocation = this.locationService.getOriginCoordinates();

if (currentLocation && typeof currentLocation.latitude === 'number' && typeof currentLocation.longitude === 'number') {

  const position = { lat: currentLocation.latitude, lng: currentLocation.longitude };

    const marker = new google.maps.Marker({
      position: position,
      map: map,
      title: 'Your Current Location',
      icon: {
        url: 'assets/images/current_location.png',
        scaledSize: new google.maps.Size(40, 40),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(20, 20)
      }
    });
  
  const currentLocationInfoWindow = new google.maps.InfoWindow({
    content: `<h4>Your Current Location</h4><p>Latitude: ${currentLocation.latitude}</p><p>Longitude: ${currentLocation.longitude}</p>`
  });
  marker.addListener('click', () => {
    currentLocationInfoWindow.open(map, marker);
  });

  bounds.extend(position);
  map.fitBounds(bounds);
} else {
  console.error('Current location not found or invalid');
}

  // Finally, fit the bounds to ensure the entire route is visible
  map.fitBounds(bounds);
}
  viewInGoogleMaps() {
    window.open(this.tripInfo.googleMapsUrl, '_blank');
  }

editRoute() {
  this.location.back();
}
  
deleteWaypoint(index: number): void {
  this.ngZone.run(() => {
    if (this.tripInfo.waypointsForPins.length === 1) {
      this.modal.error({
        nzTitle: 'Cannot Delete Last Waypoint',
        nzContent: 'You cannot delete the last waypoint. Please keep at least one waypoint in your route.'
      });
      return;
    }

    this.loading = true; // Start loading

    this.tripInfo.waypointsForPins.splice(index, 1);
    this.tripInfo.waypointsDurations.splice(index, 1);

    const origin = this.locationService.getOrigin();

    if (origin) {
      this.tripPlannerService.recalculateRoute({ origin, remainingLocations: this.tripInfo.waypointsForPins }).subscribe(
        (newRouteData) => {
          this.tripInfo = newRouteData;
          this.qrCodeUrl = newRouteData.qrCodeUrl;

          this.loading = false; // Stop loading after success
          this.loadMap();

          const modal = this.modal.success({
            nzTitle: 'Waypoint Deleted',
            nzContent: 'The waypoint was successfully deleted.'
          });

          setTimeout(() => modal.destroy(), 1000);
        },
        (error) => {
          console.error('Failed to recalculate route:', error);
          this.loading = false; // Stop loading on error
        }
      );
    } else {
      console.error('Origin is null, cannot recalculate route.');
      this.loading = false; // Stop loading on error
    }
  });
}
  
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
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCVMfV8HMmQHWcgZfF1ry3PCQXSxVtwOeg&libraries=geometry,places,marker&v=beta`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = (error) => reject(error);
      script.setAttribute('loading', 'async')
      document.head.appendChild(script);
    });
  }
}