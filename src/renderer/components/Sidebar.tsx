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
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen bg-white border-r border-slate-200 transition-all duration-300 z-40',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        <div className="flex flex-col h-full">
          <div className={cn('flex items-center transition-all duration-300', sidebarOpen ? 'p-4' : 'p-2 justify-center')}>
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md hover:bg-slate-100 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <ScrollArea className={cn('flex-1 py-4 transition-all duration-300', sidebarOpen ? 'px-3' : 'px-2')}>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 py-2 rounded-md text-sm font-medium transition-colors',
                        sidebarOpen ? 'px-3' : 'px-0 justify-center',
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {sidebarOpen && item.label}
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
                        'flex items-center gap-3 py-2 rounded-md text-sm font-medium transition-colors',
                        sidebarOpen ? 'px-3' : 'px-0 justify-center',
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      )
                    }
                  >
                    <AlertCircle className="h-4 w-4" />
                    {sidebarOpen && (
                      <>
                        Conflicts
                        <ConflictBadge count={conflictCount} />
                      </>
                    )}
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
