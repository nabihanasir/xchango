import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({
  allowedRoles,
}: {
  allowedRoles?: string[];
}) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
    const redirectPath =
      user.role === 'admin'
        ? '/admin'
        : user.role === 'advisor'
          ? '/advisor'
          : '/dashboard';

    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
}
