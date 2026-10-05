import React, { useEffect } from 'react';
import { AddSheet } from './components/AddSheet';
import { DropZone } from './components/DropZone';
import { Wordmark } from './components/Icon';
import { Toaster } from './components/ui';
import { match, navigate, useRoute } from './lib/router';
import { BookEditor, BookHome, ReadScreen } from './screens/BookScreens';
import { BuildBook } from './screens/BuildBook';
import { Film } from './screens/Film';
import { Home } from './screens/Home';
import { Landing } from './screens/Landing';
import { Memories } from './screens/Memories';
import { MemoryDetail } from './screens/MemoryDetail';
import { MemoryEditor } from './screens/MemoryEditor';
import { Milestones } from './screens/Milestones';
import { Onboarding } from './screens/Onboarding';
import { Settings } from './screens/Settings';
import { ExportScreen } from './screens/ShareExport';
import { SharedBook } from './screens/SharedBook';
import { AppProvider, useApp } from './state/store';

function Routes() {
  const { path } = useRoute();
  const { ready, account, baby } = useApp();

  useEffect(() => {
    if (!path.startsWith('/read') && !path.startsWith('/b/')) window.scrollTo({ top: 0 });
  }, [path]);

  if (!ready) {
    return <div className="splash"><Wordmark size={24} /></div>;
  }

  const shared = match('/b/:token', path);
  if (shared) return <SharedBook token={shared.token} />;

  if (!account) return <Landing />;
  if (!baby) return <Onboarding />;

  let p: Record<string, string> | null;
  if ((p = match('/memory/:id/edit', path))) return <MemoryEditor key={p.id} editId={p.id} />;
  if ((p = match('/memory/:id', path))) return <MemoryDetail key={p.id} id={p.id} />;
  switch (path) {
    case '/memories': return <Memories />;
    case '/new': return <MemoryEditor />;
    case '/milestones': return <Milestones />;
    case '/book': return <BookHome />;
    case '/book/build': return <BuildBook />;
    case '/book/edit': return <BookEditor />;
    case '/read': return <ReadScreen />;
    case '/export': return <ExportScreen />;
    case '/film': return <Film />;
    case '/settings': return <Settings />;
    case '/home': return <Home />;
    default:
      queueMicrotask(() => navigate('/home', { replace: true }));
      return <Home />;
  }
}

export function App() {
  return (
    <AppProvider>
      <Routes />
      <AddSheet />
      <DropZone />
      <Toaster />
    </AppProvider>
  );
}
