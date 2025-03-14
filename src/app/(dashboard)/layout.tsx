'use client';

import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const navigation = [
  { name: 'Overview', href: '/dashboard' },
  { name: 'Leaderboards', href: '/dashboard/leaderboards' },
  { name: 'Quests & Challenges', href: '/dashboard/quests' },
  { name: 'Tournaments', href: '/dashboard/tournaments' },
  { name: 'Matchmaking', href: '/dashboard/matchmaking' },
  { name: 'Creator & Affiliates', href: '/dashboard/creator' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/sign-in');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <div style={{ 
        width: '280px',
        backgroundColor: 'var(--background-darker)',
        borderRight: '1px solid var(--border)',
        padding: '2rem 1rem'
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <img
            src="/logo.svg"
            alt="BoredGamer"
            style={{ height: '2rem', width: 'auto' }}
          />
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                color: 'var(--text)',
                textDecoration: 'none',
                transition: 'background-color 0.2s',
                ':hover': {
                  backgroundColor: 'var(--background-hover)'
                }
              }}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div style={{ 
          marginTop: 'auto',
          borderTop: '1px solid var(--border)',
          paddingTop: '1rem'
        }}>
          <div style={{ 
            padding: '1rem',
            backgroundColor: 'var(--background)',
            borderRadius: '0.5rem',
            marginBottom: '1rem'
          }}>
            <div style={{ 
              fontSize: '0.875rem',
              fontWeight: '500',
              marginBottom: '0.25rem'
            }}>
              {user?.name}
            </div>
            <div style={{ 
              fontSize: '0.75rem',
              color: 'var(--text-muted)'
            }}>
              {user?.email}
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="btn btn-secondary"
            style={{ width: '100%' }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: '2rem' }}>
        {children}
      </div>
    </div>
  );
}
