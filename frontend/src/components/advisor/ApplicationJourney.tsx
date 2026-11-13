import { Check, Lock, X } from 'lucide-react';
import {
  buildStudentJourney,
  type JourneyInput,
  type JourneyStep,
  type JourneyStepKey,
  type JourneyStepState,
} from '../../utils/studentJourney';

/** The same ten steps the student sees on their dashboard, worded for the advisor. */
const ADVISOR_TEXT: Record<JourneyStepKey, Record<JourneyStepState, string>> = {
  registration: {
    done: 'Registration submitted.',
    current: 'Student has not submitted their registration yet.',
    locked: 'Waiting on earlier steps.',
    stopped: 'Needs attention.',
  },
  interview: {
    done: 'Interview completed.',
    current: 'Schedule the interview, then mark it completed (Interview tab).',
    locked: 'Follows registration.',
    stopped: 'Needs attention.',
  },
  shortlisting: {
    done: 'You recommended this student.',
    current: 'Record your recommendation after the interview (Interview tab).',
    locked: 'Follows the interview.',
    stopped: 'You did not recommend this student, so the application stopped.',
  },
  'course-selection': {
    done: 'Student sent their course request.',
    current: 'Waiting for the student to choose host courses.',
    locked: 'Follows shortlisting.',
    stopped: 'Needs attention.',
  },
  'course-approval': {
    done: 'You approved the student’s courses.',
    current: 'Course request is with you. Review it under Course Approval.',
    locked: 'Follows course selection.',
    stopped: 'Needs attention.',
  },
  documents: {
    done: 'Transcript uploaded.',
    current: 'Student has not uploaded a transcript yet.',
    locked: 'Waiting on earlier steps.',
    stopped: 'Needs attention.',
  },
  visa: {
    done: 'Visa approved.',
    current: 'Visa is being processed by the International Office.',
    locked: 'Waiting on earlier steps.',
    stopped: 'Visa was rejected.',
  },
  arrival: {
    done: 'Arrival recorded.',
    current: 'Confirm the student has arrived at the host university (Interview tab).',
    locked: 'Follows visa approval.',
    stopped: 'Needs attention.',
  },
  outline: {
    done: 'Student uploaded outlines for all courses.',
    current: 'Waiting for the student to upload host course outlines.',
    locked: 'Opens once arrival is recorded.',
    stopped: 'Needs attention.',
  },
  results: {
    done: 'Results published.',
    current: 'Publish the student’s grades after the semester.',
    locked: 'Follows outline upload.',
    stopped: 'Needs attention.',
  },
};

const circle: Record<JourneyStepState, string> = {
  done: 'border-teal-700 bg-teal-700 text-white',
  current: 'border-teal-700 bg-white text-teal-700 shadow-[0_0_0_4px_rgba(15,118,110,0.18)]',
  locked: 'border-slate-200 bg-white text-slate-400',
  stopped: 'border-red-500 bg-red-500 text-white',
};

const label: Record<JourneyStepState, string> = {
  done: 'text-slate-500',
  current: 'text-slate-900',
  locked: 'text-slate-400',
  stopped: 'text-red-600',
};

const Icon = ({ state, index }: { state: JourneyStepState; index: number }) => {
  if (state === 'done') return <Check className="h-4 w-4" />;
  if (state === 'locked') return <Lock className="h-3.5 w-3.5" />;
  if (state === 'stopped') return <X className="h-4 w-4" />;
  return <span className="text-xs font-bold">{index + 1}</span>;
};

export default function ApplicationJourney({ journey }: { journey: JourneyInput }) {
  const steps = buildStudentJourney(journey);
  const focus: JourneyStep | undefined = steps.find((step) => step.state === 'current' || step.state === 'stopped');
  const completed = steps.filter((step) => step.state === 'done').length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5" aria-label="Student progress">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-bold text-slate-900">Student progress</p>
        <p className="text-xs font-semibold text-slate-500">
          {completed} of {steps.length} steps complete
        </p>
      </div>

      <ol className="mt-5 xl:grid xl:grid-cols-10">
        {steps.map((step, index) => (
          <li key={step.key} className="relative pb-4 last:pb-0 xl:pb-0" title={ADVISOR_TEXT[step.key][step.state]}>
            {index < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className={`absolute left-[15px] top-8 h-full w-0.5 xl:left-1/2 xl:top-4 xl:h-0.5 xl:w-full ${
                  step.state === 'done' ? 'bg-teal-700' : 'bg-slate-200'
                }`}
              />
            ) : null}
            <div
              className="flex items-center gap-4 xl:flex-col xl:gap-0"
              aria-current={step.state === 'current' ? 'step' : undefined}
            >
              <span
                className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 ${circle[step.state]}`}
              >
                <Icon state={step.state} index={index} />
              </span>
              <span className="min-w-0 xl:mt-2 xl:px-1 xl:text-center">
                <span className={`block text-sm font-semibold xl:text-xs xl:leading-tight ${label[step.state]}`}>
                  {step.title}
                </span>
                <span className="block text-xs text-slate-500 xl:hidden">{ADVISOR_TEXT[step.key][step.state]}</span>
              </span>
            </div>
          </li>
        ))}
      </ol>

      <p
        className={`mt-5 rounded-xl px-4 py-3 text-sm ${
          focus?.state === 'stopped' ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-700'
        }`}
      >
        {focus ? (
          <>
            <span className="font-bold">{focus.state === 'stopped' ? 'Needs attention: ' : 'Now: '}{focus.title}.</span>{' '}
            {ADVISOR_TEXT[focus.key][focus.state]}
          </>
        ) : (
          'Every step is complete.'
        )}
      </p>
    </div>
  );
}
