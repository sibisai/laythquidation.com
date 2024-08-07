import { TestBed } from '@angular/core/testing';

import { TripPlannerService } from './trip-planner.service';

describe('TripPlannerService', () => {
  let service: TripPlannerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TripPlannerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
