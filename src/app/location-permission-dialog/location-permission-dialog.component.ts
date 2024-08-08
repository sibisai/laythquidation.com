import { Component } from '@angular/core';
import { NzModalRef } from 'ng-zorro-antd/modal';

@Component({
  selector: 'app-location-permission-dialog',
  templateUrl: './location-permission-dialog.component.html'
})
export class LocationPermissionDialogComponent {
  isVisible = true;
  isConfirmLoading = false;

  constructor(private modal: NzModalRef) {}

  handleOk(): void {
    this.isConfirmLoading = true;
    setTimeout(() => {
      this.modal.close(true);
      this.isConfirmLoading = false;
    }, 1000);
  }

  handleCancel(): void {
    this.modal.close(false);
  }
}