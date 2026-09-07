import { useEffect, useState } from 'react';
import { Bot, KeyRound, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { adminApi, type AiModelConfigRecord, type AiModelConfigInput, type AiProvider } from '../../lib/adminApi';

const PROVIDER_PRESETS: Record<AiProvider, { label: string; baseUrl: string; modelPlaceholder: string; hint: string }> = {
  groq: {
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    modelPlaceholder: 'llama-3.3-70b-versatile',
    hint: 'Free tier, very fast inference. Get a key at console.groq.com/keys.',
  },
  openrouter: {
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    modelPlaceholder: 'meta-llama/llama-3.3-70b-instruct:free',
    hint: 'Use a model id ending in ":free" for $0 usage. Get a key at openrouter.ai/keys.',
  },
  gemini: {
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    modelPlaceholder: 'gemini-2.0-flash',
    hint: 'Free tier via Google AI Studio. Get a key at aistudio.google.com/apikey.',
  },
  'openai-compatible': {
    label: 'Custom (OpenAI-compatible)',
    baseUrl: 'https://api.openai.com/v1',
    modelPlaceholder: 'gpt-4.1-mini',
    hint: 'Any endpoint implementing the OpenAI /chat/completions API (OpenAI, Ollama, Together, etc.).',
  },
};

const KNOWN_BASE_URLS = new Set(Object.values(PROVIDER_PRESETS).map((p) => p.baseUrl));

const defaultForm: AiModelConfigInput = {
  provider: 'groq',
  baseUrl: PROVIDER_PRESETS.groq.baseUrl,
  model: '',
  isEnabled: true,
  apiKey: '',
};

export default function AdminAiModelConfig() {
  const [existing, setExisting] = useState<AiModelConfigRecord | null>(null);
  const [form, setForm] = useState<AiModelConfigInput>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const config = await adminApi.getAiModelConfig();
      setExisting(config);
      if (config) {
        setForm({
          provider: config.provider,
          baseUrl: config.baseUrl,
          model: config.model,
          isEnabled: config.isEnabled,
          apiKey: '',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI model configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  const handleProviderChange = (provider: AiProvider) => {
    setForm((prev) => ({
      ...prev,
      provider,
      baseUrl: !prev.baseUrl || KNOWN_BASE_URLS.has(prev.baseUrl) ? PROVIDER_PRESETS[provider].baseUrl : prev.baseUrl,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSavedAt(null);
    try {
      const payload: AiModelConfigInput = {
        ...form,
        apiKey: form.apiKey?.trim() ? form.apiKey.trim() : undefined,
      };
      const saved = await adminApi.updateAiModelConfig(payload);
      setExisting(saved);
      setForm((prev) => ({ ...prev, apiKey: '' }));
      setSavedAt(Date.now());
    } catch (err: any) {
      setError(err?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const preset = PROVIDER_PRESETS[form.provider];

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-xl border border-light-color/30" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative z-0">
      <div className="border-b border-light-color/50 pb-6 glass-card p-6 md:p-8 rounded-[2rem] bg-white">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-dark-blue">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-dark-blue mb-1">AI Model Configuration</h2>
            <p className="text-body-text font-medium md:text-lg">
              Choose which LLM powers AI course matching and manage its credentials.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 font-bold rounded-xl border border-red-100 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {savedAt && !error && (
        <div className="p-4 bg-green-50 text-green-700 font-bold rounded-xl border border-green-100 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>Configuration saved. New match requests will use this model.</span>
        </div>
      )}

      <div className="glass-card rounded-[2rem] bg-white p-6 md:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <div>
            <label className="block text-xs font-black text-dark-blue/60 uppercase tracking-widest mb-2">Provider</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(Object.keys(PROVIDER_PRESETS) as AiProvider[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleProviderChange(key)}
                  className={`px-4 py-3 rounded-xl border font-bold text-sm transition-all ${
                    form.provider === key
                      ? 'bg-dark-blue text-white border-dark-blue shadow-lg shadow-dark-blue/20'
                      : 'bg-slate-50 border-light-color text-dark-blue hover:border-dark-blue/40'
                  }`}
                >
                  {PROVIDER_PRESETS[key].label}
                </button>
              ))}
            </div>
            <p className="text-xs text-body-text font-medium mt-2">{preset.hint}</p>
          </div>

          <div>
            <label className="block text-xs font-black text-dark-blue/60 uppercase tracking-widest mb-2">Base URL</label>
            <input
              type="url"
              required
              value={form.baseUrl}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/50 focus:border-accent-yellow transition-all font-medium text-dark-blue"
              placeholder={preset.baseUrl}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-dark-blue/60 uppercase tracking-widest mb-2">Model Name</label>
            <input
              type="text"
              required
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/50 focus:border-accent-yellow transition-all font-medium text-dark-blue"
              placeholder={preset.modelPlaceholder}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-black text-dark-blue/60 uppercase tracking-widest mb-2">
              <KeyRound className="h-3.5 w-3.5" /> API Key
            </label>
            <input
              type="password"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/50 focus:border-accent-yellow transition-all font-medium text-dark-blue"
              placeholder={existing?.apiKeySet ? `Currently set (${existing.apiKeyPreview}) — leave blank to keep` : 'sk-...'}
              autoComplete="off"
            />
            <p className="text-xs text-body-text font-medium mt-2">
              Stored server-side and never shown again after saving.
            </p>
          </div>

          <div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isEnabled}
                onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
                className="h-5 w-5 rounded border-light-color text-dark-blue focus:ring-accent-yellow/50"
              />
              <span className="font-bold text-dark-blue">Use this configuration for AI course matching</span>
            </label>
            <p className="text-xs text-body-text font-medium mt-2 ml-8">
              When disabled, the system falls back to the built-in keyword-overlap heuristic.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-accent-yellow text-dark-blue font-bold rounded-xl hover:bg-yellow-default transition-all shadow-lg shadow-accent-yellow/20 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
