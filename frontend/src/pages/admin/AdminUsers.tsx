import { useEffect, useMemo, useState } from 'react';
import DataTable from '../../components/admin/DataTable';
import SearchFilter from '../../components/admin/SearchFilter';
import { adminApi, type AdminUserRecord } from '../../lib/adminApi';

interface CreateUserFormState {
  name: string;
  email: string;
  role: 'advisor' | 'admin';
  designation: string;
  department: string;
  password: string;
}

const defaultForm: CreateUserFormState = {
  name: '',
  email: '',
  role: 'advisor',
  designation: '',
  department: '',
  password: '',
};

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<CreateUserFormState>(defaultForm);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createError, setCreateError] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await adminApi.getUsers();
        setUsers(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load users.');
      } finally {
        setLoading(false);
      }
    };

    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((record) => {
      const matchesSearch =
        record.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || record.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [roleFilter, searchQuery, users]);

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    {
      header: 'Role',
      accessor: 'role',
      render: (value: string) => value.toUpperCase(),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (_value: string, row: AdminUserRecord) => (row.isActive ? 'active' : 'inactive'),
    },
    {
      header: 'Joined Date',
      accessor: 'createdAt',
      render: (value: string) => (value ? new Date(value).toLocaleDateString() : 'N/A'),
    },
  ];

  const roleOptions = [
    { label: 'All Roles', value: 'all' },
    { label: 'Advisor', value: 'advisor' },
    { label: 'Admin', value: 'admin' },
    { label: 'Student', value: 'student' },
  ];

  const handleCreateUser = async () => {
    setSubmitting(true);
    setCreateError('');
    setGeneratedPassword('');

    try {
      const createdUser = await adminApi.createUser({
        name: form.name,
        email: form.email,
        role: form.role,
        designation: form.role === 'advisor' ? form.designation : undefined,
        department: form.role === 'advisor' ? form.department : undefined,
        password: form.password || undefined,
      });

      setUsers((current) => [createdUser, ...current]);
      setGeneratedPassword(createdUser.password || '');
      setForm(defaultForm);
      setShowAddModal(false);
    } catch (submitError) {
      setCreateError(submitError instanceof Error ? submitError.message : 'Unable to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-light-color/50 pb-6">
        <div>
          <h2 className="text-3xl font-black text-dark-blue">Users Management</h2>
          <p className="text-body-text font-medium mt-1">Create advisor accounts and manage platform users.</p>
        </div>
        <button
          onClick={() => {
            setCreateError('');
            setShowAddModal(true);
          }}
          className="px-6 py-3 bg-dark-blue text-white font-bold rounded-xl hover:bg-navy-hover transition-all shadow-lg shadow-dark-blue/20"
        >
          Add New User
        </button>
      </div>

      {generatedPassword ? (
        <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 px-6 py-5 text-sm font-medium text-emerald-800">
          Auto-generated advisor password: <span className="font-black">{generatedPassword}</span>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[1.75rem] border border-red-200 bg-red-50 px-6 py-5 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {showAddModal ? (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-dark-blue/40 p-4 py-6 backdrop-blur-sm sm:items-center">
          <div className="max-h-[calc(100vh-3rem)] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl animate-fade-in-up">
            <h3 className="text-2xl font-black text-dark-blue mb-6">Create New User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-dark-blue/60 uppercase mb-2">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/20"
                  placeholder="Advisor Name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-dark-blue/60 uppercase mb-2">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/20"
                  placeholder="advisor@xchango.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-dark-blue/60 uppercase mb-2">Role</label>
                <select
                  value={form.role}
                  onChange={(event) => setForm({ ...form, role: event.target.value as CreateUserFormState['role'] })}
                  className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/20"
                >
                  <option value="advisor">Advisor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {form.role === 'advisor' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-dark-blue/60 uppercase mb-2">Designation</label>
                    <input
                      type="text"
                      value={form.designation}
                      onChange={(event) => setForm({ ...form, designation: event.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/20"
                      placeholder="Senior Academic Advisor"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark-blue/60 uppercase mb-2">Department</label>
                    <input
                      type="text"
                      value={form.department}
                      onChange={(event) => setForm({ ...form, department: event.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/20"
                      placeholder="Computer Science"
                    />
                  </div>
                </>
              ) : null}
              <div>
                <label className="block text-xs font-bold text-dark-blue/60 uppercase mb-2">Password</label>
                <input
                  type="text"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/20"
                  placeholder="Leave blank to auto-generate"
                />
              </div>
            </div>

            {createError ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {createError}
              </div>
            ) : null}

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-6 py-3 bg-slate-100 text-dark-blue font-bold rounded-xl hover:bg-slate-200 transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleCreateUser()}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-accent-yellow text-dark-blue font-bold rounded-xl hover:bg-yellow-default transition-all shadow-lg shadow-accent-yellow/20 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <SearchFilter
        onSearch={setSearchQuery}
        onFilterChange={setRoleFilter}
        filterOptions={roleOptions}
        placeholder="Search by name or email..."
      />

      {loading ? (
        <div className="glass-card h-64 rounded-[2rem] animate-pulse" />
      ) : (
        <DataTable columns={columns} data={filteredUsers} />
      )}
    </div>
  );
}
