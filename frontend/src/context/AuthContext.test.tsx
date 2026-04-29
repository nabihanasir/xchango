import { fireEvent, render, screen } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

const demoUser = {
  _id: 'user-1',
  name: 'Areeba',
  email: 'areeba@example.com',
  role: 'student',
  token: 'token-123',
};

function AuthHarness() {
  const { user, login, logout } = useAuth();

  return (
    <div>
      <span>{user ? user.name : 'anonymous'}</span>
      <button type="button" onClick={() => login(demoUser)}>
        sign in
      </button>
      <button type="button" onClick={logout}>
        sign out
      </button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('hydrates the user from localStorage', () => {
    window.localStorage.setItem('user', JSON.stringify(demoUser));

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    expect(screen.getByText('Areeba')).toBeInTheDocument();
  });

  it('stores login state and clears it on logout', async () => {
    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    expect(screen.getByText('anonymous')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'sign in' }));
    expect(screen.getByText('Areeba')).toBeInTheDocument();
    expect(window.localStorage.getItem('user')).toContain('Areeba');

    fireEvent.click(screen.getByRole('button', { name: 'sign out' }));
    expect(screen.getByText('anonymous')).toBeInTheDocument();
    expect(window.localStorage.getItem('user')).toBeNull();
  });
});
