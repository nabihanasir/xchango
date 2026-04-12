import { useState, useEffect } from 'react';
import DataTable from '../../components/admin/DataTable';
import { Plus, X, GraduationCap, Building } from 'lucide-react';
import { adminApi, type UniversityRecord, type CountryRecord } from '../../lib/adminApi';

export default function AdminUniversities() {
  const [data, setData] = useState<UniversityRecord[]>([]);
  const [countries, setCountries] = useState<CountryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUniversity, setNewUniversity] = useState({ name: '', countryId: '', website: '', seatLimit: 0 });
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [univs, cntrs] = await Promise.all([
        adminApi.getUniversities(),
        adminApi.getCountries()
      ]);
      setData(univs);
      setCountries(cntrs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await adminApi.createUniversity(newUniversity);
      setIsModalOpen(false);
      setNewUniversity({ name: '', countryId: '', website: '', seatLimit: 0 });
      await loadData();
    } catch (err: any) {
      alert(`Failed to create university: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    { header: 'University Name', accessor: 'name' },
    { 
      header: 'Country', 
      accessor: 'countryId',
      render: (val: any) => typeof val === 'object' && val ? val.name : val
    },
    { header: 'Website', accessor: 'website', render: (val: string) => val ? <a href={val} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{val}</a> : 'N/A' },
    { header: 'Seat Limit', accessor: 'seatLimit' },
    { 
      header: 'Added', 
      accessor: 'createdAt',
      render: (val: string) => val ? new Date(val).toLocaleDateString() : 'N/A'
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in relative z-0">
       <div className="flex items-center justify-between border-b border-light-color/50 pb-6 glass-card p-6 md:p-8 rounded-[2rem] bg-white">
        <div>
          <h2 className="text-3xl font-black text-dark-blue mb-2">Universities Catalog</h2>
          <p className="text-body-text font-medium mt-1 md:text-lg">Manage partner universities and their available capacity.</p>
        </div>
        <div className="flex gap-3">
           <button 
             onClick={() => setIsModalOpen(true)}
             className="flex items-center gap-2 px-5 py-2.5 bg-dark-blue text-white font-bold rounded-xl hover:bg-navy-hover transition-all shadow-lg shadow-dark-blue/20"
           >
             <Plus className="w-5 h-5" /> Add University
           </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 font-bold rounded-xl border border-red-100 flex items-center gap-2">
          <span>Failed to load: {error}</span>
        </div>
      )}

      <div className="glass-card rounded-[2rem] bg-white p-6 md:p-8 shadow-sm">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-xl border border-light-color/30" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 px-6 border-2 border-dashed border-light-color rounded-2xl bg-slate-50">
            <Building className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-dark-blue">No Universities Found</h3>
            <p className="text-body-text mt-2">Add your first partner university to the system.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-light-color/50">
            <DataTable columns={columns} data={data} />
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-dark-blue/80 backdrop-blur-md" onClick={() => !creating && setIsModalOpen(false)} />
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl relative z-10 overflow-hidden animate-fade-in-up border border-white/20">
            <header className="px-8 py-6 border-b border-light-color/60 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-dark-blue">
                   <GraduationCap className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-black text-dark-blue">New University</h2>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                disabled={creating}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all text-dark-blue/40 hover:text-dark-blue"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            
            <form onSubmit={handleCreate} className="p-8 space-y-5">
              <div>
                <label className="block text-xs font-black text-dark-blue/60 uppercase tracking-widest mb-2">University Name</label>
                <input 
                  type="text" 
                  required
                  value={newUniversity.name}
                  onChange={(e) => setNewUniversity({...newUniversity, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/50 focus:border-accent-yellow transition-all font-medium text-dark-blue"
                  placeholder="e.g. Multimedia University"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-dark-blue/60 uppercase tracking-widest mb-2">Country</label>
                <select 
                  required
                  value={newUniversity.countryId}
                  onChange={(e) => setNewUniversity({...newUniversity, countryId: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/50 focus:border-accent-yellow transition-all font-medium text-dark-blue"
                >
                  <option value="" disabled>Select Country</option>
                  {countries.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-dark-blue/60 uppercase tracking-widest mb-2">Website URL (Optional)</label>
                <input 
                  type="url" 
                  value={newUniversity.website}
                  onChange={(e) => setNewUniversity({...newUniversity, website: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/50 focus:border-accent-yellow transition-all font-medium text-dark-blue"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-xs font-black text-dark-blue/60 uppercase tracking-widest mb-2">Seat Limit</label>
                <input 
                  type="number" 
                  required min="0" step="1"
                  value={newUniversity.seatLimit}
                  onChange={(e) => setNewUniversity({...newUniversity, seatLimit: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/50 focus:border-accent-yellow transition-all font-medium text-dark-blue"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-body-text font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={creating}
                  className="px-6 py-2.5 bg-accent-yellow text-dark-blue font-bold rounded-xl hover:bg-yellow-default transition-all shadow-lg shadow-accent-yellow/20 disabled:opacity-50"
                >
                  {creating ? 'Saving...' : 'Save University'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
