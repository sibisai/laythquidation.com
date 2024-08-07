import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  tripInfo: any;

  handleTripGenerated(event: any) {
    this.tripInfo = event;
  }
}