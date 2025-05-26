import { TestBed } from '@angular/core/testing';

import { RightPanelSettingsResolver } from './right-panel-settings.resolver';

describe('RightPanelSettingsResolver', () => {
  let resolver: RightPanelSettingsResolver;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    resolver = TestBed.inject(RightPanelSettingsResolver);
  });

  it('should be created', () => {
    expect(resolver).toBeTruthy();
  });
});
