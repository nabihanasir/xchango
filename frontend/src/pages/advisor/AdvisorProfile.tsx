import { User, Mail, Building, Briefcase } from 'lucide-react';

export default function AdvisorProfile() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="bg-white rounded-3xl p-8 border border-light-color/50 shadow-md">
        <h2 className="text-2xl font-black text-dark-blue mb-8">My Profile</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 bg-dark-blue rounded-3xl flex items-center justify-center text-white">
                <User className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-dark-blue">Advisor Name</h3>
                <p className="text-body-text">Senior Academic Advisor</p>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3 text-body-text">
                <Mail className="h-5 w-5 text-accent-yellow" />
                <span className="font-semibold">advisor@xchango.com</span>
              </div>
              <div className="flex items-center gap-3 text-body-text">
                <Building className="h-5 w-5 text-accent-yellow" />
                <span className="font-semibold">Management Sciences</span>
              </div>
              <div className="flex items-center gap-3 text-body-text">
                <Briefcase className="h-5 w-5 text-accent-yellow" />
                <span className="font-semibold">7 Years Experience</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-light-color/50">
            <h4 className="font-bold text-dark-blue mb-4 uppercase text-xs tracking-widest">About</h4>
            <p className="text-sm text-body-text leading-relaxed">
              Dedicated academic advisor specializing in international exchange programs and course equivalency mapping within the Management Sciences department.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
