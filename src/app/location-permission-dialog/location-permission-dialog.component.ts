import { Component } from '@angular/core';
import { NzModalRef } from 'ng-zorro-antd/modal';

@Component({
  selector: 'app-location-permission-dialog',
  templateUrl: './location-permission-dialog.component.html'
})
export class LocationPermissionDialogComponent {
  constructor(private modal: NzModalRef) {}

  onClose(): void {
    this.modal.close(false);
  }

  onConfirm(): void {
    this.modal.close(true);
  }
}