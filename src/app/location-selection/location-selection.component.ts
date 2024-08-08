import { Component, OnInit } from '@angular/core';
import { TripPlannerService } from '../trip-planner.service';

@Component({
  selector: 'app-location-selection',
  templateUrl: './location-selection.component.html',
  styleUrls: ['./location-selection.component.css']
})
export class LocationSelectionComponent implements OnInit {
  locations: any[] = [];

  constructor(private TripPlannerService: TripPlannerService) {}

  ngOnInit(): void {
    this.getLocations();
  }

  getLocations(): void {
    this.TripPlannerService.calculateDistance({ origin: 'Your Origin Address' })
      .subscribe((data: any) => {
        this.locations = data;
      });
  }

  selectLocation(location: any): void {
    // Handle the location selection logic here
  }
}