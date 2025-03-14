'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Trophy,
  Target,
  Swords,
  Users,
  Star,
  LogOut
} from 'lucide-react';

const navigation = [
  {
    name: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
    beta: false
  },
  {
    name: 'Leaderboards',
    href: '/dashboard/leaderboards',
    icon: Trophy,
    beta: false
  },
  {
    name: 'Quests & Challenges',
    href: '/dashboard/quests',
    icon: Target,
    beta: true
  },
  {
    name: 'Tournaments',
    href: '/dashboard/tournaments',
    icon: Swords,
    beta: true
  },
  {
    name: 'Matchmaking',
    href: '/dashboard/matchmaking',
    icon: Users,
    beta: true
  },
  {
    name: 'Creator & Affiliates',
    href: '/dashboard/creators',
    icon: Star,
    beta: true
  }
];

export function SideNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  if (!user) return null;

  const isFeatureEnabled = (path: string) => {
    switch (path) {
      case '/dashboard/leaderboards':
        return user.features.leaderboards;
      case '/dashboard/quests':
        return user.features.quests;
      case '/dashboard/tournaments':
        return user.features.tournaments;
      case '/dashboard/matchmaking':
        return user.features.matchmaking;
      case '/dashboard/creators':
        return user.features.creatorProgram;
      default:
        return true;
    }
  };

  return (
    <div className="flex h-screen flex-col gap-y-5 bg-black px-6 py-4">
      <Link href="/dashboard" className="flex h-16 shrink-0 items-center">
        <img
          className="h-8 w-auto"
          src="/logo.svg"
          alt="BoredGamer"
        />
      </Link>
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => {
                const isEnabled = isFeatureEnabled(item.href);
                const isActive = pathname === item.href;

                return (
                  <li key={item.name}>
                    <Link
                      href={isEnabled ? item.href : '#'}
                      className={cn(
                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6',
                        isActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                        !isEnabled && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      <item.icon className="h-6 w-6 shrink-0" />
                      {item.name}
                      {item.beta && (
                        <span className="ml-auto rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium">
                          Beta
                        </span>
                      )}
                      {!isEnabled && (
                        <span className="ml-auto rounded-full bg-gray-700 px-2 py-0.5 text-xs font-medium">
                          {user.tier === 'independent' ? 'Studio+' : 'Ecosystem'}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
          <li className="mt-auto">
            <div className="flex flex-col gap-y-4">
              <div className="flex items-center gap-x-4 px-2 py-3 text-sm font-semibold leading-6 text-white bg-gray-800 rounded-md">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-[0.625rem] font-medium text-gray-400">
                  {user.name[0].toUpperCase()}
                </span>
                <div className="flex flex-col">
                  <span className="sr-only">Your studio</span>
                  {user.name}
                  <span className="text-xs font-normal text-gray-400">
                    {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <LogOut className="h-6 w-6 shrink-0" />
                Sign out
              </button>
            </div>
          </li>
        </ul>
      </nav>
    </div>
  );
}
