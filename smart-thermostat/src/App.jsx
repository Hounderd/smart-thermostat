import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BarChart3 } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';

function NavBar() {
  const location = useLocation();
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-card border border-gray-700 rounded-full px-6 py-3 flex gap-8 shadow-2xl z-50">
      <Link to="/" className={`flex items-center gap-2 transition-colors ${location.pathname === '/' ? 'text-neonBlue' : 'text-gray-500 hover:text-white'}`}>
        <LayoutDashboard size={20} /> <span className="font-bold text-sm">Control</span>
      </Link>
      <Link to="/analytics" className={`flex items-center gap-2 transition-colors ${location.pathname === '/analytics' ? 'text-neonBlue' : 'text-gray-500 hover:text-white'}`}>
        <BarChart3 size={20} /> <span className="font-bold text-sm">Analytics</span>
      </Link>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-white font-mono pb-24">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
        <NavBar />
      </div>
    </BrowserRouter>
  );
}

export default App;
