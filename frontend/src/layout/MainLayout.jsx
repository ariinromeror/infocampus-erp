import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx'; 
import Header from './Header.jsx';   

const MainLayout = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
            <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <Header toggleMobileSidebar={() => setMobileMenuOpen(!mobileMenuOpen)} />
                <section className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 bg-slate-50 scroll-smooth">
                    <div className="max-w-7xl mx-auto pb-10">
                        <Outlet />
                    </div>
                </section>
            </main>
        </div>
    );
};
export default MainLayout;