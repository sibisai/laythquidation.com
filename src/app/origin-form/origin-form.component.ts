import { Component, OnInit, NgZone } from '@angular/core';
import { FormControl } from '@angular/forms';
import { TripPlannerService } from '../trip-planner.service';

@Component({
  selector: 'app-origin-form',
  templateUrl: './origin-form.component.html',
  styleUrls: ['./origin-form.component.css']
})
export class OriginFormComponent implements OnInit {
  originControl = new FormControl('');
  stores: any[] = [];

  constructor(private tripPlannerService: TripPlannerService, private ngZone: NgZone) { }

  ngOnInit() {
    const input = document.getElementById('location-input') as HTMLInputElement;
    const autocomplete = new google.maps.places.Autocomplete(input);

    autocomplete.addListener('place_changed', () => {
      this.ngZone.run(() => {
        const place = autocomplete.getPlace();
        if (place.geometry && place.geometry.location) {
          const origin = place.formatted_address || '';
          this.calculateDistances(origin);
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
    } else {
      console.error('Origin is undefined or empty');
    }
  }
}