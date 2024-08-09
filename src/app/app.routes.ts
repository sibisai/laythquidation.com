import { Routes } from '@angular/router';
import { OriginSelectionComponent } from './origin-selection/origin-selection.component';
import { LocationSelectionComponent } from './location-selection/location-selection.component';
import { RouteInfoComponent } from './route-info/route-info.component';

export const routes: Routes = [
  { path: '', redirectTo: '/select-origin', pathMatch: 'full' },
  { path: 'select-origin', component: OriginSelectionComponent },
  { path: 'select-locations', component: LocationSelectionComponent },
  { path: 'route-info', component: RouteInfoComponent },
  { path: '**', redirectTo: '/select-origin' }
];