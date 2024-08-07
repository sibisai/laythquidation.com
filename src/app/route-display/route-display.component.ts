import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-route-display',
  templateUrl: './route-display.component.html',
  styleUrls: ['./route-display.component.css']
})
export class RouteDisplayComponent {
  @Input() tripInfo: any;
}