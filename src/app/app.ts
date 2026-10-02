import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <header>
      <a routerLink="/" class="brand">🎮 MiniGames</a>
    </header>
    <router-outlet />
  `,
  styles: `
    header {
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
  `,
})
export class App {}
