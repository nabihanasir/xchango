import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { AuthProvider } from '../../context/AuthContext';

const renderProtectedRoute = (user: Record<string, string> | null, allowedRoles?: string[]) => {
  window.localStorage.clear();

  if (user) {
    window.localStorage.setItem('user', JSON.stringify(user));
  }

  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
            <Route path="/protected" element={<div>protected content</div>} />
          </Route>
          <Route path="/login" element={<div>login page</div>} />
          <Route path="/admin" element={<div>admin home</div>} />
          <Route path="/advisor" element={<div>advisor home</div>} />
          <Route path="/dashboard" element={<div>student dashboard</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
};

describe('ProtectedRoute', () => {
  it('redirects guests to the login page', () => {
    renderProtectedRoute(null, ['student']);

    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('renders the nested route for allowed roles', () => {
    renderProtectedRoute(
      {
        _id: 'student-1',
        name: 'Maha',
        email: 'maha@example.com',
        role: 'student',
        token: 'token-1',
      },
      ['student'],
    );

    expect(screen.getByText('protected content')).toBeInTheDocument();
  });

  it('redirects signed-in users to their role home when access is denied', () => {
    renderProtectedRoute(
      {
        _id: 'admin-1',
        name: 'Sana',
        email: 'sana@example.com',
        role: 'admin',
        token: 'token-2',
      },
      ['student'],
    );

    expect(screen.getByText('admin home')).toBeInTheDocument();
  });
});
