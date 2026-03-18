import { useState } from 'react';
import DataTable from '../../components/admin/DataTable';
import SearchFilter from '../../components/admin/SearchFilter';
import { recentApplications } from '../../data/adminData';
import ApplicationDetailModal from '../../components/admin/ApplicationDetailModal';
import { Eye } from 'lucide-react';

export default function AdminApplications() {
  const [filteredData, setFilteredData] = useState(recentApplications);
  const [selectedApp, setSelectedApp] = useState<any>(null);

  const columns = [
    { header: 'Student', accessor: 'student' },
    { header: 'University', accessor: 'university' },
    { header: 'Program', accessor: 'program' },
    { header: 'Status', accessor: 'status' },
    { header: 'Date', accessor: 'date' },
    {
      header: 'Action',
      accessor: 'id',
      render: (_: any, row: any) => (
        <button
          onClick={() => setSelectedApp(row)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-dark-blue hover:text-white text-dark-blue font-bold rounded-lg transition-all text-xs"
        >
          <Eye className="h-3.5 w-3.5" />
          View Details
        </button>
      )
    },
  ];

  const handleSearch = (query: string) => {
    const filtered = recentApplications.filter(app =>
      app.student.toLowerCase().includes(query.toLowerCase()) ||
      app.university.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredData(filtered);
  };

  const handleFilter = (status: string) => {
    if (status === 'all') {
      setFilteredData(recentApplications);
    } else {
      setFilteredData(recentApplications.filter(app => app.status.toLowerCase() === status.toLowerCase()));
    }
  };

  const statusOptions = [
    { label: 'All Status', value: 'all' },
    { label: 'Approved', value: 'approved' },
    { label: 'Pending', value: 'pending' },
    { label: 'Rejected', value: 'rejected' },
  ];

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between border-b border-light-color/50 pb-6">
        <div>
          <h2 className="text-3xl font-black text-dark-blue">Applications</h2>
          <p className="text-body-text font-medium mt-1">Monitor and review student applications across universities.</p>
        </div>
        <div className="flex gap-3">
           <button className="px-5 py-2.5 bg-white border border-light-color hover:bg-slate-50 text-dark-blue font-bold rounded-xl transition-all">
             Export CSV
           </button>
           <button className="px-5 py-2.5 bg-dark-blue text-white font-bold rounded-xl hover:bg-navy-hover transition-all shadow-lg shadow-dark-blue/20">
             Review All
           </button>
        </div>
      </div>

      <SearchFilter 
        onSearch={handleSearch} 
        onFilterChange={handleFilter} 
        filterOptions={statusOptions} 
        placeholder="Search by student or university..."
      />

      <DataTable columns={columns} data={filteredData} />

      {selectedApp && (
        <ApplicationDetailModal 
          app={selectedApp} 
          onClose={() => setSelectedApp(null)} 
        />
      )}
    </div>
  );
}
