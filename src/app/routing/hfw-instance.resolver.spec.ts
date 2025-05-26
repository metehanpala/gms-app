import { TestBed } from '@angular/core/testing';

import { HfwInstanceResolver } from './hfw-instance.resolver';

describe('HfwInstanceResolver', () => {
  let resolver: HfwInstanceResolver;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    resolver = TestBed.inject(HfwInstanceResolver);
  });

  it('should be created', () => {
    expect(resolver).toBeTruthy();
  });
});
