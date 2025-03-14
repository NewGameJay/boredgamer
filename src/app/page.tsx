"use client";

import Link from 'next/link';
import { useState } from 'react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('features');
  
  const features = [
    {
      title: "Leaderboards API",
      description: "Ranked competition, seasonal leaderboards, and global rankings.",
      features: [
        "Create real-time, daily, weekly, and seasonal leaderboards",
        "Supports custom ranking logic (Top Score, XP, win streaks)",
        "Cross-game leaderboards for multi-title studios",
        "Cheat detection with AI validation"
      ]
    },
    {
      title: "Quests & Challenges API",
      description: "Dynamic quest systems, limited-time events, and custom challenges.",
      features: [
        "Custom quests & daily challenges",
        "Event-based quest triggers",
        "AI-generated challenge recommendations",
        "Party-based quests (co-op objectives)"
      ]
    },
    {
      title: "Tournaments API",
      description: "Bracket-style competitions, real-time tournaments, and in-game prizes.",
      features: [
        "Single-elimination, round-robin, and point-based tournaments",
        "Real-time tracking of match results",
        "Entry fees & prize pools",
        "Auto-generated brackets & matchmaking"
      ]
    },
    {
      title: "Multiplayer Matchmaking API",
      description: "Advanced PVP matchmaking for multiplayer games.",
      features: [
        "Skill & web3-based matchmaking",
        "Multiplayer Server Offering (Colyseus, Photon)",
        "Custom queue logic and party rules",
        "Real-time player analytics"
      ]
    },
    {
      title: "Creator & Affiliate API",
      description: "Complete referral system for content creators and affiliates.",
      features: [
        "Custom creator referral codes",
        "Affiliate tracking & analytics",
        "Revenue sharing automation",
        "Creator performance dashboards"
      ]
    },
    {
      title: "Progression & LiveOps API",
      description: "In-game events, dynamic LiveOps tools, and battle pass mechanics.",
      features: [
        "Trigger in-game live events via API",
        "Auto-schedule boosts & sales",
        "Battle pass mechanics with rewards, milestones, and rewards",
        "Real-time event analytics"
      ]
    }
  ];

  const plans = [
    {
      name: "Independent",
      description: "Perfect for solo developers and small games",
      price: "$99",
      features: [
        "Full Access to Leaderboard API",
        "Tournament API (1% Prize Pool Share)",
        "Progression and Live Events API (5% Revenue Share)",
        "Basic Analytics Dashboard",
        "15-Day Data Retention"
      ]
    },
    {
      name: "Studio",
      description: "For growing games and indie studios",
      price: "$249",
      features: [
        "Full Access to Leaderboard API",
        "Full Access to Tournament API",
        "Progression and Live Events API (2.5% Revenue Share)",
        "Creator and Affiliate API (1% Revenue Share)",
        "Game and Marketplace Analytics Dashboard",
        "30-Day Data Retention"
      ],
      popular: true
    },
    {
      name: "Publisher",
      description: "For studios with live service titles",
      price: "$499",
      features: [
        "Full Access to Leaderboard API",
        "Full Access to Tournament API",
        "Full Access to Quests and Challenges API",
        "Full Access to Matchmaking and Party API",
        "Progression and Live Events API (1.5% Revenue Share)",
        "Creator and Affiliate API (1% Revenue Share)",
        "Game Analytics Dashboard",
        "180-Day Data Retention",
        "24/7 Dedicated Support"
      ]
    },
    {
      name: "Ecosystem",
      description: "For gaming ecosystems with multiple titles",
      price: "$999",
      features: [
        "Full Access to Leaderboard API",
        "Full Access to Tournament API",
        "Full Access to Quests and Challenges API",
        "Full Access to Matchmaking and Party API",
        "Full Access to Progression and Live Events API",
        "Creator and Affiliate API (1% Revenue Share)",
        "Full Analytics Dashboard",
        "Unlimited Data Retention",
        "24/7 Dedicated Support"
      ]
    }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gradient-background)' }}>
      {/* Header */}
      <header className="header">
        <div className="container header-container">
          <div className="header-brand">
            <h1 className="header-logo">BoredGamer</h1>
            <nav className="header-nav">
              <Link href="#features" className="nav-link">Features</Link>
              <Link href="#docs" className="nav-link">Documentation</Link>
              <Link href="#pricing" className="nav-link">Pricing</Link>
            </nav>
          </div>
          <div className="header-actions">
            <Link href="/sign-in" className="nav-link">Sign In</Link>
            <Link href="/sign-up" className="btn btn-primary">Get Started</Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-gradient-1" />
        <div className="hero-gradient-2" />
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">
              One API Suite For All
              <br />
               Your Game Features
            </h1>
            <p className="hero-description">
              Integrate live events, leaderboards, quests, tournaments, and more into your game with just a few API calls.
            </p>
            <div className="hero-actions">
              <Link href="/sign-up" className="btn btn-primary btn-lg">
                Get Started Free
              </Link>
              <Link href="/docs" className="btn btn-secondary btn-lg">
                View Documentation
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="container">
          <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
            <div className="features-header">
              <h2 className="features-title">
                Powerful APIs for Modern Games
              </h2>
              <div className="features-tabs">
                <button 
                  className={`features-tab ${activeTab === 'features' ? 'active' : ''}`}
                  onClick={() => setActiveTab('features')}
                >
                  API Features
                </button>
                <button 
                  className={`features-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setActiveTab('dashboard')}
                >
                  Developer Dashboard
                </button>
                <button 
                  className={`features-tab ${activeTab === 'pricing' ? 'active' : ''}`}
                  onClick={() => setActiveTab('pricing')}
                >
                  Pricing
                </button>
              </div>
            </div>
            
            {activeTab === 'features' && (
              <div className="features-grid">
                {features.map((feature, index) => (
                  <div key={index} className="feature-card">
                    <h3 className="feature-title">{feature.title}</h3>
                    <p className="feature-description">{feature.description}</p>
                    <ul className="feature-list">
                      {feature.features.map((item, i) => (
                        <li key={i} className="feature-list-item">{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'dashboard' && (
              <div className="dashboard-preview">
                <div className="dashboard-card">
                  <div className="dashboard-stats">
                    <div className="stat-card">
                      <h4>Active Players</h4>
                      <p className="stat-value">24,891</p>
                      <span className="stat-trend positive">↑ 12%</span>
                    </div>
                    <div className="stat-card">
                      <h4>API Requests</h4>
                      <p className="stat-value">1.2M</p>
                      <span className="stat-label">98.9% Success</span>
                    </div>
                    <div className="stat-card">
                      <h4>Active Tournaments</h4>
                      <p className="stat-value">3</p>
                      <span className="stat-label">128 Players</span>
                    </div>
                    <div className="stat-card">
                      <h4>Creator Revenue</h4>
                      <p className="stat-value">$12,450</p>
                      <span className="stat-trend positive">↑ 8%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'pricing' && (
              <div className="pricing-grid">
                {plans.map((plan, index) => (
                  <div key={index} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
                    {plan.popular && <div className="popular-badge">Most Popular</div>}
                    <div className="pricing-header">
                      <h3 className="pricing-title">{plan.name}</h3>
                      <p className="pricing-description">{plan.description}</p>
                      <div className="pricing-amount">
                        <span className="amount">{plan.price}</span>
                        <span className="period">/month</span>
                      </div>
                    </div>
                    <ul className="pricing-features">
                      {plan.features.map((feature, i) => (
                        <li key={i}>{feature}</li>
                      ))}
                    </ul>
                    <Link href="/sign-up" className="btn btn-primary">
                      Start 14-day free trial
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-section">
              <h3>Product</h3>
              <ul>
                <li><Link href="#features">Features</Link></li>
                <li><Link href="#pricing">Pricing</Link></li>
                <li><Link href="#docs">Documentation</Link></li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>Company</h3>
              <ul>
                <li><Link href="#about">About</Link></li>
                <li><Link href="#blog">Blog</Link></li>
                <li><Link href="#careers">Careers</Link></li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>Resources</h3>
              <ul>
                <li><Link href="#community">Community</Link></li>
                <li><Link href="#contact">Contact</Link></li>
                <li><Link href="#status">Status</Link></li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>Legal</h3>
              <ul>
                <li><Link href="#privacy">Privacy</Link></li>
                <li><Link href="#terms">Terms</Link></li>
                <li><Link href="#security">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 BoredGamer. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
