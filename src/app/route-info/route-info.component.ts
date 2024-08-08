import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-route-info',
  templateUrl: './route-info.component.html',
  styleUrls: ['./route-info.component.css']
})
export class RouteInfoComponent implements OnInit {
  tripInfo: any;
  loading = true;

  constructor(private router: Router) {}

  ngOnInit() {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { tripInfo: any };

    if (state && state.tripInfo) {
      this.tripInfo = state.tripInfo;
      this.loading = false;
    } else {
      this.router.navigate(['/']); // Redirect to home if no trip info
    }
  }
}