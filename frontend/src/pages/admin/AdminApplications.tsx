import { useState, useEffect } from 'react';
import DataTable from '../../components/admin/DataTable';
import SearchFilter from '../../components/admin/SearchFilter';
import ApplicationDetailModal from '../../components/admin/ApplicationDetailModal';
import { Eye, FileDown, CheckSquare, UserPlus2 } from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import { applicationApi } from '../../lib/applicationApi';
import type { WorkflowApplication } from '../../types/application';
import type { AdminUserRecord } from '../../lib/adminApi';

export default function AdminApplications() {
  const [data, setData] = useState<WorkflowApplication[]>([]);
  const [filteredData, setFilteredData] = useState<WorkflowApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<WorkflowApplication | null>(null);
  const [advisors, setAdvisors] = useState<AdminUserRecord[]>([]);
  const [advisorSelections, setAdvisorSelections] = useState<Record<string, string>>({});
  const [assigningId, setAssigningId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [assignError, setAssignError] = useState('');

  const loadApplications = async () => {
    setLoading(true);
    try {
      setLoadError('');
      const [apps, users] = await Promise.all([
        adminApi.getPendingApplications(),
        adminApi.getUsers(),
      ]);
      const advisorUsers = users.filter((user) => user.role === 'advisor');
      setData(apps);
      setFilteredData(apps);
      setAdvisors(advisorUsers);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadApplications();
  }, []);

  const handleAssignAdvisor = async (applicationId: string) => {
    const advisorId = advisorSelections[applicationId];
    if (!advisorId) {
      return;
    }

    setAssigningId(applicationId);
    setAssignError('');

    try {
      await applicationApi.assignAdvisor(applicationId, advisorId);
      await loadApplications();
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'Failed to assign advisor');
    } finally {
      setAssigningId('');
    }
  };

  const columns = [
    { 
      header: 'Student', 
      accessor: 'studentId', 
      render: (val: any) => val?.name || 'Unknown' 
    },
    { header: 'University', accessor: 'university' },
    { header: 'Program', accessor: 'program' },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (val: string) => val.replace(/_/g, ' ')
    },
    { 
      header: 'Date', 
      accessor: 'createdAt',
      render: (val: string) => new Date(val).toLocaleDateString()
    },
    {
      header: 'Action',
      accessor: '_id',
      render: (_: any, row: any) => (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedApp(row)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-dark-blue hover:text-white text-dark-blue font-bold rounded-lg transition-all text-xs"
          >
            <Eye className="h-3.5 w-3.5" />
            View Details
          </button>
          <select
            value={advisorSelections[row._id] || ''}
            onChange={(event) =>
              setAdvisorSelections((current) => ({
                ...current,
                [row._id]: event.target.value,
              }))
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            <option value="">Select advisor</option>
            {advisors.map((advisor) => (
              <option key={advisor._id} value={advisor._id}>
                {advisor.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void handleAssignAdvisor(row._id)}
            disabled={!advisorSelections[row._id] || assigningId === row._id}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <UserPlus2 className="h-3.5 w-3.5" />
            {assigningId === row._id ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      )
    },
  ];

  const handleSearch = (query: string) => {
    const q = query.toLowerCase();
    const filtered = data.filter(app => {
      const studentName = typeof app.studentId === 'object' && app.studentId?.name 
        ? app.studentId.name.toLowerCase() 
        : '';
      return studentName.includes(q) || app.university.toLowerCase().includes(q);
    });
    setFilteredData(filtered);
  };

  const handleFilter = (status: string) => {
    if (status === 'all') {
      setFilteredData(data);
    } else {
      setFilteredData(data.filter(app => app.status.toLowerCase() === status.toLowerCase()));
    }
  };

  // Group statuses correctly for the filter dropdown based on actual enum values used in data
  const statusOptions = [
    { label: 'All Status', value: 'all' },
    { label: 'Pending', value: 'pending' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="flex items-center justify-between border-b border-light-color/50 pb-6 glass-card p-6 md:p-8 rounded-[2rem] bg-white">
        <div>
          <h2 className="text-3xl font-black text-dark-blue mb-2">Live Applications</h2>
          <p className="text-body-text font-medium mt-1 md:text-lg">Review pending applications and assign advisors.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
           <button className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-light-color hover:bg-slate-50 text-dark-blue font-bold rounded-xl transition-all">
             <FileDown className="w-5 h-5" /> Export Data
           </button>
           <button className="flex items-center justify-center gap-2 px-5 py-2.5 bg-dark-blue text-white font-bold rounded-xl hover:bg-navy-hover transition-all shadow-lg shadow-dark-blue/20">
             <CheckSquare className="w-5 h-5" /> Review All
           </button>
        </div>
      </div>

      {loadError && (
        <div className="p-4 bg-red-50 text-red-600 font-bold rounded-xl border border-red-100 flex items-center gap-2">
          <span>Failed to load: {loadError}</span>
        </div>
      )}

      {assignError && (
        <div className="p-4 bg-red-50 text-red-600 font-bold rounded-xl border border-red-100 flex items-center gap-2">
          <span>Failed to assign advisor: {assignError}</span>
        </div>
      )}

      <div className="glass-card rounded-[2rem] bg-white p-6 md:p-8 shadow-sm">
        <div className="mb-6">
          <SearchFilter 
            onSearch={handleSearch} 
            onFilterChange={handleFilter} 
            filterOptions={statusOptions} 
            placeholder="Search by student or university..."
          />
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-xl border border-light-color/30" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 px-6 border-2 border-dashed border-light-color rounded-2xl bg-slate-50">
            <h3 className="text-xl font-bold text-dark-blue">No Applications Found</h3>
            <p className="text-body-text mt-2">There are currently no pending applications waiting for advisor assignment.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-light-color/50">
            <DataTable columns={columns} data={filteredData} />
          </div>
        )}
      </div>

      {selectedApp && (
        <ApplicationDetailModal 
          app={selectedApp} 
          onClose={() => setSelectedApp(null)} 
          onApplicationUpdate={loadApplications}
        />
      )}
    </div>
  );
}
