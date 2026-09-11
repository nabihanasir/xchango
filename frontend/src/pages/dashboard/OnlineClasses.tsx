import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Headphones,
  Info,
  KeyRound,
  Link as LinkIcon,
  Loader2,
  MonitorUp,
  RefreshCw,
  Square,
  Video,
  Wifi,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { onlineClassesApi, type OnlineClass } from '../../lib/onlineClassesApi';

const statusStyles: Record<OnlineClass['status'], string> = {
  'Live now': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Ready to start': 'bg-amber-50 text-amber-700 border-amber-200',
  Upcoming: 'bg-blue-50 text-blue-700 border-blue-200',
  Ended: 'bg-slate-50 text-slate-600 border-slate-200',
};

const pickFeaturedClass = (classes: OnlineClass[]) =>
  classes.find((item) => item.status === 'Live now') ||
  classes.find((item) => item.status === 'Ready to start') ||
  classes.find((item) => item.status === 'Upcoming') ||
  classes[0];

export default function OnlineClasses() {
  const { user } = useAuth();
  const isHost = user?.role === 'advisor' || user?.role === 'admin';

  const [classes, setClasses] = useState<OnlineClass[]>([]);
  const [roomPassword, setRoomPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedClassId, setCopiedClassId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);

  const featuredClass = useMemo(() => pickFeaturedClass(classes), [classes]);

  const loadClasses = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await onlineClassesApi.getClasses();
      setClasses(data.classes);
      setRoomPassword(data.roomPassword);
    } catch (err) {
      console.error('Failed to load online classes', err);
      setError('Unable to load online classes. Please make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadClasses();
  }, []);

  const copyMeetingDetails = async (classItem: OnlineClass) => {
    const meetingUrl = isHost ? classItem.hostUrl : classItem.joinUrl;
    const details = [
      `${classItem.course} online class`,
      `Provider: ${classItem.provider}`,
      `Room: ${classItem.roomName}`,
      roomPassword ? `Password: ${roomPassword}` : null,
      `Join: ${meetingUrl}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(details);
      setCopyError(false);
      setCopiedClassId(classItem.id);
      window.setTimeout(() => setCopiedClassId(null), 1800);
    } catch {
      setCopiedClassId(null);
      setCopyError(true);
    }
  };

  const startClass = async (classItem: OnlineClass) => {
    setActionId(classItem.id);
    setError(null);

    try {
      const updated = await onlineClassesApi.startClass(classItem.id);
      setClasses((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      window.open(updated.hostUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Failed to start class', err);
      setError('Unable to start the class. Please try again.');
    } finally {
      setActionId(null);
    }
  };

  const endClass = async (classItem: OnlineClass) => {
    setActionId(classItem.id);
    setError(null);

    try {
      const updated = await onlineClassesApi.endClass(classItem.id);
      setClasses((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      console.error('Failed to end class', err);
      setError('Unable to end the class. Please try again.');
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-accent-yellow" />
          Loading online classes
        </div>
      </div>
    );
  }

  if (error && !featuredClass) {
    return (
      <div className="rounded-[2rem] border border-red-200 bg-red-50 p-8 text-red-800 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-1 h-6 w-6 shrink-0" />
            <div>
              <h3 className="text-red-950">Online classes unavailable</h3>
              <p className="mt-2 text-sm font-medium leading-6">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadClasses()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-800"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!featuredClass) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-slate-700 shadow-sm">
        No online classes are scheduled yet.
      </div>
    );
  }

  const featuredUrl = isHost ? featuredClass.hostUrl : featuredClass.joinUrl;

  return (
    <div className="space-y-8 pb-10 animate-fade-in">
      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {copyError ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Clipboard access was blocked. Copy the join link manually from the class details.</span>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="bg-[#071133] p-7 text-white md:p-10">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-accent-yellow">
              <Video className="h-4 w-4" />
              {isHost ? 'Host Online Classes' : 'Online Classes'}
            </div>

            <h2 className="max-w-2xl text-white">
              {isHost ? 'Start your live classroom' : 'Join your live classroom'}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
              {isHost
                ? 'Open a free Jitsi classroom as host, mark the session live for students, and share the room password when needed.'
                : 'Attend live lectures through free Jitsi classrooms, copy join details, and keep upcoming calls in one student workspace.'}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {isHost ? (
                <button
                  type="button"
                  onClick={() => void startClass(featuredClass)}
                  disabled={actionId === featuredClass.id}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent-yellow px-6 py-4 text-sm font-black text-dark-blue shadow-lg shadow-accent-yellow/20 transition hover:bg-yellow-default disabled:opacity-60"
                >
                  {actionId === featuredClass.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Video className="h-5 w-5" />}
                  {featuredClass.isHostSession ? 'Rejoin as Host' : 'Start Class'}
                </button>
              ) : (
                <a
                  href={featuredUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent-yellow px-6 py-4 text-sm font-black text-dark-blue shadow-lg shadow-accent-yellow/20 transition hover:bg-yellow-default"
                >
                  <Video className="h-5 w-5" />
                  Join Live Class
                </a>
              )}

              <button
                type="button"
                onClick={() => void copyMeetingDetails(featuredClass)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-6 py-4 text-sm font-black text-white transition hover:bg-white/15"
              >
                {copiedClassId === featuredClass.id ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                {copiedClassId === featuredClass.id ? 'Copied' : 'Copy Details'}
              </button>

              {isHost && featuredClass.isHostSession ? (
                <button
                  type="button"
                  onClick={() => void endClass(featuredClass)}
                  disabled={actionId === featuredClass.id}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-6 py-4 text-sm font-black text-white transition hover:bg-white/15 disabled:opacity-60"
                >
                  <Square className="h-4 w-4" />
                  End Session
                </button>
              ) : null}
            </div>
          </div>

          <div className="bg-slate-50 p-7 md:p-10">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">
              {isHost ? 'Host Session' : 'Live Session'}
            </p>
            <h3 className="mt-3 text-slate-900">{featuredClass.course}</h3>
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <Clock className="h-5 w-5 text-accent-yellow" />
                <span className="text-sm font-bold text-slate-700">
                  {featuredClass.day}, {featuredClass.time} for {featuredClass.duration}
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <LinkIcon className="h-5 w-5 text-accent-yellow" />
                <span className="text-sm font-bold text-slate-700">Room: {featuredClass.roomName}</span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <KeyRound className="h-5 w-5 text-accent-yellow" />
                <span className="text-sm font-bold text-slate-700">Password: {roomPassword || 'None'}</span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <Info className="h-5 w-5 text-accent-yellow" />
                <span className="text-sm font-bold text-slate-700">Provider: {featuredClass.provider} (free)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <MonitorUp className="h-6 w-6 text-dark-blue" />
          <h4 className="mt-4 text-slate-900">100% Free Calling</h4>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Uses public Jitsi Meet — no Zoom license, API keys, or paid video plan.
          </p>
        </div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <Headphones className="h-6 w-6 text-dark-blue" />
          <h4 className="mt-4 text-slate-900">{isHost ? 'Host Controls' : 'Check Audio'}</h4>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {isHost
              ? 'Start a session to mark it live for students, then rejoin or end when the lecture finishes.'
              : 'Test your mic and headphones before the class starts.'}
          </p>
        </div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <Wifi className="h-6 w-6 text-dark-blue" />
          <h4 className="mt-4 text-slate-900">Stable Internet</h4>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Use a reliable connection and keep your charger nearby for longer classes.
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-accent-yellow">Schedule</p>
            <h3 className="mt-2 text-slate-900">{isHost ? 'Classes you can host' : 'Your class calls'}</h3>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
            <CalendarDays className="h-5 w-5 text-slate-400" />
            {classes.length} scheduled sessions
          </div>
        </div>

        <div className="grid gap-4">
          {classes.map((classItem) => (
            <article
              key={classItem.id}
              className="grid gap-5 rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-5 md:grid-cols-[1fr_auto] md:items-center"
            >
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusStyles[classItem.status]}`}>
                    {classItem.status}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    {classItem.day} at {classItem.time}
                  </span>
                </div>
                <h4 className="text-slate-900">{classItem.course}</h4>
                <p className="mt-2 text-sm text-slate-500">
                  {classItem.instructor} · {classItem.duration} · room {classItem.roomName}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
                <button
                  type="button"
                  onClick={() => void copyMeetingDetails(classItem)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-dark-blue hover:text-dark-blue"
                >
                  {copiedClassId === classItem.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedClassId === classItem.id ? 'Copied' : 'Copy'}
                </button>

                {isHost ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void startClass(classItem)}
                      disabled={actionId === classItem.id}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-dark-blue px-5 py-3 text-sm font-black text-white transition hover:bg-[#11195a] disabled:opacity-60"
                    >
                      {actionId === classItem.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                      {classItem.isHostSession ? 'Rejoin' : 'Start'}
                    </button>
                    {classItem.isHostSession ? (
                      <button
                        type="button"
                        onClick={() => void endClass(classItem)}
                        disabled={actionId === classItem.id}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-red-300 hover:text-red-700 disabled:opacity-60"
                      >
                        End
                      </button>
                    ) : null}
                  </>
                ) : (
                  <a
                    href={classItem.joinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-dark-blue px-5 py-3 text-sm font-black text-white transition hover:bg-[#11195a]"
                  >
                    Join
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
