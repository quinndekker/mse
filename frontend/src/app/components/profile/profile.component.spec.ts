import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileComponent } from './profile.component';
import { AuthService } from '../../services/auth/auth.service';
import { User } from '../../models/user';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

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

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['isLoggedIn', 'getUser', 'logout']);

    await TestBed.configureTestingModule({
      imports: [ProfileComponent, HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should not set user data if not logged in', () => {
    mockAuthService.isLoggedIn.and.returnValue(false);

    component.ngOnInit();

    expect(component.currentUser).toBeNull();
    expect(component.email).toBeNull();
    expect(component.firstName).toBeNull();
    expect(component.lastName).toBeNull();
    expect(component.profilePictureUrl).toBeNull();
  });

  it('should set user data if logged in', () => {
    mockAuthService.isLoggedIn.and.returnValue(true);
    mockAuthService.getUser.and.returnValue(dummyUser);

    component.ngOnInit();

    expect(component.currentUser).toEqual(dummyUser);
    expect(component.email).toBe(dummyUser.email);
    expect(component.firstName).toBe(dummyUser.firstName);
    expect(component.lastName).toBe(dummyUser.lastName);
    expect(component.profilePictureUrl).toBe(dummyUser.picture ?? null);
    expect(component.userCreatedAt?.toISOString()).toBe(new Date(dummyUser.createdAt!).toISOString());
  });

  it('should call logout on AuthService when logout is called', () => {
    component.logout();
    expect(mockAuthService.logout).toHaveBeenCalled();
  });
});
