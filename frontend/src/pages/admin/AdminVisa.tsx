import { Pencil } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import DataTable from '../../components/admin/DataTable';
import SearchFilter from '../../components/admin/SearchFilter';
import VisaUpdateModal from '../../components/admin/VisaUpdateModal';
import VisaStatusBadge from '../../components/visa/VisaStatusBadge';
import { useAuth } from '../../context/AuthContext';
import { visaApi } from '../../lib/api';
import type { AdminVisaRow } from '../../types/visa';
import { formatVisaDate, VISA_STATUS_META, VISA_STATUSES } from '../../utils/visa';

const filterOptions = [
  { label: 'All Status', value: 'all' },
  ...VISA_STATUSES.map((value) => ({ label: VISA_STATUS_META[value].label, value })),
];

export default function AdminVisa() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AdminVisaRow[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<AdminVisaRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [savedFor, setSavedFor] = useState('');

  const loadRows = useCallback(async () => {
    if (!user?.token) {
      setLoading(false);
      return;
    }

    try {
      setLoadError('');
      setRows(await visaApi.getAdminOverview(user.token));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load visa processes');
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();

    return rows.filter((row) => {
      const status = row.visa?.status ?? 'not_started';
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (!q) return true;

      return [row.student.name, row.student.email, row.student.sapId, row.application.university, row.application.country]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [rows, query, statusFilter]);

  const handleSaved = async () => {
    setSavedFor(selected?.student.name ?? '');
    setSelected(null);
    await loadRows();
  };

  const columns = [
    {
      header: 'Student',
      accessor: 'student',
      render: (student: AdminVisaRow['student']) => (
        <div>
          <p className="font-bold text-dark-blue">{student.name}</p>
          <p className="text-xs text-slate-500">{student.sapId || student.email}</p>
        </div>
      ),
    },
    {
      header: 'Destination',
      accessor: 'application',
      render: (application: AdminVisaRow['application']) => (
        <div>
          <p className="font-semibold text-slate-700">{application.university}</p>
          <p className="text-xs text-slate-500">{application.country}</p>
        </div>
      ),
    },
    {
      header: 'Visa Status',
      accessor: 'visa',
      render: (visa: AdminVisaRow['visa']) => <VisaStatusBadge status={visa?.status ?? 'not_started'} />,
    },
    {
      header: 'Last Updated',
      accessor: 'visa',
      render: (visa: AdminVisaRow['visa']) => (visa ? formatVisaDate(visa.updatedAt) : '-'),
    },
    {
      header: 'Action',
      accessor: 'student',
      render: (_: unknown, row: AdminVisaRow) => (
        <button
          type="button"
          onClick={() => {
            setSavedFor('');
            setSelected(row);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-dark-blue transition-all hover:bg-dark-blue hover:text-white"
        >
          <Pencil className="h-3.5 w-3.5" />
          Update
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-card flex items-center justify-between rounded-[2rem] border-b border-light-color/50 bg-white p-6 pb-6 md:p-8">
        <div>
          <h2 className="mb-2 text-3xl font-black text-dark-blue">Visa Process</h2>
          <p className="mt-1 font-medium text-body-text md:text-lg">
            Update each student&apos;s visa status. They see it on their own dashboard and are notified of changes.
          </p>
        </div>
      </div>

      {loadError ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-4 font-bold text-red-600">
          <span>Failed to load: {loadError}</span>
        </div>
      ) : null}

      {savedFor ? (
        <div role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 font-bold text-emerald-700">
          Visa status updated for {savedFor}. The student has been notified.
        </div>
      ) : null}

      <div className="glass-card rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
        <SearchFilter
          onSearch={setQuery}
          onFilterChange={setStatusFilter}
          filterOptions={filterOptions}
          placeholder="Search by student, SAP ID, university or country..."
        />

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-light-color/30 bg-slate-50" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-light-color bg-slate-50 px-6 py-12 text-center">
            <h3 className="text-xl font-bold text-dark-blue">No students to process</h3>
            <p className="mt-2 text-body-text">
              Students appear here once they have an active (non-draft, non-rejected) application.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-light-color/50">
            <DataTable columns={columns} data={filteredRows} />
          </div>
        )}
      </div>

      {selected ? <VisaUpdateModal row={selected} onClose={() => setSelected(null)} onSaved={handleSaved} /> : null}
    </div>
  );
}
