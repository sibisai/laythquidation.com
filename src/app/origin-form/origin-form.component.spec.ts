import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OriginFormComponent } from './origin-form.component';

describe('OriginFormComponent', () => {
  let component: OriginFormComponent;
  let fixture: ComponentFixture<OriginFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OriginFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OriginFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
