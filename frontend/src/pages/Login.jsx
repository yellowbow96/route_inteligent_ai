import React, { useMemo, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Mail, ShieldCheck, Sparkles } from 'lucide-react';

const makeVerificationCode = () => String(Math.floor(100000 + Math.random() * 900000));

function Login() {
  const [mode, setMode] = useState('signup');
  const [step, setStep] = useState('details');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const onboardingSteps = useMemo(
    () => [
      { id: 'details', label: 'Rider details' },
      { id: 'verify', label: 'Email code' },
      { id: 'ready', label: 'Start setup' },
    ],
    []
  );

  const resetSignup = () => {
    setStep('details');
    setVerificationCode('');
    setSentCode('');
    setStatus('');
    setError(null);
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError(null);
    setStatus('');
    if (nextMode === 'signup') resetSignup();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setStatus('');
    setIsSubmitting(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError(null);
    setStatus('');

    if (!fullName.trim() || !email.trim() || !username.trim() || !password.trim()) {
      setError('Fill in name, email, username, and password first.');
      return;
    }

    const generatedCode = makeVerificationCode();
    setSentCode(generatedCode);
    setStep('verify');
    setStatus(`Demo auth code sent to ${email}. Use ${generatedCode} for now.`);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    setStatus('');

    if (!sentCode || verificationCode.trim() !== sentCode) {
      setError('Enter the email auth code to continue.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(username, password, fullName, email);
      setStep('ready');
      setStatus('Account created. Next step is your bike setup before the first ride.');
      setTimeout(() => navigate('/profile'), 600);
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#09111f] text-white">
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,243,255,0.18),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(255,107,0,0.22),transparent_28%),linear-gradient(135deg,#08101d_0%,#111827_48%,#050816_100%)]" />
        <div className="absolute inset-y-0 left-0 w-[38%] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent)] blur-3xl" />

        <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
          <section className="flex flex-col justify-between rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-2xl lg:p-10">
            <div>
              <div className="mb-10 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-neonBlue via-cyan-300 to-neonOrange text-slate-950 shadow-[0_12px_35px_rgba(0,243,255,0.28)]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-2xl font-black tracking-tight">
                    RIDER<span className="text-neonOrange">INTEL</span>
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-100/70">Smooth Onboarding Flow</div>
                </div>
              </div>

              <div className="max-w-xl">
                <div className="mb-4 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-100">
                  Ride Setup Before Ride Start
                </div>
                <h1 className="text-4xl font-black leading-tight text-white md:text-6xl">
                  Better first impression, cleaner auth, and less friction before the map.
                </h1>
                <p className="mt-5 max-w-lg text-sm leading-7 text-slate-300 md:text-base">
                  The new onboarding collects rider details first, verifies email with an auth code, and then sends the rider into bike setup instead of dumping everything into one hard login block.
                </p>
              </div>

              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {[
                  {
                    icon: <Mail className="h-5 w-5 text-cyan-200" />,
                    title: 'Email Auth Code',
                    text: 'Signup now feels staged instead of abrupt.',
                  },
                  {
                    icon: <ShieldCheck className="h-5 w-5 text-orange-200" />,
                    title: 'Bike Ready First',
                    text: 'Riders can finish profile setup before the first route.',
                  },
                  {
                    icon: <CheckCircle2 className="h-5 w-5 text-emerald-200" />,
                    title: 'Less Forced UI',
                    text: 'Ride rank becomes something you open when needed.',
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-3xl border border-white/10 bg-black/20 p-4">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/8">
                      {item.icon}
                    </div>
                    <div className="text-sm font-bold text-white">{item.title}</div>
                    <div className="mt-2 text-xs leading-6 text-slate-300">{item.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 rounded-[28px] border border-white/10 bg-slate-950/55 p-5">
              <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.26em] text-slate-400">Signup journey</div>
              <div className="grid gap-3 md:grid-cols-3">
                {onboardingSteps.map((item, index) => {
                  const isActive = item.id === step;
                  const isDone = onboardingSteps.findIndex((entry) => entry.id === step) > index;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-4 transition-colors ${
                        isDone
                          ? 'border-emerald-400/35 bg-emerald-400/10'
                          : isActive
                            ? 'border-cyan-300/35 bg-cyan-300/10'
                            : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <div className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">0{index + 1}</div>
                      <div className="mt-2 text-sm font-bold text-white">{item.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center">
            <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:p-8">
              <div className="mb-6 flex rounded-2xl bg-slate-950/45 p-1">
                {[
                  { id: 'signup', label: 'Create account' },
                  { id: 'login', label: 'Log in' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => switchMode(item.id)}
                    className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                      mode === item.id
                        ? 'bg-white text-slate-950 shadow-[0_12px_30px_rgba(255,255,255,0.16)]'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="mb-6">
                <h2 className="text-2xl font-black text-white">
                  {mode === 'login' ? 'Welcome back' : step === 'verify' ? 'Verify your email' : 'Start your rider profile'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {mode === 'login'
                    ? 'Jump back into your dashboard and continue where the last ride stopped.'
                    : step === 'verify'
                      ? 'Enter the code sent to your email before we create the account.'
                      : 'Name, email, password, then a short email check before bike setup.'}
                </p>
              </div>

              {error && <div className="mb-4 rounded-2xl border border-red-400/35 bg-red-500/15 px-4 py-3 text-sm text-red-100">{error}</div>}
              {status && <div className="mb-4 rounded-2xl border border-cyan-300/25 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">{status}</div>}

              {mode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-300">Username</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-300"
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-300">Password</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-300"
                      required
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-neonBlue to-cyan-300 px-4 py-3 font-black text-slate-950 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? 'Signing in...' : 'Enter dashboard'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <>
                  {step === 'details' && (
                    <form onSubmit={handleSendCode} className="space-y-4">
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-300">Full name</span>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-300"
                          required
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-300">Email</span>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-300"
                          required
                        />
                      </label>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-slate-300">Username</span>
                          <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-300"
                            required
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-slate-300">Password</span>
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-300"
                            required
                          />
                        </label>
                      </div>
                      <button
                        type="submit"
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-neonOrange to-orange-300 px-4 py-3 font-black text-slate-950 transition-transform hover:scale-[1.01]"
                      >
                        Send auth code
                        <Mail className="h-4 w-4" />
                      </button>
                    </form>
                  )}

                  {step === 'verify' && (
                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-200">
                        <div className="font-bold text-white">{email}</div>
                        <div className="mt-1 text-xs leading-6 text-slate-400">
                          This is wired as a staged React flow now. Replace the demo code step with the real mailer endpoint when the backend is ready.
                        </div>
                      </div>

                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-300">Auth code</span>
                        <input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-300"
                          placeholder="Enter 6-digit code"
                          required
                        />
                      </label>

                      <div className="grid gap-3 md:grid-cols-2">
                        <button
                          type="button"
                          onClick={resetSignup}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-slate-200 transition-colors hover:bg-white/10"
                        >
                          Edit details
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="rounded-2xl bg-gradient-to-r from-neonBlue to-cyan-300 px-4 py-3 font-black text-slate-950 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isSubmitting ? 'Creating account...' : 'Verify and continue'}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Login;
