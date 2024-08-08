import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OriginSelectionComponent } from './origin-selection/origin-selection.component';
import { LocationSelectionComponent } from './location-selection/location-selection.component';
import { RouteInfoComponent } from './route-info/route-info.component';

const routes: Routes = [
  { path: '', redirectTo: '/origin-selection', pathMatch: 'full' },
  { path: 'origin-selection', component: OriginSelectionComponent },
  { path: 'location-selection', component: LocationSelectionComponent },
  { path: 'route-info', component: RouteInfoComponent },
  { path: '**', redirectTo: '/origin-selection' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }