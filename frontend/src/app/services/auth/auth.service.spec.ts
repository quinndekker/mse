import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { User } from '../../models/user';
import { UserResponse } from '../../models/userResponse';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  const dummyUser: User = {
    _id: '123abc',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    picture: 'test.jpg',
    googleId: 'google-456',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2025-01-01')
  };
  
  const dummyResponse: UserResponse = {
    user: dummyUser,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString()
  };

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: Router, useValue: routerSpy }]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear(); // reset before each test
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login with Google and store user info', () => {
    const emitSpy = spyOn(service.userUpdate, 'emit');

    service.loginWithGoogle('fake-token').subscribe((response) => {
      expect(response).toEqual(dummyResponse);
      expect(localStorage.getItem('user')).toEqual(JSON.stringify(dummyUser));
      expect(localStorage.getItem('expiresAt')).toEqual(JSON.stringify(dummyResponse.expiresAt));
      expect(emitSpy).toHaveBeenCalled();
    });

    const req = httpMock.expectOne(`${service['apiUrl']}/google`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ credential: 'fake-token' });
    req.flush(dummyResponse);
  });

  it('should return true if session is valid', () => {
    localStorage.setItem('user', JSON.stringify(dummyUser));
    localStorage.setItem('expiresAt', JSON.stringify(new Date(Date.now() + 100000).toISOString()));
    expect(service.isLoggedIn()).toBeTrue();
  });

  it('should return false and clear data if session is expired', () => {
    localStorage.setItem('user', JSON.stringify(dummyUser));
    localStorage.setItem('expiresAt', JSON.stringify(new Date(Date.now() - 1000).toISOString()));
    const emitSpy = spyOn(service.userUpdate, 'emit');

    expect(service.isLoggedIn()).toBeFalse();
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('expiresAt')).toBeNull();
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should get user from localStorage', () => {
    localStorage.setItem('user', JSON.stringify(dummyUser));
    const user = service.getUser();
    expect(user).toEqual(dummyUser);
  });

  it('should logout and clear localStorage', () => {
    localStorage.setItem('user', JSON.stringify(dummyUser));
    localStorage.setItem('expiresAt', JSON.stringify(dummyResponse.expiresAt));
    const emitSpy = spyOn(service.userUpdate, 'emit');

    service.logout();

    const req = httpMock.expectOne(`${service['apiUrl']}/logout`);
    expect(req.request.method).toBe('GET');
    req.flush({});

    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('expiresAt')).toBeNull();
    expect(emitSpy).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});
