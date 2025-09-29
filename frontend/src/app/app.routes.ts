import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HomeComponent } from './components/home/home.component';
import { AuthGuard } from './guards/auth.guard';
import { ProfileComponent } from './components/profile/profile.component';
import { SearchComponent } from './components/search/search.component';
import { AuthAdminGuard } from './guards/authAdmin.guard';
import { AllUsersComponent } from './components/all-users/all-users.component';
import { ListsComponent } from './components/lists/lists.component';
import { ListComponent } from './components/list/list.component';
import { SectorsComponent } from './components/sectors/sectors.component';
import { StockComponent } from './components/stock/stock.component';
import { PredictionsComponent } from './components/predictions/predictions.component';
import { SectorComponent } from './components/sector/sector.component';
import { ModelsComponent } from './components/models/models.component';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
    { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
    { path: 'search', component: SearchComponent, canActivate: [AuthGuard] },
    { path: 'models', component: ModelsComponent, canActivate: [AuthGuard] },
    { path: 'predictions', component: PredictionsComponent, canActivate: [AuthGuard] },
    { path: 'predictions/:ticker', component: PredictionsComponent, canActivate: [AuthGuard] },
    { path: 'lists', component: ListsComponent, canActivate: [AuthGuard] },
    { path: 'lists/:id', component: ListComponent, canActivate: [AuthGuard] },
    { path: 'stock/:ticker', component: StockComponent, canActivate: [AuthGuard] },
    { path: 'stock/:ticker/:sector', component: StockComponent, canActivate: [AuthGuard] },
    { path: 'sectors', component: SectorsComponent, canActivate: [AuthGuard] },
    { path: 'sectors/:sector', component: SectorComponent, canActivate: [AuthGuard] },
    { path: 'allusers', component: AllUsersComponent, canActivate: [AuthAdminGuard] },
    { path: '', redirectTo: '/search', pathMatch: 'full' },
    { path: '**', redirectTo: '/search' }
];
