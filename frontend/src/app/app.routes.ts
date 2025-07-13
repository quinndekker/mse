import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HomeComponent } from './components/home/home.component';
import { AuthGuard } from './guards/auth.guard';
import { ProfileComponent } from './components/profile/profile.component';
import { SearchComponent } from './components/search/search.component';
import { AuthAdminGuard } from './guards/authAdmin.guard';
import { AllUsersComponent } from './components/all-users/all-users.component';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
    { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
    { path: 'search', component: SearchComponent, canActivate: [AuthGuard] },
    { path: 'allusers', component: AllUsersComponent, canActivate: [AuthAdminGuard] },
    { path: '', redirectTo: '/search', pathMatch: 'full' },
    { path: '**', redirectTo: '/search' }
];
