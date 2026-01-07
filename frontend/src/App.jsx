import { useState } from 'react';
import { LayoutDashboard, Calculator, FileJson, Settings, Menu, Users, Activity } from 'lucide-react';
import MurabahaCalculator from './components/MurabahaCalculator';
import Clients from './pages/Clients';
import Dashboard from './pages/Dashboard';
import BlockchainAudit from './pages/BlockchainAudit';

// Mock data moved to Dashboard.jsx

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');

  const renderContent = () => {
    switch (activeView) {
      case 'murabaha':
        return <MurabahaCalculator />;
      case 'clients':
        return <Clients />;
      case 'audit':
        return <BlockchainAudit />;
      case 'dashboard':
      default:
        return <Dashboard />;
    }
  };

  const NavItem = ({ id, icon: Icon, label }) => (
    <li>
      <button
        onClick={() => setActiveView(id)}
        className={`flex items-center w-full p-2.5 rounded-lg transition-all duration-200 ${activeView === id
          ? 'bg-[#ea580c] text-white shadow-md shadow-orange-900/20'
          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
      >
        <Icon size={20} />
        <span className={`ml-3 font-medium ${!isSidebarOpen && 'hidden'}`}>{label}</span>
      </button>
    </li>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`bg-[#1c1917] text-white transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'
          } flex flex-col shadow-xl z-20`}
      >
        <div className="p-4 flex items-center justify-between border-b border-gray-800">
          <div className={`flex items-center gap-3 ${!isSidebarOpen && 'justify-center w-full'}`}>
            <img src="/logo.png" alt="Mizan Logo" className="h-8 w-auto object-contain" />
            <span className={`font-bold text-xl tracking-tight ${!isSidebarOpen && 'hidden'}`}>Mizan</span>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-1 hover:bg-gray-800 rounded ${!isSidebarOpen && 'hidden'}`}>
            <Menu size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6">
          <ul className="space-y-1 px-3">
            <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem id="clients" icon={Users} label="Client Manager" />
            <NavItem id="murabaha" icon={Calculator} label="Murabaha Engine" />
            <NavItem id="audit" icon={FileJson} label="Blockchain Audit" />

            <li className="pt-4 pb-2">
              <div className={`text-xs font-semibold text-gray-600 uppercase tracking-wider px-3 ${!isSidebarOpen && 'hidden'}`}>
                System
              </div>
            </li>

            <NavItem id="settings" icon={Settings} label="Settings" />
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-800 text-sm text-gray-500 bg-[#151210]">
          <div className={`flex items-center gap-2 ${!isSidebarOpen && 'justify-center'}`}>
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className={`${!isSidebarOpen && 'hidden'}`}>v2.0 Alpha</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[#fafaf9] p-8">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
