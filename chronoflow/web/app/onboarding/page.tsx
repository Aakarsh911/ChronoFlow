"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiChevronRight, FiCalendar, FiSlack, FiTrello, FiUsers, FiShield } from "react-icons/fi";
import { FaGoogle, FaMicrosoft } from "react-icons/fa";

const steps = [
  "welcome",
  "timezone",
  "connect",
  "privacy",
  "tour"
];

export default function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "");
  const [workingHours, setWorkingHours] = useState({ start: "09:00", end: "17:00" });
  const [quietHours, setQuietHours] = useState({ start: "22:00", end: "07:00" });
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  function next() { setStep(s => Math.min(s + 1, steps.length - 1)); }
  function prev() { setStep(s => Math.max(s - 1, 0)); }
  async function completeOnboarding() {
    setSaving(true);
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone, workingHours, quietHours }),
    });
    router.push("/dashboard");
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetch('/api/onboarding');
      if (!res.ok) return;
      const json = await res.json();
      if (active && json.onboardingCompleted) router.replace('/dashboard');
    })();
    return () => { active = false; };
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-teal-50 to-blue-100 animate-fadein">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center transition-all duration-500 ease-in-out">
        {/* Stepper */}
        <div className="flex mb-8 w-full justify-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className={`h-2 w-10 rounded-full ${i <= step ? "bg-teal-500" : "bg-gray-200"} transition-all duration-300`}></div>
          ))}
        </div>
        {/* Step Content */}
        {step === 0 && (
          <div className="animate-slidein flex flex-col items-center">
            <h1 className="text-3xl font-bold text-teal-600 mb-2">Welcome to AI Time Manager</h1>
            <p className="text-gray-500 mb-6 text-center">Let’s set up your workspace for smarter productivity.</p>
            <button onClick={next} className="bg-teal-600 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-teal-700 transition-all">Get Started <FiChevronRight className="inline ml-2" /></button>
          </div>
        )}
        {step === 1 && (
          <div className="animate-slidein w-full">
            <h2 className="text-2xl font-semibold mb-2 text-center">Set your timezone & hours</h2>
            <div className="mb-4">
              <label className="block text-gray-600 mb-1">Timezone</label>
              <input type="text" value={timezone} onChange={e => setTimezone(e.target.value)} className="w-full border px-3 py-2 rounded-lg" />
            </div>
            <div className="mb-4 flex gap-4">
              <div className="flex-1">
                <label className="block text-gray-600 mb-1">Working hours</label>
                <input type="time" value={workingHours.start} onChange={e => setWorkingHours({ ...workingHours, start: e.target.value })} className="border px-3 py-2 rounded-lg w-full" />
                <span className="mx-2">to</span>
                <input type="time" value={workingHours.end} onChange={e => setWorkingHours({ ...workingHours, end: e.target.value })} className="border px-3 py-2 rounded-lg w-full" />
              </div>
              <div className="flex-1">
                <label className="block text-gray-600 mb-1">Quiet hours</label>
                <input type="time" value={quietHours.start} onChange={e => setQuietHours({ ...quietHours, start: e.target.value })} className="border px-3 py-2 rounded-lg w-full" />
                <span className="mx-2">to</span>
                <input type="time" value={quietHours.end} onChange={e => setQuietHours({ ...quietHours, end: e.target.value })} className="border px-3 py-2 rounded-lg w-full" />
              </div>
            </div>
            <div className="flex justify-between w-full mt-6">
              <button onClick={prev} className="text-teal-600 font-medium">Back</button>
              <button onClick={next} className="bg-teal-600 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-teal-700 transition-all">Next <FiChevronRight className="inline ml-2" /></button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="animate-slidein w-full">
            <h2 className="text-2xl font-semibold mb-2 text-center">Connect your tools</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button className="flex items-center gap-2 border rounded-lg px-4 py-3 hover:bg-gray-50 transition-all shadow">
                <FaGoogle className="text-red-500 w-6 h-6" /> Google Calendar
              </button>
              <button className="flex items-center gap-2 border rounded-lg px-4 py-3 hover:bg-gray-50 transition-all shadow">
                <FiSlack className="text-blue-500 w-6 h-6" /> Slack
              </button>
              <button className="flex items-center gap-2 border rounded-lg px-4 py-3 hover:bg-gray-50 transition-all shadow">
                <FiTrello className="text-blue-700 w-6 h-6" /> Jira
              </button>
              <button className="flex items-center gap-2 border rounded-lg px-4 py-3 hover:bg-gray-50 transition-all shadow">
                <FaMicrosoft className="text-blue-600 w-6 h-6" /> Teams
              </button>
            </div>
            <div className="flex justify-between w-full mt-6">
              <button onClick={prev} className="text-teal-600 font-medium">Back</button>
              <button onClick={next} className="bg-teal-600 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-teal-700 transition-all">Next <FiChevronRight className="inline ml-2" /></button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="animate-slidein w-full">
            <h2 className="text-2xl font-semibold mb-2 text-center">What we access & why</h2>
            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-gray-700 shadow">
              <ul className="list-disc pl-6">
                <li><span className="font-semibold">Google Calendar:</span> To sync meetings and focus blocks.</li>
                <li><span className="font-semibold">Slack:</span> To pull actionable messages and team info.</li>
                <li><span className="font-semibold">Jira:</span> To show assigned issues and log work.</li>
                <li><span className="font-semibold">Teams:</span> For team scheduling and notifications.</li>
              </ul>
              <p className="mt-2 text-sm text-gray-500">We only access what’s needed for productivity features. Your data is never shared outside your workspace.</p>
            </div>
            <div className="flex justify-between w-full mt-6">
              <button onClick={prev} className="text-teal-600 font-medium">Back</button>
              <button onClick={next} className="bg-teal-600 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-teal-700 transition-all">Next <FiChevronRight className="inline ml-2" /></button>
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="animate-slidein w-full flex flex-col items-center">
            <h2 className="text-2xl font-semibold mb-2 text-center">Home tour</h2>
            <p className="text-gray-500 mb-6 text-center">Here’s how AI Time Manager helps you plan your week and get more done.</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-teal-50 rounded-lg p-4 shadow flex flex-col items-center">
                <FiCalendar className="text-teal-600 w-8 h-8 mb-2" />
                <span className="font-semibold">Smart calendar</span>
                <span className="text-xs text-gray-500">Meetings, focus blocks, and tasks in one view.</span>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 shadow flex flex-col items-center">
                <FiUsers className="text-blue-600 w-8 h-8 mb-2" />
                <span className="font-semibold">Team sync</span>
                <span className="text-xs text-gray-500">See who’s available and plan together.</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 shadow flex flex-col items-center">
                <FiShield className="text-gray-600 w-8 h-8 mb-2" />
                <span className="font-semibold">Privacy-first</span>
                <span className="text-xs text-gray-500">Your data is secure and private.</span>
              </div>
              <div className="bg-green-50 rounded-lg p-4 shadow flex flex-col items-center">
                <FiChevronRight className="text-green-600 w-8 h-8 mb-2" />
                <span className="font-semibold">AI-powered</span>
                <span className="text-xs text-gray-500">Get smart suggestions and automate planning.</span>
              </div>
            </div>
            <button
              className="bg-teal-600 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-teal-700 transition-all mt-4"
              onClick={completeOnboarding}
              disabled={saving}
            >
              {saving ? "Saving..." : "Go to Dashboard"} <FiChevronRight className="inline ml-2" />
            </button>
          </div>
        )}
      </div>
      <style jsx>{`
        .animate-fadein { animation: fadein 0.7s; }
        .animate-slidein { animation: slidein 0.5s; }
        @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slidein { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </main>
  );
}
