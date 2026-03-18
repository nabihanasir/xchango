

const StubPage = ({ title }: { title: string }) => (
  <div className="bg-white p-12 rounded-3xl border border-light-color/50 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
    <div className="bg-light-color/30 h-20 w-20 rounded-2xl flex items-center justify-center">
      <span className="text-4xl text-dark-blue/20 tracking-tighter font-black">XC</span>
    </div>
    <h2 className="text-2xl font-black text-dark-blue">{title}</h2>
    <p className="text-body-text max-w-md mx-auto font-medium">
      This module is currently under development. Soon you'll be able to manage {title.toLowerCase()} directly from here.
    </p>
    <div className="pt-4">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-light-color/40 text-xs font-bold text-dark-blue/40 uppercase tracking-widest">
        Coming Soon
      </div>
    </div>
  </div>
);

export const AdminUniversities = () => <StubPage title="University Management" />;
export const AdminCourses = () => <StubPage title="Course Catalog" />;
export const AdminSettings = () => <StubPage title="Admin Settings" />;
