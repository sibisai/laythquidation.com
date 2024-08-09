import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RouteDataService } from '../services/route-data.service';  // Import the RouteDataService

@Component({
  selector: 'app-route-info',
  templateUrl: './route-info.component.html',
  styleUrls: ['./route-info.component.css']
})
export class RouteInfoComponent implements OnInit {
  tripInfo: any;
  loading = true;

  constructor(
    private router: Router,
    private routeDataService: RouteDataService  // Inject RouteDataService
  ) {}

  ngOnInit() {
    this.tripInfo = this.routeDataService.getRouteInfo();  // Retrieve the data from the service

    if (this.tripInfo) {
      this.loading = false;
    } else {
      console.log('No trip info found, routing to origin selection');
      this.router.navigate(['/']); // Redirect to home if no trip info
    }
  }

  goBack() {
    this.router.navigate(['/select-locations']);
  }

  confirmTrip() {
    console.log('Trip confirmed:', this.tripInfo);
    // Additional logic for confirming the trip
  }
}