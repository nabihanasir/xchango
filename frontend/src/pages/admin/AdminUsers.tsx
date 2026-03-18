import { useState } from 'react';
import DataTable from '../../components/admin/DataTable';
import SearchFilter from '../../components/admin/SearchFilter';
import { recentUsers } from '../../data/adminData';

export default function AdminUsers() {
  const [filteredData, setFilteredData] = useState(recentUsers);

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Role', accessor: 'role' },
    { header: 'Status', accessor: 'status' },
    { header: 'Joined Date', accessor: 'joined' },
  ];

  const handleSearch = (query: string) => {
    const filtered = recentUsers.filter(user => 
      user.name.toLowerCase().includes(query.toLowerCase()) || 
      user.email.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredData(filtered);
  };

  const handleFilter = (role: string) => {
    if (role === 'all') {
      setFilteredData(recentUsers);
    } else {
      setFilteredData(recentUsers.filter(user => user.role.toLowerCase() === role.toLowerCase()));
    }
  };

  const roleOptions = [
    { label: 'All Roles', value: 'all' },
    { label: 'Student', value: 'student' },
    { label: 'Staff', value: 'staff' },
    { label: 'University Rep', value: 'university rep' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-light-color/50 pb-6">
        <div>
          <h2 className="text-3xl font-black text-dark-blue">Users Management</h2>
          <p className="text-body-text font-medium mt-1">View and manage all registered users in the platform.</p>
        </div>
        <button className="px-6 py-3 bg-dark-blue text-white font-bold rounded-xl hover:bg-navy-hover transition-all shadow-lg shadow-dark-blue/20">
          Add New User
        </button>
      </div>

      <SearchFilter 
        onSearch={handleSearch} 
        onFilterChange={handleFilter} 
        filterOptions={roleOptions} 
        placeholder="Search by name or email..."
      />

      <DataTable columns={columns} data={filteredData} />
    </div>
  );
}
