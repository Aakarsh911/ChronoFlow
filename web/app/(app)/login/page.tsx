import { AuthForm } from "@/components/auth-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-100">
      {/* Sophisticated Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large gradient orbs - more vibrant */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-blue-300 via-blue-200 to-transparent rounded-full opacity-40"></div>
        <div className="absolute bottom-0 left-0 w-[900px] h-[900px] bg-gradient-to-tr from-indigo-300 via-purple-200 to-transparent rounded-full opacity-40"></div>
        <div className="absolute top-1/3 left-1/2 w-[600px] h-[600px] bg-gradient-to-br from-purple-200 to-transparent rounded-full opacity-30"></div>
        
        {/* Diagonal stripes pattern - more visible */}
        <div className="absolute inset-0 opacity-[0.08]" style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            #3b82f6 0px,
            #3b82f6 2px,
            transparent 2px,
            transparent 50px
          )`
        }}></div>
        
        {/* Dot grid pattern - more prominent */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `radial-gradient(circle, #4f46e5 1.5px, transparent 1.5px)`,
          backgroundSize: '40px 40px'
        }}></div>
        
        {/* Geometric shapes - more visible */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 border-4 border-blue-400/40 rounded-full"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] border-4 border-indigo-400/40 rounded-lg rotate-45"></div>
        <div className="absolute top-1/2 right-1/3 w-56 h-56 border-4 border-purple-400/40 rotate-12"></div>
        <div className="absolute bottom-1/3 left-1/3 w-40 h-40 bg-blue-300/20 rounded-2xl rotate-45"></div>
        <div className="absolute top-2/3 right-1/2 w-32 h-32 bg-indigo-300/20 rounded-full"></div>
        
        {/* Grid lines with more visibility */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#6366f1" strokeWidth="1" opacity="0.15"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        
        {/* Accent circles */}
        <div className="absolute top-20 left-20 w-3 h-3 bg-blue-500 rounded-full opacity-60"></div>
        <div className="absolute bottom-32 right-40 w-2 h-2 bg-indigo-500 rounded-full opacity-60"></div>
        <div className="absolute top-1/2 left-1/4 w-2.5 h-2.5 bg-purple-500 rounded-full opacity-60"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Side - Branding & Features */}
          <div className="text-left space-y-8 hidden lg:block">
            <div className="space-y-6">
              <div>
                <h1 className="text-7xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
                  ChronoFlow
                </h1>
                <p className="text-3xl text-slate-800 font-semibold">
                  Master Your Time, Amplify Your Impact
                </p>
              </div>
              <p className="text-xl text-slate-600 leading-relaxed">
                AI-powered productivity platform that seamlessly integrates your calendar, tasks, and communications.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-6">
              <div className="flex items-start gap-4 group">
                <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-slate-900 font-bold text-xl mb-1">AI-Powered Intelligence</h3>
                  <p className="text-slate-600 text-base">Smart scheduling and task management with Claude AI</p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="w-14 h-14 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-slate-900 font-bold text-xl mb-1">Unified Calendar</h3>
                  <p className="text-slate-600 text-base">Google Calendar, Outlook, and Teams in one place</p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="w-14 h-14 rounded-xl bg-purple-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-slate-900 font-bold text-xl mb-1">Smart Email Management</h3>
                  <p className="text-slate-600 text-base">Gmail and Outlook integration with AI assistance</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Auth Form */}
          <div className="w-full">
            <AuthForm />
          </div>
        </div>
      </div>
    </div>
  )
}
