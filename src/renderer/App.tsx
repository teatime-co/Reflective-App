import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Sidebar } from './components/Sidebar';
import { AuthGuard } from './components/auth/AuthGuard';
import { AuthPage } from './pages/AuthPage';
import { EntryList } from './pages/EntryList';
import { EntryEditor } from './pages/EntryEditor';
import { SearchPage } from './pages/SearchPage';
import { TagsPage } from './pages/TagsPage';
import { InsightsPage } from './pages/InsightsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ConflictListPage } from './pages/ConflictListPage';
import { useUIStore } from './stores/useUIStore';
import { cn } from './lib/utils';

function App() {
  const { sidebarOpen } = useUIStore();

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/auth" element={<AuthPage />} />

        <Route
          path="/*"
          element={
            <AuthGuard>
              <div className="min-h-screen bg-slate-50 flex">
                <Sidebar />
                <main
                  className={cn(
                    'flex-1 transition-all duration-300',
                    sidebarOpen ? 'ml-64' : 'ml-0'
                  )}
                >
                  <Routes>
                    <Route path="/" element={<Navigate to="/entries" replace />} />
                    <Route path="/entries" element={<EntryList />} />
                    <Route path="/editor/:id" element={<EntryEditor />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/tags" element={<TagsPage />} />
                    <Route path="/insights" element={<InsightsPage />} />
                    <Route path="/conflicts" element={<ConflictListPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/entries" replace />} />
                  </Routes>
                </main>
              </div>
            </AuthGuard>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
