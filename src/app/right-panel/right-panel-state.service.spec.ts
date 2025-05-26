import { TestBed } from '@angular/core/testing';

import { RightPanelStateService } from './right-panel-state.service';

describe('RightPanelStateService', () => {
  let service: RightPanelStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RightPanelStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
