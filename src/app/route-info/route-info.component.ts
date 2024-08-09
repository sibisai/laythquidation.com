import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RouteDataService } from '../services/route-data.service';

declare var google: any;

@Component({
  selector: 'app-route-info',
  templateUrl: './route-info.component.html',
  styleUrls: ['./route-info.component.css']
})
export class RouteInfoComponent implements OnInit {
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

    if (!this.tripInfo.polylineData) {
      console.error('Polyline data is missing');
      return;
    }

    this.loadMap();
  }

  loadMap() {
    const map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: 34.0522, lng: -118.2437 },
      zoom: 10,
      mapTypeControl: false
    });

    if (google.maps.geometry && google.maps.geometry.encoding) {
      const polylinePath = google.maps.geometry.encoding.decodePath(this.tripInfo.polylineData);

      const polyline = new google.maps.Polyline({
        path: polylinePath,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 2
      });

      polyline.setMap(map);

      // Add waypoints markers
      this.tripInfo.waypointsForPins.forEach((location: string) => {
        const [lat, lng] = location.split(',').map(Number);
        new google.maps.Marker({
          position: { lat, lng },
          map,
          title: 'Waypoint'
        });
      });

      const bounds = new google.maps.LatLngBounds();
      polylinePath.forEach((point: google.maps.LatLng) => {
        bounds.extend(point);
      });
      map.fitBounds(bounds);
    } else {
      console.error('Google Maps Geometry Library is not loaded.');
    }
  }

  viewInGoogleMaps() {
    window.open(this.tripInfo.googleMapsUrl, '_blank');
  }

  generateQRCodeURL(url: string): string {
    return `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(url)}`;
  }
}