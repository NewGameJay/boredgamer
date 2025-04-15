import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar,
} from 'recharts';
// Duplicate of interface from page.tsx
export interface Community {
  id: string;
  name: string;
  description: string;
  type: 'public' | 'private';
  referee: 'guild' | 'creator' | 'individual' | 'partner';
  platform: 'pc' | 'console' | 'mobile';
  rules: string[];
  rewards: {
    type: string;
    amount: number;
    metadata?: Record<string, any>;
  }[];
  memberCount: number;
  studioId: string;
  createdAt: string;
  visitCount: number;
  lastVisitedAt?: string;
  status: 'active' | 'archived';
  referralGame: string;
  referralSlug: string;
  referralDestination: string;
}


// Helper to get color
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a259ec', '#f24e1e', '#f7b731', '#26de81'];

// 1. Line Chart: Total Clicks Over Time (simulate with visitCount for now)
export function AnalyticsLineChart({ communities }: { communities: Community[] }) {
  // Simulate: x = community name, y = visitCount
  const data = communities.map((c) => ({ name: c.name, clicks: c.visitCount || 0 }));
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Line type="monotone" dataKey="clicks" stroke="#0088FE" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// 2. Pie Chart: Most Clicked Links (by referralSlug)
export function AnalyticsPieChartLinks({ communities }: { communities: Community[] }) {
  const data = communities.map((c) => ({ name: `${c.referralGame}/${c.referralSlug}`, value: c.visitCount || 0 }));
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
          {data.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// 3. Pie Chart: By Community Name
export function AnalyticsPieChartCommunity({ communities }: { communities: Community[] }) {
  const data = communities.map((c) => ({ name: c.name, value: c.visitCount || 0 }));
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
          {data.map((_, i) => <Cell key={`cell2-${i}`} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// 4. Pie Chart: By Referee
export function AnalyticsPieChartReferee({ communities }: { communities: Community[] }) {
  // Group by referee
  const grouped: Record<string, number> = {};
  communities.forEach((c) => {
    grouped[c.referee] = (grouped[c.referee] || 0) + (c.visitCount || 0);
  });
  const data = Object.entries(grouped).map(([name, value]) => ({ name, value }));
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
          {data.map((_, i) => <Cell key={`cell3-${i}`} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// 5. Bar Chart: By Referrer (placeholder, as referrer data is not tracked)
export function AnalyticsBarChartReferrer() {
  // Placeholder data
  const data = [
    { referrer: 'Direct', clicks: 0 },
    { referrer: 'Discord', clicks: 0 },
    { referrer: 'Twitter', clicks: 0 },
    { referrer: 'Other', clicks: 0 },
  ];
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="referrer" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="clicks" fill="#a259ec" />
      </BarChart>
    </ResponsiveContainer>
  );
}
