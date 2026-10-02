import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <header>
      <a routerLink="/" class="brand">🎮 MiniGames</a>
      @if (auth.user(); as user) {
        <div class="user">
          <span>👤 {{ user }}</span>
          <button (click)="signOut()">Sign out</button>
        </div>
      }
    </header>
    <router-outlet />
  `,
  styles: `
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #1e293b;
    }
    .brand {
      color: #e2e8f0;
      text-decoration: none;
      font-weight: 700;
      font-size: 1.1rem;
    }
    .brand:hover {
      color: #fff;
    }
    .user {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: #cbd5e1;
    }
    .user button {
      padding: 0.35rem 0.9rem;
      border: 1px solid #334155;
      border-radius: 999px;
      background: transparent;
      color: inherit;
      cursor: pointer;
    }
    .user button:hover {
      background: #1e293b;
    }
  `,
})
export class App {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected signOut(): void {
    this.auth.signOut();
    this.router.navigateByUrl('/login');
  }
}
