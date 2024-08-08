import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { OriginSelectionComponent } from './origin-selection/origin-selection.component';
import { LocationSelectionComponent } from './location-selection/location-selection.component';
import { RouteInfoComponent } from './route-info/route-info.component';

import { NgZorroAntdModule } from './ng-zorro-antd.module';
import { NzModalModule } from 'ng-zorro-antd/modal'
import { TripPlannerService } from './trip-planner.service';
import { LocationPermissionDialogComponent } from './location-permission-dialog/location-permission-dialog.component';

@NgModule({
  declarations: [
    AppComponent,
    OriginSelectionComponent,
    LocationSelectionComponent,
    RouteInfoComponent,
    LocationPermissionDialogComponent
  ],
  imports: [
    BrowserModule,
    NzModalModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    
    ReactiveFormsModule,
    AppRoutingModule,
    NgZorroAntdModule // Import the custom module here
  ],
  providers: [TripPlannerService],
  bootstrap: [AppComponent],
})
export class AppModule { }