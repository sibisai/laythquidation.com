import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-location-selection',
  templateUrl: './location-selection.component.html',
  styleUrls: ['./location-selection.component.css']
})
export class LocationSelectionComponent implements OnInit {
  locations: any[] = [];
  origin: string = '';

  constructor(private router: Router) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.locations = navigation.extras.state['stores'];
      this.origin = navigation.extras.state['start'];
    }
  }

  ngOnInit(): void {
    console.log('Locations:', this.locations);
    console.log('Origin:', this.origin);
  }

  selectLocation(location: any): void {
    console.log('Selected location:', location);
    // You can implement any logic here when a location is selected.
  }
}