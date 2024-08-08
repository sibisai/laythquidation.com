import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OriginSelectionComponent } from './origin-selection.component';

describe('OriginSelectionComponent', () => {
  let component: OriginSelectionComponent;
  let fixture: ComponentFixture<OriginSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OriginSelectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OriginSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
