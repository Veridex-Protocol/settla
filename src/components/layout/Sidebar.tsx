'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  DocumentTextIcon, 
  LinkIcon, 
  ArrowsRightLeftIcon,
  DocumentDuplicateIcon,
  Cog6ToothIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: HomeIcon },
  { name: 'Invoices', href: '/dashboard/invoices', icon: DocumentTextIcon },
  { name: 'Payment Links', href: '/dashboard/payments', icon: LinkIcon },
  { name: 'Transactions', href: '/dashboard/transactions', icon: ArrowsRightLeftIcon },
  { name: 'Receipts', href: '/dashboard/receipts', icon: DocumentDuplicateIcon },
  { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-zinc-900">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
            <span className="text-zinc-900 font-bold text-sm">S</span>
          </div>
          <span className="text-lg font-semibold text-white">Settla</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          // For Overview (/dashboard), only exact match should be active
          // For other routes, also match child routes (e.g., /dashboard/invoices/new)
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive 
                  ? 'bg-zinc-800 text-white' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }
              `}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-pink-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">My Business</p>
            <p className="text-xs text-zinc-500 truncate">Sepolia Testnet</p>
          </div>
        </div>
      </div>
    </div>
  );
}
