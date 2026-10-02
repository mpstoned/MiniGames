import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

const STORAGE_KEY = 'minigames.user';
const ADMIN_USERNAME = 'admin';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  /** The signed-in username, or null when signed out. */
  readonly user = signal<string | null>(readStoredUser());

  /** The admin sees the dashboard instead of the games. */
  readonly isAdmin = computed(() => this.user()?.toLowerCase() === ADMIN_USERNAME);

  signUp(username: string): Promise<void> {
    return this.authenticate('signup', username);
  }

  signIn(username: string): Promise<void> {
    return this.authenticate('signin', username);
  }

  signOut(): void {
    this.setUser(null);
  }

  private async authenticate(action: 'signup' | 'signin', username: string): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ username: string }>(`/api/users/${action}`, { username: username.trim() }),
      );
      this.setUser(res.username);
    } catch (err) {
      const message = err instanceof HttpErrorResponse && typeof err.error?.error === 'string'
        ? err.error.error
        : 'Something went wrong. Please try again.';
      throw new Error(message);
    }
  }

  private setUser(username: string | null): void {
    this.user.set(username);
    try {
      if (username) localStorage.setItem(STORAGE_KEY, username);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable (e.g. private mode): stay signed in for this visit only.
    }
  }
}

function readStoredUser(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
