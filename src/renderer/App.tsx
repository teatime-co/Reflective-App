import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Sidebar } from './components/Sidebar';
import { LoadingScreen } from './components/LoadingScreen';
import { AuthPage } from './pages/AuthPage';
import { EntryList } from './pages/EntryList';
import { EntryEditor } from './pages/EntryEditor';
import { SearchPage } from './pages/SearchPage';
import { TagsPage } from './pages/TagsPage';
import { InsightsPage } from './pages/InsightsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ConflictListPage } from './pages/ConflictListPage';
import { useUIStore } from './stores/useUIStore';
import { useAuthStore } from './stores/useAuthStore';
import { cn } from './lib/utils';

function App() {
  const { sidebarOpen } = useUIStore();
  const { initAuth } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      await initAuth();
      setTimeout(() => {
        setIsInitializing(false);
      }, 500);
    };

    initialize();
  }, [initAuth]);

  if (isInitializing) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/auth" element={<AuthPage />} />

        <Route
          path="/*"
          element={
            <div className="min-h-screen bg-slate-50 flex">
              <Sidebar />
              <main
                className={cn(
                  'flex-1 transition-all duration-300',
                  sidebarOpen ? 'ml-64' : 'ml-16'
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
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
