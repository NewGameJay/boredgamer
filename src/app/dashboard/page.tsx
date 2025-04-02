'use client';

import { useAuth } from '@/lib/auth/auth-context';
import { SDKSetup } from '@/components/sdk/sdk-setup';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <h1 style={{ 
        fontSize: '2rem', 
        fontWeight: 'bold',
        marginBottom: '2rem',
        background: 'linear-gradient(to right, #fff, #999)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        Welcome back, {user?.name}!
      </h1>

      <div className="dashboard-grid">
        {/* Features Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Active Features</h3>
          </div>
          <div className="feature-list">
            {Object.entries(user?.features || {}).map(([feature, enabled]) => (
              <div key={feature} className="feature-item">
                <div className={`feature-status ${enabled ? 'enabled' : 'disabled'}`} />
                <span>
                  {feature.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Studio Tier Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Studio Tier</h3>
          </div>
          <div className="tier-badge">
            <div className="tier-icon">
              {user?.tier?.[0]?.toUpperCase()}
            </div>
            <div className="tier-info">
              <div className="tier-name">{user?.tier} Plan</div>
              <div className="tier-date">
                Since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Quick Actions</h3>
          </div>
          <div className="feature-list">
            <div className="feature-item">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
              </svg>
              Create New Leaderboard
            </div>
            <div className="feature-item">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z" />
              </svg>
              Generate API Key
            </div>
            <div className="feature-item">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
              View Documentation
            </div>
          </div>
        </div>
      </div>

      {/* SDK Setup Section */}
      <SDKSetup />
    </div>
  );
}
