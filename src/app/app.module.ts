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
import { NgZorroAntdModule } from './ng-zorro-antd.module'; // Assuming this is a custom module for all ng-zorro imports
import { NzModalModule } from 'ng-zorro-antd/modal';
import { TripPlannerService } from './services/trip-planner.service';
import { LocationPermissionDialogComponent } from './location-permission-dialog/location-permission-dialog.component';
import { NZ_I18N, en_US } from 'ng-zorro-antd/i18n';

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
    NgZorroAntdModule,
  ],
  providers: [
    TripPlannerService,
    { provide: NZ_I18N, useValue: en_US } // Ensure en_US locale is used
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }