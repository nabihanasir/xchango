import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ApplicationStepper from '../../components/ApplicationStepper';
import DocumentUpload from '../../components/DocumentUpload';
import CourseSelection from '../../components/CourseSelection';
import CountryStep from '../../components/steps/CountryStep';
import UniversityStep from '../../components/steps/UniversityStep';
import ProgramStep from '../../components/steps/ProgramStep';
import DetailsStep from '../../components/steps/DetailsStep';
import ReviewStep from '../../components/steps/ReviewStep';
import { useAuth } from '../../context/AuthContext';
import { applicationApi } from '../../lib/applicationApi';
import {
  type ApplicationCourseSummary,
  applicationStatusTone,
  countryOptions,
  type ApplicationCountry,
  type ApplicationDraftPayload,
  type WorkflowApplication,
} from '../../types/application';

interface WorkflowDraft extends Omit<ApplicationDraftPayload, 'country'> {
  country: ApplicationCountry | '';
}

const createEmptyDraft = (): WorkflowDraft => ({
  country: '',
  university: '',
  program: '',
  travelHistory: {
    hasTravelHistory: false,
    details: '',
  },
  passportValid: false,
  financialEligible: false,
  consentExtension: false,
  medicalCondition: {
    hasCondition: false,
    details: '',
  },
  registrationNumber: '',
  accommodationPreference: 'UNIVERSITY',
});

const postShortlistStatuses = [
  'SHORTLISTED',
  'DOCUMENT_PENDING',
  'COURSE_SELECTION_PENDING',
  'READY_FOR_SUBMISSION',
] as const;

export default function ApplicationWorkflowPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = user?._id ?? '';

  const [currentStep, setCurrentStep] = useState(1);
  const [draft, setDraft] = useState<WorkflowDraft>(createEmptyDraft());
  const [application, setApplication] = useState<WorkflowApplication | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [savingCourses, setSavingCourses] = useState(false);
  const [availableCourses, setAvailableCourses] = useState<ApplicationCourseSummary[]>([]);
  const [loadingAvailableCourses, setLoadingAvailableCourses] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;

    const loadApplication = async () => {
      setLoading(true);
      setErrorMessage('');

      try {
        const existingApplication = await applicationApi.getApplication(id);
        if (cancelled) {
          return;
        }

        setApplication(existingApplication);
        setDraft({
          country: existingApplication.country,
          university: existingApplication.university,
          program: existingApplication.program,
          travelHistory: existingApplication.travelHistory,
          passportValid: existingApplication.passportValid,
          financialEligible: existingApplication.financialEligible,
          consentExtension: existingApplication.consentExtension,
          medicalCondition: existingApplication.medicalCondition,
          registrationNumber: existingApplication.registrationNumber,
          accommodationPreference: existingApplication.accommodationPreference,
        });
        setCurrentStep(existingApplication.status === 'DRAFT' ? 4 : 5);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load application.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadApplication();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!application || !postShortlistStatuses.some((status) => status === application.status)) {
      setAvailableCourses([]);
      setLoadingAvailableCourses(false);
      return;
    }

    let cancelled = false;

    const loadAvailableCourses = async () => {
      setLoadingAvailableCourses(true);

      try {
        const courses = await applicationApi.getAvailableCourses(application._id);
        if (!cancelled) {
          setAvailableCourses(courses);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load available courses.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingAvailableCourses(false);
        }
      }
    };

    void loadAvailableCourses();

    return () => {
      cancelled = true;
    };
  }, [application?._id, application?.status]);

  const universityOptions = useMemo(() => {
    if (!draft.country) {
      return [];
    }

    return countryOptions[draft.country];
  }, [draft.country]);

  const validateCurrentStep = () => {
    if (currentStep === 1 && !draft.country) {
      return 'Select a destination country.';
    }

    if (currentStep === 2 && !draft.university) {
      return 'Select a university.';
    }

    if (currentStep === 3 && !draft.program.trim()) {
      return 'Enter a program name.';
    }

    if (currentStep === 4) {
      if (draft.travelHistory.hasTravelHistory && !draft.travelHistory.details?.trim()) {
        return 'Travel history details are required.';
      }

      if (draft.medicalCondition.hasCondition && !draft.medicalCondition.details?.trim()) {
        return 'Medical condition details are required.';
      }
    }

    return '';
  };

  const persistStepData = async () => {
    if (!studentId) {
      return;
    }

    if (!application) {
      const createdApplication = await applicationApi.createApplication(studentId, {
        country: draft.country as ApplicationCountry,
        university: draft.university,
        program: draft.program,
      });
      setApplication(createdApplication);
      return createdApplication;
    }

    const updatedApplication = await applicationApi.updateApplicationStep(application._id, {
      country: draft.country as ApplicationCountry,
      university: draft.university,
      program: draft.program,
      travelHistory: draft.travelHistory,
      passportValid: draft.passportValid,
      financialEligible: draft.financialEligible,
      consentExtension: draft.consentExtension,
      medicalCondition: draft.medicalCondition,
      registrationNumber: draft.registrationNumber,
      accommodationPreference: draft.accommodationPreference,
    });
    setApplication(updatedApplication);
    return updatedApplication;
  };

  const handleNext = async () => {
    const validationMessage = validateCurrentStep();
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (currentStep >= 3) {
        await persistStepData();
      }

      setCurrentStep((step) => Math.min(step + 1, 5));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save application progress.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!application) {
      setErrorMessage('Save the draft before submitting.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const updatedApplication = await applicationApi.updateApplicationStep(application._id, {
        travelHistory: draft.travelHistory,
        passportValid: draft.passportValid,
        financialEligible: draft.financialEligible,
        consentExtension: draft.consentExtension,
        medicalCondition: draft.medicalCondition,
        registrationNumber: draft.registrationNumber,
        accommodationPreference: draft.accommodationPreference,
      });

      const submittedApplication = await applicationApi.submitApplication(updatedApplication._id);
      setApplication(submittedApplication);
      setSuccessMessage('Application submitted. Status is now Pending.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDocumentUpload = async (type: string, files: File[]) => {
    if (!application) {
      return;
    }

    setUploadingDocuments(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const updatedApplication = await applicationApi.uploadDocuments(application._id, type, files);
      setApplication(updatedApplication);
      setSuccessMessage('Application documents uploaded successfully.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to upload documents.');
    } finally {
      setUploadingDocuments(false);
    }
  };

  const handleCourseSave = async (courseIds: string[]) => {
    if (!application) {
      return;
    }

    setSavingCourses(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const updatedApplication = await applicationApi.selectCourses(application._id, courseIds);
      setApplication(updatedApplication);
      setSuccessMessage('Selected courses saved successfully.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save selected courses.');
    } finally {
      setSavingCourses(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <CountryStep
            country={draft.country}
            onChange={(country) => {
              setDraft((current) => ({ ...current, country, university: '' }));
            }}
          />
        );
      case 2:
        return (
          <UniversityStep
            country={draft.country}
            universities={universityOptions}
            university={draft.university}
            onChange={(university) => setDraft((current) => ({ ...current, university }))}
          />
        );
      case 3:
        return <ProgramStep program={draft.program} onChange={(program) => setDraft((current) => ({ ...current, program }))} />;
      case 4:
        return <DetailsStep draft={draft as ApplicationDraftPayload} onChange={(updates) => setDraft((current) => ({ ...current, ...updates }))} />;
      default:
        return <ReviewStep draft={draft as ApplicationDraftPayload} />;
    }
  };

  if (!user) {
    return <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-sm text-slate-500">Sign in to manage applications.</div>;
  }

  if (loading) {
    return <div className="glass-card h-56 rounded-[2rem] animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-accent-yellow">Application Module</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Workflow-Based Student Application</h1>
        </div>
        <Link to="/dashboard/applications" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
          <ArrowLeft className="h-4 w-4" />
          Back to applications
        </Link>
      </div>

      <ApplicationStepper currentStep={currentStep} />

      {application ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Workflow Status</p>
              <p className="mt-2 text-lg font-black text-slate-900">{application.program}</p>
            </div>
            <div className={`rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-[0.2em] ${applicationStatusTone[application.status]}`}>
              {application.status.replaceAll('_', ' ')}
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-[2rem] border border-slate-200 bg-slate-50/70 p-6 shadow-sm">
        {renderStep()}

        {errorMessage ? (
          <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {successMessage}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (currentStep === 1) {
                navigate('/dashboard/applications');
                return;
              }

              setCurrentStep((step) => Math.max(step - 1, 1));
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={() => void handleNext()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-dark-blue px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Next'}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || !application || application.status !== 'DRAFT'}
              className="inline-flex items-center gap-2 rounded-2xl bg-accent-yellow px-5 py-3 text-sm font-black text-dark-blue disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              {submitting ? 'Submitting...' : application?.status === 'DRAFT' ? 'Submit Application' : 'Submitted'}
            </button>
          )}
        </div>
      </section>

      {application && postShortlistStatuses.some((status) => status === application.status) ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <DocumentUpload
            documents={application.documents}
            uploading={uploadingDocuments}
            errorMessage={errorMessage}
            onUpload={handleDocumentUpload}
          />
          <CourseSelection
            selectedCourses={application.selectedCourses}
            availableCourses={availableCourses}
            loadingCourses={loadingAvailableCourses}
            saving={savingCourses}
            errorMessage={errorMessage}
            onSave={handleCourseSave}
          />
        </div>
      ) : null}
    </div>
  );
}
