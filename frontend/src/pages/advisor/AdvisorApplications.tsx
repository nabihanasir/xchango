import { useState } from 'react';
import { Eye, Check, X } from 'lucide-react';

export default function AdvisorApplications() {
  const [applications] = useState([
    { id: 1, student: 'Nabiha Nasir', university: 'Seoul National University', program: 'Software Engineering', status: 'pending', date: '2024-03-12' },
    { id: 2, student: 'Alice Johnson', university: 'University of Malaya', program: 'Computer Science', status: 'pending', date: '2024-03-15' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-light-color/50 pb-6">
        <div>
          <h2 className="text-3xl font-black text-dark-blue">Assigned Applications</h2>
          <p className="text-body-text font-medium mt-1">Review and manage applications assigned to you.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-light-color/50 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-light-color">
              <th className="px-6 py-4 text-xs font-bold text-dark-blue uppercase tracking-wider">Student</th>
              <th className="px-6 py-4 text-xs font-bold text-dark-blue uppercase tracking-wider">University</th>
              <th className="px-6 py-4 text-xs font-bold text-dark-blue uppercase tracking-wider">Program</th>
              <th className="px-6 py-4 text-xs font-bold text-dark-blue uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-dark-blue uppercase tracking-wider text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-light-color">
            {applications.map((app) => (
              <tr key={app.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <p className="font-bold text-dark-blue">{app.student}</p>
                </td>
                <td className="px-6 py-4 text-sm text-body-text font-medium">{app.university}</td>
                <td className="px-6 py-4 text-sm text-body-text font-medium">{app.program}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    app.status === 'pending' ? 'bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/20' : 
                    'bg-green-500/10 text-green-600 border border-green-500/20'
                  }`}>
                    {app.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button className="p-2 bg-slate-100 rounded-lg hover:bg-dark-blue hover:text-white transition-all text-dark-blue" title="View Details">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="p-2 bg-green-50 rounded-lg hover:bg-green-600 hover:text-white transition-all text-green-600" title="Approve">
                      <Check className="h-4 w-4" />
                    </button>
                    <button className="p-2 bg-red-50 rounded-lg hover:bg-red-600 hover:text-white transition-all text-red-600" title="Reject">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
