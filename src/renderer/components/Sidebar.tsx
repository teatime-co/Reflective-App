import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import {
  FileText,
  Search,
  Tags,
  BarChart3,
  Settings,
  Menu,
  AlertCircle
} from 'lucide-react';
import { useUIStore } from '../stores/useUIStore';
import { useConflictsStore } from '../stores/useConflictsStore';
import { ConflictBadge } from './ConflictBadge';
import { cn } from '../lib/utils';

const navItems = [
  { to: '/entries', icon: FileText, label: 'Entries' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/tags', icon: Tags, label: 'Tags' },
  { to: '/insights', icon: BarChart3, label: 'Insights' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { getConflictCount } = useConflictsStore();
  const [conflictCount, setConflictCount] = useState(0);

  useEffect(() => {
    const updateCount = async () => {
      const count = await getConflictCount();
      setConflictCount(count);
    };

    updateCount();
    const interval = setInterval(updateCount, 30000);

    return () => clearInterval(interval);
  }, [getConflictCount]);

  return (
    <>
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 rounded-md hover:bg-slate-100 transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside
        className={cn(
          'fixed left-0 top-0 h-screen bg-white border-r border-slate-200 transition-transform duration-300 z-40',
          sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-0'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 pt-16">
            <h1 className="text-2xl font-bold text-slate-900">Reflective</h1>
            <p className="text-sm text-slate-500 mt-1">Your journaling companion</p>
          </div>

          <Separator />

          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}

              {conflictCount > 0 && (
                <>
                  <Separator className="my-2" />
                  <NavLink
                    to="/conflicts"
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      )
                    }
                  >
                    <AlertCircle className="h-4 w-4" />
                    Conflicts
                    <ConflictBadge count={conflictCount} />
                  </NavLink>
                </>
              )}
            </nav>
          </ScrollArea>
        </div>
      </aside>
    </>
  );
}
