import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import ErrorBoundary from '../components/ErrorBoundary';

const MainLayout = ({ sidebar, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleCloseSidebar = () => setSidebarOpen(false);
    window.addEventListener('closeSidebar', handleCloseSidebar);
    return () => window.removeEventListener('closeSidebar', handleCloseSidebar);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans antialiased">
      {/* SIDEBAR DINÁMICO */}
      {sidebar && React.cloneElement(sidebar, {
        isOpen: sidebarOpen,
        onClose: () => setSidebarOpen(false)
      })}

      {/* CONTENEDOR DE CONTENIDO */}
      <div className={`
        flex-1 flex flex-col min-w-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${sidebarOpen 
          ? 'pl-0 lg:pl-72' 
          : 'lg:pl-72'}
      `}>
        <Header toggleMobileSidebar={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
          <div className="max-w-[1600px] mx-auto p-4 sm:p-8 lg:p-12 pb-20 sm:pb-8 lg:pb-12">
            <ErrorBoundary>
              <div className="animate-in fade-in duration-500 fill-mode-both">
                {children || <Outlet />}
              </div>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;