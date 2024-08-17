import { NgModule } from '@angular/core';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzQRCodeModule } from 'ng-zorro-antd/qr-code';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzSliderModule } from 'ng-zorro-antd/slider'
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzIconModule } from 'ng-zorro-antd/icon';

@NgModule({
  exports: [
    NzFormModule,
    NzInputModule,
    NzCardModule,
    NzButtonModule,
    NzCheckboxModule,
    NzCollapseModule,
    NzListModule,
    NzSpaceModule,
    NzTypographyModule,
    NzTableModule,
    NzSpinModule,
    NzQRCodeModule,
    NzStatisticModule,
    NzSwitchModule,
    NzPaginationModule,
    NzProgressModule,
    NzDividerModule,
    NzIconModule,
    NzSliderModule,
  ]
})
export class NgZorroAntdModule { }