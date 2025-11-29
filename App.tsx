import React, { useState, useEffect } from 'react';
import { AppRoute, Candidate } from './types';
import Layout from './components/Layout';
import Login from './pages/Login';
import Instructions from './pages/Instructions';
import Exam from './pages/Exam';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';
import ThankYou from './pages/ThankYou';
import { db } from './services/db';

const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(AppRoute.LOGIN);
  const [currentUser, setCurrentUser] = useState<Candidate | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      try {
        await db.initialize();
      } catch (e: any) {
        console.error("Initialization warning:", e);
      } finally {
        setIsAppLoading(false);
      }
    };
    initApp();
  }, []);

  const handleAdminClick = () => {
    setCurrentRoute(AppRoute.ADMIN_LOGIN);
  };

  const handleAdminAuth = (password: string) => {
    if (password === 'Qbend#123') {
      setIsAdmin(true);
      setCurrentRoute(AppRoute.ADMIN_DASHBOARD);
      return true;
    }
    return false;
  };

  const handleRegister = (candidate: Candidate) => {
    setCurrentUser(candidate);
    setCurrentRoute(AppRoute.INSTRUCTIONS);
  };

  const handleStartExam = () => {
    setCurrentRoute(AppRoute.EXAM);
  };

  const handleLogout = () => {
    setCurrentUser(undefined);
    setIsAdmin(false);
    setCurrentRoute(AppRoute.LOGIN);
  };

  const handleExamFinish = () => {
    setCurrentRoute(AppRoute.THANK_YOU);
  };

  const renderContent = () => {
    switch (currentRoute) {
      case AppRoute.LOGIN:
        return <Login onRegister={handleRegister} onAdminClick={handleAdminClick} />;
      case AppRoute.ADMIN_LOGIN:
        return <AdminLogin onLogin={handleAdminAuth} onBack={() => setCurrentRoute(AppRoute.LOGIN)} />;
      case AppRoute.INSTRUCTIONS:
        return <Instructions onStart={handleStartExam} candidateName={currentUser?.fullName} />;
      case AppRoute.EXAM:
        if (!currentUser) return <Login onRegister={handleRegister} onAdminClick={handleAdminClick} />;
        return <Exam candidateId={currentUser.id} onFinish={handleExamFinish} />;
      case AppRoute.THANK_YOU:
        return <ThankYou onHome={handleLogout} />;
      case AppRoute.ADMIN_DASHBOARD:
        return isAdmin ? <Admin /> : <div className="p-8 text-center text-red-600">Access Denied</div>;
      default:
        return <div>Page not found</div>;
    }
  };

  if (isAppLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Starting System...</h2>
        </div>
      </div>
    );
  }

  return (
    <Layout 
      user={currentUser ? { name: currentUser.fullName } : undefined} 
      onLogout={handleLogout}
      isAdmin={isAdmin}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;