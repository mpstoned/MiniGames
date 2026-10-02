import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith } from 'rxjs';
import { Dashboard, GameId, StatsService } from '../stats.service';

type UserRow = Dashboard['users'][number] & { total: number };
type SortKey = 'username' | 'createdAt' | 'lastSeenAt' | 'signIns' | 'tic-tac-toe' | 'connect-four' | 'total';

const DAY_MS = 24 * 60 * 60 * 1000;

const GAMES: { id: GameId; name: string; results: { key: string; label: string; color: string }[] }[] = [
  {
    id: 'tic-tac-toe',
    name: 'Tic Tac Toe',
    results: [
      { key: 'X', label: 'X wins (starts)', color: '#38bdf8' },
      { key: 'O', label: 'O wins', color: '#f472b6' },
      { key: 'draw', label: 'Draws', color: '#64748b' },
    ],
  },
  {
    id: 'connect-four',
    name: 'Connect Four',
    results: [
      { key: 'red', label: 'Red wins (starts)', color: '#ef4444' },
      { key: 'yellow', label: 'Yellow wins', color: '#facc15' },
      { key: 'draw', label: 'Draws', color: '#64748b' },
    ],
  },
];

@Component({
  selector: 'app-admin',
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin {
  private readonly state = toSignal(
    inject(StatsService)
      .getDashboard()
      .pipe(
        map((data) => ({ data, error: false })),
        catchError(() => of({ data: null, error: true })),
        startWith({ data: null, error: false }),
      ),
    { requireSync: true },
  );

  protected readonly data = computed(() => this.state().data);
  protected readonly error = computed(() => this.state().error);
  protected readonly games = GAMES;

  // ---- Key numbers ----
  protected readonly kpis = computed(() => {
    const d = this.data();
    if (!d) return null;
    const now = Date.now();
    const within = (iso: string, days: number) => now - Date.parse(iso) < days * DAY_MS;
    const totalGames = GAMES.reduce((sum, g) => sum + (d.games[g.id]?.played ?? 0), 0);
    const today = d.daily.at(-1);
    return {
      users: d.users.length,
      newUsers: d.users.filter((u) => within(u.createdAt, 7)).length,
      totalGames,
      gamesToday: today ? GAMES.reduce((sum, g) => sum + (today.games[g.id] ?? 0), 0) : 0,
      activeUsers: d.users.filter((u) => within(u.lastSeenAt, 7)).length,
      gamesPerUser: d.users.length ? totalGames / d.users.length : 0,
    };
  });

  // ---- Games per day ----
  protected readonly days = computed(() =>
    (this.data()?.daily ?? []).map((d) => {
      const perGame = GAMES.map((g) => ({ name: g.name, count: d.games[g.id] ?? 0 }));
      return { date: d.date, total: perGame.reduce((s, g) => s + g.count, 0), perGame };
    }),
  );
  protected readonly dayMax = computed(() => Math.max(1, ...this.days().map((d) => d.total)));
  protected readonly daysTotal = computed(() => this.days().reduce((s, d) => s + d.total, 0));
  protected readonly showDayTable = signal(false);

  // ---- Results per game ----
  protected readonly results = computed(() => {
    const d = this.data();
    if (!d) return [];
    return GAMES.map((g) => {
      const stats = d.games[g.id];
      const played = stats?.played ?? 0;
      return {
        ...g,
        played,
        segments: g.results.map((r) => {
          const count = stats?.results[r.key] ?? 0;
          return { ...r, count, percent: played ? (count / played) * 100 : 0 };
        }),
      };
    });
  });

  // ---- Users table ----
  protected readonly search = signal('');
  protected readonly sort = signal<{ key: SortKey; desc: boolean }>({ key: 'lastSeenAt', desc: true });
  protected readonly columns: { key: SortKey; label: string; numeric?: boolean }[] = [
    { key: 'username', label: 'User' },
    { key: 'createdAt', label: 'Joined' },
    { key: 'lastSeenAt', label: 'Last seen' },
    { key: 'signIns', label: 'Sign-ins', numeric: true },
    { key: 'tic-tac-toe', label: 'Tic Tac Toe', numeric: true },
    { key: 'connect-four', label: 'Connect Four', numeric: true },
    { key: 'total', label: 'Total games', numeric: true },
  ];
  protected readonly users = computed<UserRow[]>(() => {
    const term = this.search().trim().toLowerCase();
    const { key, desc } = this.sort();
    const rows = (this.data()?.users ?? [])
      .filter((u) => u.username.toLowerCase().includes(term))
      .map((u) => ({ ...u, total: GAMES.reduce((s, g) => s + (u.games[g.id] ?? 0), 0) }));
    const value = (u: UserRow): string | number =>
      key === 'tic-tac-toe' || key === 'connect-four' ? u.games[key] : u[key];
    return rows.sort((a, b) => {
      const [x, y] = [value(a), value(b)];
      const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return desc ? -cmp : cmp;
    });
  });

  protected sortBy(key: SortKey): void {
    this.sort.update((s) => ({ key, desc: s.key === key ? !s.desc : key !== 'username' }));
  }

  protected ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    const s = this.sort();
    return s.key !== key ? 'none' : s.desc ? 'descending' : 'ascending';
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  protected shortDate(date: string): string {
    return new Date(date + 'T00:00:00Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  }

  protected relative(iso: string): string {
    const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    const days = Math.round(hours / 24);
    return days === 1 ? 'yesterday' : `${days} days ago`;
  }
}
