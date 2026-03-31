interface ApplicationStepperProps {
  currentStep: number;
}

const steps = ['Country', 'University', 'Program', 'Details', 'Review'];

export default function ApplicationStepper({ currentStep }: ApplicationStepperProps) {
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-4">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isDone = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;

          return (
            <div key={step} className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-sm font-black transition ${
                  isDone
                    ? 'border-accent-yellow bg-accent-yellow text-dark-blue'
                    : isActive
                      ? 'border-dark-blue bg-dark-blue text-white'
                      : 'border-slate-200 bg-white text-slate-400'
                }`}
              >
                {stepNumber}
              </div>
              <p className={`text-xs font-bold uppercase tracking-[0.2em] ${isActive ? 'text-dark-blue' : 'text-slate-400'}`}>
                {step}
              </p>
            </div>
          );
        })}
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-accent-yellow transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
