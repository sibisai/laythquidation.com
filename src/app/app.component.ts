import { Component, OnInit, NgZone } from '@angular/core';
import { FormControl } from '@angular/forms';
import { TripPlannerService } from './trip-planner.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  stores: any[] = [];
  originControl = new FormControl('');

  constructor(private tripPlannerService: TripPlannerService, private ngZone: NgZone) { }

  ngOnInit() {
    const input = document.getElementById('location-input') as HTMLInputElement;
    const autocomplete = new google.maps.places.Autocomplete(input);

    autocomplete.addListener('place_changed', () => {
      this.ngZone.run(() => {
        const place = autocomplete.getPlace();
        if (place.geometry && place.geometry.location) {
          const origin = place.formatted_address;
          if (origin) {
            this.calculateDistances(origin);
          }
        }
      });
    });
  }

  calculateDistances(origin: string) {
    if (origin) {
      this.tripPlannerService.calculateDistance(origin).subscribe(
        response => {
          this.stores = response.top25Closest;
        },
        error => {
          console.error('Error calculating distances:', error);
        }
      );
    }
  }

  generateRoute(origin: string, locations: string[]) {
    if (origin && locations.length > 0) {
      this.tripPlannerService.generateRoute(origin, locations).subscribe(
        response => {
          console.log('Generated route:', response);
        },
        error => {
          console.error('Error generating route:', error);
        }
      );
    }
  }
}