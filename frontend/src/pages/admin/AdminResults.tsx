import { useEffect, useState } from 'react';
import { FileDown } from 'lucide-react';
import DataTable from '../../components/admin/DataTable';
import SearchFilter from '../../components/admin/SearchFilter';
import { useAuth } from '../../context/AuthContext';
import { resultsApi } from '../../lib/api';
import { resolveUploadUrl } from '../../lib/studentProfileApi';
import type { StudentResult } from '../../types/result';

const getName = (value: StudentResult['studentId']) => (typeof value === 'string' ? value : value?.name || 'Unknown');
const getEmail = (value: StudentResult['studentId']) => (typeof value === 'string' ? '' : value?.email || '');
const getAdvisorName = (value: StudentResult['advisorId']) => (typeof value === 'string' ? value : value?.name || 'Unknown');
const getCourseTitle = (course: StudentResult['hostCourseId']) => course?.title || course?.name || course?.code || 'Untitled course';

export default function AdminResults() {
  const { user } = useAuth();
  const [data, setData] = useState<StudentResult[]>([]);
  const [filteredData, setFilteredData] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const loadResults = async () => {
      if (!user?.token) {
        setLoading(false);
        return;
      }

      try {
        setLoadError('');
        const response = await resultsApi.getAdminResults(user.token);
        setData(response);
        setFilteredData(response);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load results');
      } finally {
        setLoading(false);
      }
    };

    void loadResults();
  }, [user?.token]);

  const handleSearch = (query: string) => {
    const q = query.toLowerCase();
    setFilteredData(
      data.filter((result) => {
        const studentName = getName(result.studentId).toLowerCase();
        const course = getCourseTitle(result.hostCourseId).toLowerCase();
        return studentName.includes(q) || course.includes(q);
      })
    );
  };

  const handleFilter = (status: string) => {
    setFilteredData(status === 'all' ? data : data.filter((result) => result.status === status));
  };

  const columns = [
    { header: 'Student', accessor: 'studentId', render: (val: StudentResult['studentId']) => getName(val) },
    { header: 'Email', accessor: 'studentId', render: (val: StudentResult['studentId']) => getEmail(val) },
    { header: 'Course', accessor: 'hostCourseId', render: (val: StudentResult['hostCourseId']) => getCourseTitle(val) },
    { header: 'Advisor', accessor: 'advisorId', render: (val: StudentResult['advisorId']) => getAdvisorName(val) },
    { header: 'Grade', accessor: 'grade' },
    { header: 'Marks', accessor: 'marks', render: (val: number | null | undefined) => (val != null ? `${val}/100` : '-') },
    {
      header: 'Status',
      accessor: 'status',
      render: (val: string) => (
        <span
          className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] ${
            val === 'published' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'
          }`}
        >
          {val}
        </span>
      ),
    },
    {
      header: 'File',
      accessor: 'resultFileUrl',
      render: (val: string) =>
        val ? (
          <a href={resolveUploadUrl(val)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-dark-blue">
            <FileDown className="h-3.5 w-3.5" />
            View
          </a>
        ) : (
          '-'
        ),
    },
  ];

  const statusOptions = [
    { label: 'All Status', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-light-color/50 pb-6 glass-card p-6 md:p-8 rounded-[2rem] bg-white">
        <div>
          <h2 className="text-3xl font-black text-dark-blue mb-2">Student Results</h2>
          <p className="text-body-text font-medium mt-1 md:text-lg">
            View every result advisors have entered for enrolled host courses.
          </p>
        </div>
      </div>

      {loadError && (
        <div className="p-4 bg-red-50 text-red-600 font-bold rounded-xl border border-red-100 flex items-center gap-2">
          <span>Failed to load: {loadError}</span>
        </div>
      )}

      <div className="glass-card rounded-[2rem] bg-white p-6 md:p-8 shadow-sm">
        <div className="mb-6">
          <SearchFilter onSearch={handleSearch} onFilterChange={handleFilter} filterOptions={statusOptions} placeholder="Search by student or course..." />
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-xl border border-light-color/30" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 px-6 border-2 border-dashed border-light-color rounded-2xl bg-slate-50">
            <h3 className="text-xl font-bold text-dark-blue">No Results Found</h3>
            <p className="text-body-text mt-2">No results have been entered yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-light-color/50">
            <DataTable columns={columns} data={filteredData} />
          </div>
        )}
      </div>
    </div>
  );
}
