import { NgModule } from '@angular/core';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';

@NgModule({
  exports: [
    NzFormModule,
    NzInputModule,
    NzCardModule,
    NzButtonModule,
    NzCheckboxModule,
    NzListModule,
    NzSpaceModule,
    NzTypographyModule,
    NzTableModule,
    NzPaginationModule
  ]
})
export class NgZorroAntdModule { }