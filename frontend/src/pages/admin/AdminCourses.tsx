import { useState, useEffect } from 'react';
import DataTable from '../../components/admin/DataTable';
import { Plus, X, BookOpen, Layers } from 'lucide-react';
import { adminApi, type UniversityRecord } from '../../lib/adminApi';
import type { ApplicationCourseSummary } from '../../types/application';

export default function AdminCourses() {
  const [data, setData] = useState<ApplicationCourseSummary[]>([]);
  const [universities, setUniversities] = useState<UniversityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({ 
    name: '', code: '', description: '', creditHours: 3, type: 'host', universityId: '' 
  });
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [crs, univs] = await Promise.all([
        adminApi.getCourses(),
        adminApi.getUniversities()
      ]);
      setData(crs);
      setUniversities(univs);
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
      await adminApi.createCourse(newCourse);
      setIsModalOpen(false);
      setNewCourse({ name: '', code: '', description: '', creditHours: 3, type: 'host', universityId: '' });
      await loadData();
    } catch (err: any) {
      alert(`Failed to create course: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    { header: 'Course Code', accessor: 'code', render: (val: string) => <span className="font-bold">{val}</span> },
    { header: 'Course Name', accessor: 'name' },
    { 
      header: 'University', 
      accessor: 'universityId',
      render: (val: any) => typeof val === 'object' && val ? val.name : val || 'Not Linked'
    },
    { header: 'Type', accessor: 'type', render: (val: string) => <span className="uppercase text-[10px] tracking-widest font-black opacity-60 bg-slate-100 px-2 py-1 rounded">{val}</span> },
    { header: 'Credits', accessor: 'creditHours' },
  ];

  return (
    <div className="space-y-6 animate-fade-in relative z-0">
       <div className="flex items-center justify-between border-b border-light-color/50 pb-6 glass-card p-6 md:p-8 rounded-[2rem] bg-white">
        <div>
          <h2 className="text-3xl font-black text-dark-blue mb-2">Course Catalog</h2>
          <p className="text-body-text font-medium mt-1 md:text-lg">Manage available courses for application mappings.</p>
        </div>
        <div className="flex gap-3">
           <button 
             onClick={() => setIsModalOpen(true)}
             className="flex items-center gap-2 px-5 py-2.5 bg-dark-blue text-white font-bold rounded-xl hover:bg-navy-hover transition-all shadow-lg shadow-dark-blue/20"
           >
             <Plus className="w-5 h-5" /> Add Course
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
            <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-dark-blue">No Courses Found</h3>
            <p className="text-body-text mt-2">Start populating the global catalog.</p>
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
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] shadow-2xl relative z-10 animate-fade-in-up border border-white/20 custom-scrollbar">
            <header className="px-8 py-6 border-b border-light-color/60 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-dark-blue">
                   <Layers className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-black text-dark-blue">New Course</h2>
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
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-black text-dark-blue/60 uppercase tracking-widest mb-2">Course Code</label>
                  <input 
                    type="text" 
                    required
                    value={newCourse.code}
                    onChange={(e) => setNewCourse({...newCourse, code: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/50 focus:border-accent-yellow transition-all font-medium text-dark-blue"
                    placeholder="e.g. CS101"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-black text-dark-blue/60 uppercase tracking-widest mb-2">Course Name</label>
                  <input 
                    type="text" 
                    required
                    value={newCourse.name}
                    onChange={(e) => setNewCourse({...newCourse, name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/50 focus:border-accent-yellow transition-all font-medium text-dark-blue"
                    placeholder="e.g. Intro to Computer Science"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-black text-dark-blue/60 uppercase tracking-widest mb-2">Type</label>
                  <select 
                    required
                    value={newCourse.type}
                    onChange={(e) => setNewCourse({...newCourse, type: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/50 focus:border-accent-yellow transition-all font-medium text-dark-blue"
                  >
                    <option value="host">Host University Course</option>
                    <option value="home">Home University Course</option>
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-black text-dark-blue/60 uppercase tracking-widest mb-2">Credit Hours</label>
                  <input 
                    type="number" 
                    required min="0" step="0.5"
                    value={newCourse.creditHours}
                    onChange={(e) => setNewCourse({...newCourse, creditHours: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/50 focus:border-accent-yellow transition-all font-medium text-dark-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-dark-blue/60 uppercase tracking-widest mb-2">University</label>
                <select 
                  required
                  value={newCourse.universityId}
                  onChange={(e) => setNewCourse({...newCourse, universityId: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/50 focus:border-accent-yellow transition-all font-medium text-dark-blue"
                >
                  <option value="" disabled>Select Associated University</option>
                  {universities.map(u => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div>
                 <label className="block text-xs font-black text-dark-blue/60 uppercase tracking-widest mb-2">Description / Outline</label>
                 <textarea 
                   rows={3}
                   value={newCourse.description}
                   onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                   className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/50 focus:border-accent-yellow transition-all font-medium text-dark-blue resize-none"
                   placeholder="Brief description of the course content..."
                 ></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white/80 py-4 backdrop-blur-md">
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
                  {creating ? 'Saving...' : 'Save Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}
