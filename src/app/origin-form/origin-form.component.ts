import { Component, EventEmitter, Output } from '@angular/core';
import { TripPlannerService } from '../trip-planner.service';

@Component({
  selector: 'app-origin-form',
  templateUrl: './origin-form.component.html',
  styleUrls: ['./origin-form.component.css']
})
export class OriginFormComponent {
  @Output() tripGenerated = new EventEmitter<any>();

  origin: string = '';
  location: string = '';

  constructor(private tripPlannerService: TripPlannerService) { }

  onSubmit() {
    this.tripPlannerService.generateRoute(this.origin, [this.location]).subscribe(
      (data) => {
        this.tripGenerated.emit(data);
      },
      (error) => {
        console.error('Error generating route:', error);
      }
    );
  }
}