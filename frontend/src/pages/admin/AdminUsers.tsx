import { useEffect, useMemo, useState } from 'react';
import DataTable from '../../components/admin/DataTable';
import SearchFilter from '../../components/admin/SearchFilter';
import { adminApi, type AdminUserRecord } from '../../lib/adminApi';
import Notice from '../../components/Notice';
import Modal from '../../components/Modal';
import { useCatalog } from '../../hooks/useCatalog';

/** Advisors receive applications for the countries ticked here. Countries come from the universities admins have added. */
function CountryCheckboxes({
  countries,
  selected,
  onChange,
}: {
  countries: string[];
  selected: string[];
  onChange: (countries: string[]) => void;
}) {
  if (!countries.length) {
    return <p className="text-sm text-slate-500">No countries yet. Add a university first (Universities tab).</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {countries.map((country) => {
        const checked = selected.includes(country);
        return (
          <label
            key={country}
            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              checked ? 'border-admin bg-admin/5 text-admin' : 'border-light-color bg-slate-50 text-slate-600'
            }`}
          >
            <input
              type="checkbox"
              className="accent-admin"
              checked={checked}
              onChange={() => onChange(checked ? selected.filter((item) => item !== country) : [...selected, country])}
            />
            {country}
          </label>
        );
      })}
    </div>
  );
}

interface CreateUserFormState {
  name: string;
  email: string;
  role: 'advisor' | 'admin';
  designation: string;
  department: string;
  countries: string[];
  password: string;
}

const defaultForm: CreateUserFormState = {
  name: '',
  email: '',
  role: 'advisor',
  designation: '',
  department: '',
  countries: [],
  password: '',
};

export default function AdminUsers() {
  const { countries: catalogCountries } = useCatalog();
  const countryNames = useMemo(() => catalogCountries.map((country) => country.name), [catalogCountries]);
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
  const [countryEdit, setCountryEdit] = useState<{ user: AdminUserRecord; countries: string[] } | null>(null);
  const [savingCountries, setSavingCountries] = useState(false);

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
      header: 'Countries',
      accessor: 'countries',
      render: (_value: unknown, row: AdminUserRecord) =>
        row.role === 'advisor' ? (
          <div className="flex items-center gap-2">
            <span>{row.countries?.length ? row.countries.join(', ') : 'None'}</span>
            <button
              onClick={() => setCountryEdit({ user: row, countries: row.countries ?? [] })}
              className="text-xs font-bold text-admin underline"
            >
              Edit
            </button>
          </div>
        ) : (
          '—'
        ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (_value: string, row: AdminUserRecord) => (row.offboardedAt ? 'off-boarded' : row.isActive ? 'active' : 'inactive'),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (_value: string, row: AdminUserRecord) =>
        row.offboardedAt ? (
          <button
            onClick={() => void handleReactivate(row._id)}
            className="px-4 py-2 bg-admin hover:bg-admin-hover text-white text-xs font-bold rounded-lg hover:brightness-110 transition-all"
          >
            Re-activate
          </button>
        ) : null,
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

  const handleReactivate = async (userId: string) => {
    try {
      const updated = await adminApi.reactivateStudent(userId);
      setUsers((current) => current.map((record) => (record._id === userId ? { ...record, ...updated, offboardedAt: undefined } : record)));
    } catch (reactivateError) {
      setError(reactivateError instanceof Error ? reactivateError.message : 'Unable to re-activate student.');
    }
  };

  const handleSaveCountries = async () => {
    if (!countryEdit) return;
    setSavingCountries(true);
    try {
      const result = await adminApi.setAdvisorCountries(countryEdit.user._id, countryEdit.countries);
      setUsers((current) =>
        current.map((record) => (record._id === result._id ? { ...record, countries: result.countries } : record))
      );
      setCountryEdit(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update countries.');
      setCountryEdit(null);
    } finally {
      setSavingCountries(false);
    }
  };

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
        countries: form.role === 'advisor' ? form.countries : undefined,
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
          <h2 className="text-3xl font-bold text-admin">Users Management</h2>
          <p className="text-body-text font-medium mt-1">Create advisor accounts and manage platform users.</p>
        </div>
        <button
          onClick={() => {
            setCreateError('');
            setShowAddModal(true);
          }}
          className="px-6 py-3 bg-admin hover:bg-admin-hover text-white font-bold rounded-xl hover:brightness-110 transition-all shadow-lg shadow-admin/20"
        >
          Add New User
        </button>
      </div>

      {generatedPassword ? (
        <Notice tone="success">
          Auto-generated advisor password: <span className="font-bold">{generatedPassword}</span>
        </Notice>
      ) : null}

      {error ? (
        <Notice tone="error">{error}</Notice>
      ) : null}

      {showAddModal ? (
        <Modal onClose={() => setShowAddModal(false)} widthClass="max-w-md" locked={submitting}>
          <div className="overflow-y-auto p-8">
            <h3 className="text-2xl font-bold text-admin mb-6">Create New User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-admin/60 uppercase mb-2">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/20"
                  placeholder="Advisor Name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-admin/60 uppercase mb-2">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/20"
                  placeholder="advisor@xchango.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-admin/60 uppercase mb-2">Role</label>
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
                    <label className="block text-xs font-bold text-admin/60 uppercase mb-2">Designation</label>
                    <input
                      type="text"
                      value={form.designation}
                      onChange={(event) => setForm({ ...form, designation: event.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/20"
                      placeholder="Senior Academic Advisor"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-admin/60 uppercase mb-2">Department</label>
                    <input
                      type="text"
                      value={form.department}
                      onChange={(event) => setForm({ ...form, department: event.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/20"
                      placeholder="Computer Science"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-admin/60 uppercase mb-2">Supervises countries</label>
                    <CountryCheckboxes countries={countryNames} selected={form.countries} onChange={(countries) => setForm({ ...form, countries })} />
                    <p className="mt-2 text-xs text-slate-500">Applications to these countries are assigned to this advisor automatically.</p>
                  </div>
                </>
              ) : null}
              <div>
                <label className="block text-xs font-bold text-admin/60 uppercase mb-2">Password</label>
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
              <Notice tone="error">{createError}</Notice>
            ) : null}

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-6 py-3 bg-slate-100 text-admin font-bold rounded-xl hover:bg-slate-200 transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleCreateUser()}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-accent-yellow text-admin font-bold rounded-xl hover:bg-yellow-default transition-all shadow-lg shadow-accent-yellow/20 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {countryEdit ? (
        <Modal onClose={() => setCountryEdit(null)} widthClass="max-w-md" locked={savingCountries}>
          <div className="overflow-y-auto p-8">
            <h3 className="text-xl font-bold text-admin">Countries for {countryEdit.user.name}</h3>
            <p className="mt-2 text-sm text-slate-500">New applications to these countries are assigned to this advisor.</p>
            <div className="mt-5">
              <CountryCheckboxes
                countries={countryNames}
                selected={countryEdit.countries}
                onChange={(countries) => setCountryEdit({ ...countryEdit, countries })}
              />
            </div>
            <div className="mt-8 flex gap-4">
              <button
                onClick={() => setCountryEdit(null)}
                className="flex-1 rounded-xl bg-slate-100 px-6 py-3 text-sm font-bold text-admin transition-all hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSaveCountries()}
                disabled={savingCountries}
                className="flex-1 rounded-xl bg-accent-yellow px-6 py-3 text-sm font-bold text-admin transition-all hover:bg-yellow-default disabled:opacity-60"
              >
                {savingCountries ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
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
