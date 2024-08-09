import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { RouteDataService } from '../services/route-data.service';

declare var google: any;

@Component({
  selector: 'app-route-info',
  templateUrl: './route-info.component.html',
  styleUrls: ['./route-info.component.css']
})
export class RouteInfoComponent implements OnInit, AfterViewInit {
  tripInfo: any;
  showQRCode = false;

  constructor(private router: Router, private routeDataService: RouteDataService) {}

  ngOnInit() {
    this.tripInfo = this.routeDataService.getRouteInfo();
    if (!this.tripInfo) {
      console.error('No trip info found');
      this.router.navigate(['/select-origin']);
      return;
    }
  }

  ngAfterViewInit() {
    this.loadGoogleMapsScript().then(() => {
      this.loadMap();
    }).catch(error => {
      console.error('Error loading Google Maps script:', error);
    });
  }
  
loadMap() {
  const mapElement = document.getElementById('map');
  if (!mapElement) {
    console.error('Map element not found');
    return;
  }

  const map = new google.maps.Map(mapElement, {
    center: { lat: 34.0522, lng: -118.2437 }, // Example coordinates, replace with your origin if needed
    zoom: 10,
    mapTypeControl: false
  });

  console.log("Map initialized:", map);

  // Decode the polyline data from the tripInfo
  const path = google.maps.geometry.encoding.decodePath(this.tripInfo.polylineData);
  console.log("Decoded path:", path);

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
  });

  // Add markers for waypoints
  if (this.tripInfo.waypointsForPins && this.tripInfo.waypointsForPins.length) {
    this.tripInfo.waypointsForPins.forEach((waypoint: string, index: number) => {
      const [lat, lng] = waypoint.split(',').map(Number);
      const position = new google.maps.LatLng(lat, lng);

      const marker = new google.maps.Marker({
        position,
        map,
        title: `Waypoint ${index + 1}: ${this.tripInfo.waypointsDurations[index]}`
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `<h4>Waypoint ${index + 1}</h4><p>Duration: ${this.tripInfo.waypointsDurations[index]}</p>`
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
    });
  }

  // Adjust the map's bounds to fit the polyline
  const bounds = new google.maps.LatLngBounds();
  path.forEach((point: any) => bounds.extend(point));
  map.fitBounds(bounds);

  console.log("Bounds:", bounds);
}

  viewInGoogleMaps() {
    window.open(this.tripInfo.googleMapsUrl, '_blank');
  }

  toggleQRCode() {
    this.showQRCode = !this.showQRCode;
  }

  generateQRCodeURL(url: string): string {
    return `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(url)}`;
  }

  loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCVMfV8HMmQHWcgZfF1ry3PCQXSxVtwOeg&libraries=geometry,places`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = (error) => reject(error);
      document.head.appendChild(script);
    });
  }
}