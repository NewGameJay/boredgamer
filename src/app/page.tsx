"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import flowchartImage from '../../public/flowchart.png';
import MouseGlow from '@/components/MouseGlow';


function RotatingWord() {
  const words = ['Leaderboards', 'Quests', 'Tournaments', 'Battle Passes', 'Communities', 'Referrals', 'Affiliates', 'Progression', 'LiveOps', 'Analytics'];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const currentWord = words[currentIndex];

    if (isDeleting) {
      if (displayText === '') {
        setIsDeleting(false);
        setCurrentIndex((prevIndex) => (prevIndex + 1) % words.length);
      } else {
        timeout = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, 50);
      }
    } else {
      if (displayText === currentWord) {
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, 2000);
      } else {
        timeout = setTimeout(() => {
          setDisplayText(currentWord.slice(0, displayText.length + 1));
        }, 100);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentIndex, words]);

  return <span className={`rotating-word ${isDeleting ? 'deleting' : ''}`}>{displayText}</span>;
}

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
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
        "Auto-generated brackets"
      ]
    },
    {
      title: "Communities & Referrals API",
      description: "Community referral and whitelisting tools.",
      features: [
        "Create and manage communities",
        "Whitelisting tools",
        "Referral analytics"
      ]
    },
    {
      title: "Creator & Affiliates API",
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
        "Tournament API (5% Prize Pool Share)",
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
        "Full Access to Tournament API (2.5% Prize Pool Share)",
        "Full Access to Communities API",
        "Progression and Live Events API (2.5% Revenue Share)",
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
        "Full Access to Communities API",
        "Progression and Live Events API (1.5% Revenue Share)",
        "Affiliates API (2% Revenue Share)",
        "Game Analytics Dashboard",
        "180-Day Data Retention"
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
        "Full Access to Progression and Live Events API",
        "Full Access to Communities API",
        "Full Access to Affiliates API (1% Revenue Share)",
        "Full Analytics Dashboard",
        "Unlimited Data Retention",
        "24/7 Dedicated Support"
      ]
    }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gradient-hero-1)' }}>
      {isMounted && <MouseGlow />}
      {/* Header */}
      <header className="header">
        <div className="container header-container">
          <div className="header-brand">
            <Link href="/" className="header-logo">boredgamer</Link>
            <nav className="header-nav">
              <Link href="#features" className="nav-link">Features</Link>
              <Link href="#docs" className="nav-link">Documentation</Link>
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
              Turn Game Data Into Experiences
            </h1>
            <p className="hero-description">
              Integrate <RotatingWord /> into your game with just a few API calls.
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

      <section className="demo-video">
        <div className="container">
          <div className="video-wrapper">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="demo-video-player"
            >
              <source src="/leaderboardwalkthrough.mp4" type="video/mp4" />
            </video>
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
                  How it Works
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
              <div className="dashboard-preview" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection:'column'  }}>
                    <Image
                      src={flowchartImage}
                      alt="BoredGamer Data Flow"
                      width={800}
                      height={500}
                      priority
                      className="dashboard-image"
                    />

                <Link href="/docs" className="btn btn-secondary btn-lg">
                View Documentation
              </Link>              
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
      <footer className="footer" style={{ padding: '1rem 0 .5rem', marginTop: '3rem' }}>
          <div className="footer-bottom" style={{ borderTop: 'none' }}>
            <p>&copy; 2025 BoredGamer. All rights reserved.</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection:'row', gap: '.5rem', paddingBottom: '1rem' }}>
        <p style={{ textAlign: 'center' }}>Powered by </p>
        <img style={{ width: '165px', height: 'auto' }} src="/core-knockout-on-dark.png" alt="BoredGamer Logo" />
        </div>
      </footer>
    </div>
  );
}
