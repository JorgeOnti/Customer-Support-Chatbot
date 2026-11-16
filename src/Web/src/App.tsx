import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { ConversationsPage } from './pages/ConversationsPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { StorefrontPage } from './pages/StorefrontPage';
import { SupportTicketsPage } from './pages/SupportTicketsPage';

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-stone-50 text-stone-900">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<StorefrontPage />} />
            <Route path="/admin/knowledge" element={<KnowledgeBasePage />} />
            <Route path="/admin/tickets" element={<SupportTicketsPage />} />
            <Route path="/admin/conversations" element={<ConversationsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
