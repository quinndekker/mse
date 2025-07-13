import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../services/auth/auth.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AppComponent } from '../../app.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['loginWithGoogle']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [
        LoginComponent,               
        HttpClientTestingModule,
        AppComponent      
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should call AuthService and navigate on successful login', () => {
    const fakeResponse = { credential: 'fake-token' };
    const fakeUser = { name: 'Test User' };
    mockAuthService.loginWithGoogle.and.returnValue(of({ user: fakeUser }));
    spyOn(localStorage, 'setItem');

    component.handleCredentialResponse(fakeResponse);

    expect(mockAuthService.loginWithGoogle).toHaveBeenCalledWith('fake-token');
    expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(fakeUser));
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('should log error on failed login', () => {
    const fakeResponse = { credential: 'bad-token' };
    const error = new Error('Failed');
    mockAuthService.loginWithGoogle.and.returnValue(throwError(() => error));
    spyOn(console, 'error');

    component.handleCredentialResponse(fakeResponse);

    expect(console.error).toHaveBeenCalledWith('Login failed:', error);
  });

});