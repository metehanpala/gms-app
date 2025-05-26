import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CertificateErrorComponent } from './certificate-error.component';

describe('CertificateErrorComponent', () => {
  let component: CertificateErrorComponent;
  let fixture: ComponentFixture<CertificateErrorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CertificateErrorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CertificateErrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
