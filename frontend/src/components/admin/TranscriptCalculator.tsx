import { Calculator } from 'lucide-react';

interface Course {
  name: string;
  grade: string;
  credits: number;
}

interface Semester {
  semester: number;
  sgpa: number;
  credits: number;
  courses: Course[];
}

interface TranscriptCalculatorProps {
  transcript: Semester[];
  cgpa: number;
  sapId: string;
  studentName: string;
}

export default function TranscriptCalculator({ transcript, cgpa, sapId, studentName }: TranscriptCalculatorProps) {
  return (
    <div className="bg-white rounded-3xl border border-light-color/60 shadow-xl overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-dark-blue p-6 text-white flex justify-between items-center relative">
        <div className="absolute top-0 right-0 w-32 h-full bg-accent-yellow/10 -skew-x-12 transform translate-x-8" />
        <div className="relative z-10">
          <h3 className="text-xl font-black uppercase tracking-tighter">Transcript Calculator</h3>
          <p className="text-white/60 text-xs font-bold mt-1">Institutional Record Summary</p>
        </div>
        <div className="relative z-10 text-right">
          <p className="text-[10px] font-bold text-accent-yellow uppercase tracking-widest leading-none">Overall Status</p>
          <div className="flex items-center gap-2 mt-1 justify-end">
            <span className="text-3xl font-black leading-none">CGPA: {cgpa.toFixed(2)}</span>
            <Calculator className="h-5 w-5 text-accent-yellow" />
          </div>
        </div>
      </div>

      {/* Student Meta Row */}
      <div className="px-6 py-4 bg-slate-50 border-b border-light-color/80 flex justify-between items-center text-sm">
        <div className="flex gap-8">
          <div>
            <span className="text-[10px] font-black text-body-text/40 uppercase tracking-widest block">Student Name</span>
            <span className="font-bold text-dark-blue">{studentName}</span>
          </div>
          <div>
            <span className="text-[10px] font-black text-body-text/40 uppercase tracking-widest block">SAP ID</span>
            <span className="font-bold text-dark-blue">{sapId}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-black text-body-text/40 uppercase tracking-widest block">Last Synchronized</span>
          <span className="font-bold text-dark-blue italic opacity-60">March 18, 2024</span>
        </div>
      </div>

      {/* Semesters List */}
      <div className="p-6 space-y-8 max-h-[600px] overflow-y-auto custom-scrollbar">
        {transcript.length === 0 ? (
          <div className="py-20 text-center space-y-4">
             <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
               <Calculator className="h-8 w-8 text-slate-300" />
             </div>
             <p className="text-body-text font-bold opacity-40">No transcript data available for this student.</p>
          </div>
        ) : (
          transcript.map((sem) => (
            <div key={sem.semester} className="space-y-3">
              <div className="flex items-center gap-4">
                <div className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border ${
                  sem.semester % 2 === 0 ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-100 text-dark-blue border-slate-200'
                }`}>
                  Semester {sem.semester}
                </div>
                <div className="h-px bg-slate-100 flex-1" />
              </div>

              <div className="rounded-2xl border border-light-color/40 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/50 text-[10px] font-black text-body-text/50 uppercase tracking-widest">
                    <tr>
                      <th className="px-5 py-3">Course Title</th>
                      <th className="px-5 py-3 text-center">Cr. Hrs</th>
                      <th className="px-5 py-3 text-right">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-bold text-dark-blue/80">
                    {sem.courses.map((course, idx) => (
                      <tr key={idx} className="border-t border-slate-50 hover:bg-slate-50/30 transition-colors">
                        <td className="px-5 py-3.5">{course.name}</td>
                        <td className="px-5 py-3.5 text-center opacity-60">{course.credits}</td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={`px-2 py-0.5 rounded font-black text-xs ${
                            course.grade.startsWith('A') ? 'text-green-600' : 'text-orange-500'
                          }`}>
                            {course.grade}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="bg-slate-100/50 px-5 py-3 flex justify-between items-center border-t border-slate-100">
                  <span className="text-[10px] font-black text-body-text/40 uppercase tracking-widest">Semester Performance</span>
                  <div className="flex gap-4">
                    <span className="text-xs font-bold">Total Credits: <span className="text-dark-blue">{sem.credits}</span></span>
                    <span className="text-xs font-black bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm text-dark-blue">
                      SGPA: {sem.sgpa.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        ))}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
      `}</style>
    </div>
  );
}
