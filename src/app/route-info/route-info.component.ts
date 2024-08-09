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
      center: { lat: 34.0522, lng: -118.2437 }, // Example coordinates
      zoom: 10,
      mapTypeControl: false
    });

    console.log("Map initialized:", map);
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