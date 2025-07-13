import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service'; // Adjust the path as necessary


@Component({
  selector: 'app-login',
  imports: [
    CommonModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {

  constructor(
    private router: Router,
    private authService: AuthService 
  ) {}

  ngOnInit(): void {
    const clientId = '39536509300-g04og3umfjppgbq7mdd87e3teru10onp.apps.googleusercontent.com';
  
    // Define global callback
    (window as any).handleCredentialResponse = this.handleCredentialResponse.bind(this);
  
    // Wait until script is ready
    let interval: any = setInterval(() => {
      if ((window as any).google && (window as any).google.accounts?.id) {
        clearInterval(interval);
  
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: this.handleCredentialResponse.bind(this)
        });
  
        (window as any).google.accounts.id.renderButton(
          document.getElementById('g_id_signin'),
          {
            theme: 'outline',
            size: 'large',
            text: 'sign_in_with',
            shape: 'rectangular',
            logo_alignment: 'left'
          }
        );
      }
    }, 100);
  }
  

  handleCredentialResponse(response: any): void {
    const idToken = response.credential;

    this.authService.loginWithGoogle(idToken).subscribe({
      next: (res: any) => {
        console.log('User:', res.user);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.router.navigate(['/search']);
      },
      error: (err) => {
        console.error('Login failed:', err);
      }
    });
  }
}
