import { useState } from 'react';
import DataTable from '../../components/admin/DataTable';
import SearchFilter from '../../components/admin/SearchFilter';
import { recentUsers } from '../../data/adminData';

export default function AdminUsers() {
  const [filteredData, setFilteredData] = useState(recentUsers);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '', role: 'advisor', password: 'password123' });

  const columns = [
    { 
      header: 'Name', 
      accessor: 'name',
      render: (value: any, row: any) => `${row.name || (row.firstName + ' ' + row.lastName)}`
    },
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
    { label: 'Advisor', value: 'advisor' },
    { label: 'Admin', value: 'admin' },
  ];

  const handleCreateUser = async () => {
    console.log('Creating user:', newUser);
    // In a real app, call API here
    setFilteredData([...filteredData, { ...newUser, id: Date.now(), status: 'active', joined: new Date().toISOString().split('T')[0], name: `${newUser.firstName} ${newUser.lastName}` }]);
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-light-color/50 pb-6">
        <div>
          <h2 className="text-3xl font-black text-dark-blue">Users Management</h2>
          <p className="text-body-text font-medium mt-1">View and manage all registered users in the platform.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-dark-blue text-white font-bold rounded-xl hover:bg-navy-hover transition-all shadow-lg shadow-dark-blue/20"
        >
          Add New User
        </button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-dark-blue/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-fade-in-up">
            <h3 className="text-2xl font-black text-dark-blue mb-6">Create New User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-dark-blue/60 uppercase mb-2">First Name</label>
                <input 
                  type="text" 
                  value={newUser.firstName}
                  onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/20" 
                  placeholder="First Name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-dark-blue/60 uppercase mb-2">Last Name</label>
                <input 
                  type="text" 
                  value={newUser.lastName}
                  onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/20" 
                  placeholder="Last Name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-dark-blue/60 uppercase mb-2">Email</label>
                <input 
                  type="email" 
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/20" 
                  placeholder="Email"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-dark-blue/60 uppercase mb-2">Role</label>
                <select 
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/20"
                >
                  <option value="advisor">Advisor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-6 py-3 bg-slate-100 text-dark-blue font-bold rounded-xl hover:bg-slate-200 transition-all text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateUser}
                className="flex-1 px-6 py-3 bg-accent-yellow text-dark-blue font-bold rounded-xl hover:bg-yellow-default transition-all shadow-lg shadow-accent-yellow/20 text-sm"
              >
                Create User
              </button>
            </div>
          </div>
        </div>
      )}

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
