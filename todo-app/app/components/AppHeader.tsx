import Link from 'next/link';
import type { ReactNode } from 'react';

interface AppHeaderProps {
  currentPage: 'todos' | 'calendar';
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  onLogout?: () => void | Promise<void>;
}

export function AppHeader({
  currentPage,
  eyebrow,
  title,
  description,
  actions,
  onLogout,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="brand-stack">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="page-title">{title}</h1>
        <p className="page-copy">{description}</p>
      </div>

      <div className="header-actions">
        <nav className="app-nav" aria-label="Primary">
          <Link className={currentPage === 'todos' ? 'nav-link nav-link-active' : 'nav-link'} href="/">
            Tasks
          </Link>
          <Link className={currentPage === 'calendar' ? 'nav-link nav-link-active' : 'nav-link'} href="/calendar">
            Calendar
          </Link>
        </nav>

        <div className="action-cluster">
          {actions}
          {onLogout ? (
            <button className="ghost-button" onClick={() => void onLogout()} type="button">
              Logout
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
