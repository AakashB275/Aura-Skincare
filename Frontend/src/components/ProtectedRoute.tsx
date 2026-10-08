import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth'

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isLoggedIn, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to landing page if not logged in
  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  // User is authenticated, render the protected component
  return children;
};

export default ProtectedRoute;
