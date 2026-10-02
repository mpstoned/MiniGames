import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <main>
      <form class="card" (submit)="$event.preventDefault()">
        <h1>Welcome!</h1>
        <p class="hint">Sign in with your username, or pick a new one to sign up.</p>

        <label for="username">Username</label>
        <input
          id="username"
          name="username"
          [(ngModel)]="username"
          autocomplete="username"
          autocapitalize="off"
          spellcheck="false"
          maxlength="20"
          placeholder="e.g. tic_tac_pro"
          [disabled]="busy()"
        />

        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }

        <div class="actions">
          <button type="submit" class="primary" [disabled]="busy() || !username.trim()" (click)="submit('signin')">
            Sign in
          </button>
          <button type="button" class="secondary" [disabled]="busy() || !username.trim()" (click)="submit('signup')">
            Sign up
          </button>
        </div>
      </form>
    </main>
  `,
  styles: `
    main {
      display: flex;
      justify-content: center;
      padding: 3rem 1rem;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: min(100%, 360px);
      padding: 2rem 1.5rem;
      border-radius: 16px;
      background: #1e293b;
    }
    h1 {
      margin: 0;
      font-size: 2rem;
      text-align: center;
    }
    .hint {
      margin: 0 0 0.5rem;
      color: #94a3b8;
      text-align: center;
    }
    label {
      font-weight: 600;
    }
    input {
      padding: 0.7rem 0.9rem;
      font-size: 1rem;
      border: 1px solid #334155;
      border-radius: 10px;
      background: #0f172a;
      color: inherit;
    }
    input:focus {
      outline: 2px solid #6366f1;
      outline-offset: 1px;
    }
    .error {
      margin: 0;
      color: #f87171;
    }
    .actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }
    .actions button {
      flex: 1;
      padding: 0.65rem;
      font-size: 1rem;
      border-radius: 999px;
      cursor: pointer;
    }
    .actions button:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .primary {
      border: none;
      background: #6366f1;
      color: #fff;
    }
    .primary:not(:disabled):hover {
      background: #4f46e5;
    }
    .secondary {
      border: 1px solid #6366f1;
      background: transparent;
      color: #c7d2fe;
    }
    .secondary:not(:disabled):hover {
      background: #312e81;
    }
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected username = '';
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async submit(action: 'signin' | 'signup'): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await (action === 'signin' ? this.auth.signIn(this.username) : this.auth.signUp(this.username));
      await this.router.navigateByUrl('/');
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
