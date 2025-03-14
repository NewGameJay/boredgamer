'use client';

import { useAuth } from '@/lib/auth/auth-context';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <h1 style={{ 
        fontSize: '2rem', 
        fontWeight: 'bold',
        marginBottom: '2rem'
      }}>
        Welcome back, {user?.name}!
      </h1>

      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Quick stats */}
        <div className="card">
          <h3 style={{ 
            fontSize: '1.25rem',
            fontWeight: '500',
            marginBottom: '1rem'
          }}>
            Active Features
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Object.entries(user?.features || {}).map(([feature, enabled]) => (
              <div key={feature} style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <div style={{ 
                  width: '0.5rem',
                  height: '0.5rem',
                  borderRadius: '50%',
                  backgroundColor: enabled ? 'var(--success)' : 'var(--error)'
                }} />
                <span style={{ 
                  fontSize: '0.875rem',
                  textTransform: 'capitalize'
                }}>
                  {feature.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Studio tier */}
        <div className="card">
          <h3 style={{ 
            fontSize: '1.25rem',
            fontWeight: '500',
            marginBottom: '1rem'
          }}>
            Studio Tier
          </h3>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem',
            backgroundColor: 'var(--background-darker)',
            borderRadius: '0.5rem'
          }}>
            <div style={{
              width: '3rem',
              height: '3rem',
              borderRadius: '0.5rem',
              backgroundColor: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: 'var(--background)'
            }}>
              {user?.tier?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ 
                fontSize: '1rem',
                fontWeight: '500',
                textTransform: 'capitalize'
              }}>
                {user?.tier} Plan
              </div>
              <div style={{ 
                fontSize: '0.875rem',
                color: 'var(--text-muted)'
              }}>
                Since {user?.createdAt?.toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
