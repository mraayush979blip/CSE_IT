
import React from 'react';
import { Navigate } from 'react-router-dom';
import { User, UserRole } from '../types';

interface ProtectedRouteProps {
  user: User | null;
  allowedRoles?: UserRole[];
  children: JSX.Element;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ user, allowedRoles, children }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Determine where to redirect if role doesn't match, or show unauthorized
    // For now, redirect to their dashboard if they are logged in but wrong role
    if (user.role === UserRole.ADMIN) return <Navigate to="/admin" replace />;
    if (user.role === UserRole.FACULTY) return <Navigate to="/faculty" replace />;
    if (user.role === UserRole.STUDENT) return <Navigate to="/student" replace />;
    
    return <div className="p-10 text-center">Unauthorized Access</div>;
  }

  return children;
};
