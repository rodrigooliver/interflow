import React, { useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Chats from './pages/Chats';
import Chat from './pages/Chat';
import Customers from './pages/Customers';
import CustomerChats from './pages/CustomerChats';
import AddCustomer from './pages/AddCustomer';
import SettingsPage from './pages/Settings';
import Login from './pages/Login';
import Organizations from './pages/admin/Organizations';
import AddOrganization from './pages/admin/AddOrganization';
import TeamMembers from './pages/organization/TeamMembers';
import ServiceTeams from './pages/organization/ServiceTeams';
import Channels from './pages/organization/Channels';
import SelectChannelType from './pages/organization/channels/SelectChannelType';
import EmailChannelForm from './pages/organization/channels/EmailChannelForm';
import WhatsAppOfficialForm from './pages/organization/channels/WhatsAppOfficialForm';
import WhatsAppWApiForm from './pages/organization/channels/WhatsAppWApiForm';
import WhatsAppZApiForm from './pages/organization/channels/WhatsAppZApiForm';
import WhatsAppEvoForm from './pages/organization/channels/WhatsAppEvoForm';
import FacebookForm from './pages/organization/channels/FacebookForm';
import InstagramForm from './pages/organization/channels/InstagramForm';
import MessageShortcuts from './pages/organization/MessageShortcuts';
import FlowList from './pages/FlowList';
import FlowEditor from './pages/FlowEditor';
import CRMFunnels from './pages/CRMFunnels';
import CRMFunnel from './pages/CRMFunnel';
import Profile from './pages/Profile';
import Tags from './pages/Tags';
import Prompts from './pages/Prompts';
import { useAuth } from './hooks/useAuth';
import { LoadingScreen } from './components/LoadingScreen';

function App() {
  const { session, profile, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Login />;
  }

  return (
    <Router>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        {/* Mobile menu button */}
        <button
          type="button"
          className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 shadow-lg"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-50 lg:relative lg:z-0 transform ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } transition-transform duration-300 ease-in-out`}
        >
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="min-h-full">
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/chats" element={<Chats />} />
                <Route path="/chats/:id" element={<Chat />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/customers/:id/chats" element={<CustomerChats />} />
                <Route path="/customers/add" element={<AddCustomer />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/team" element={<TeamMembers />} />
                <Route path="/service-teams" element={<ServiceTeams />} />
                <Route path="/channels" element={<Channels />} />
                <Route path="/channels/new" element={<SelectChannelType />} />
                <Route path="/channels/new/email" element={<EmailChannelForm />} />
                <Route path="/channels/new/whatsapp_official" element={<WhatsAppOfficialForm />} />
                <Route path="/channels/new/whatsapp_wapi" element={<WhatsAppWApiForm />} />
                <Route path="/channels/new/whatsapp_zapi" element={<WhatsAppZApiForm />} />
                <Route path="/channels/new/whatsapp_evo" element={<WhatsAppEvoForm />} />
                <Route path="/channels/new/facebook" element={<FacebookForm />} />
                <Route path="/channels/new/instagram" element={<InstagramForm />} />
                <Route path="/channels/:id/edit/email" element={<EmailChannelForm />} />
                <Route path="/channels/:id/edit/whatsapp_official" element={<WhatsAppOfficialForm />} />
                <Route path="/channels/:id/edit/whatsapp_wapi" element={<WhatsAppWApiForm />} />
                <Route path="/channels/:id/edit/whatsapp_zapi" element={<WhatsAppZApiForm />} />
                <Route path="/channels/:id/edit/whatsapp_evo" element={<WhatsAppEvoForm />} />
                <Route path="/channels/:id/edit/facebook" element={<FacebookForm />} />
                <Route path="/channels/:id/edit/instagram" element={<InstagramForm />} />
                <Route path="/shortcuts" element={<MessageShortcuts />} />
                <Route path="/flows" element={<FlowList />} />
                <Route path="/flows/:id" element={<FlowEditor />} />
                <Route path="/crm" element={<CRMFunnels />} />
                <Route path="/crm/:id" element={<CRMFunnel />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/tags" element={<Tags />} />
                <Route path="/prompts" element={<Prompts />} />
                {profile?.is_superadmin && (
                  <>
                    <Route path="/admin/organizations" element={<Organizations />} />
                    <Route path="/admin/organizations/add" element={<AddOrganization />} />
                  </>
                )}
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;