import { TestBed } from '@angular/core/testing';

import { ModelDetailsService } from './model-details.service';

describe('ModelDetailsService', () => {
  let service: ModelDetailsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ModelDetailsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
