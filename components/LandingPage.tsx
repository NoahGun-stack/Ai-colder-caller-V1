
import React from 'react';

interface LandingPageProps {
    onSignIn: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn }) => {
    return (
        <div className="font-sans text-white antialiased bg-[#080808] selection:bg-[#d4a843]/20 selection:text-[#d4a843] h-screen overflow-y-auto">
            {/* Header */}
            <header className="fixed w-full z-50 bg-[#080808]/80 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="text-[#d4a843] font-black text-xl tracking-tighter">NEURO<span className="font-light">LINE</span></div>
                    </div>
                    <button
                        onClick={onSignIn}
                        className="group relative px-6 py-2.5 text-sm font-semibold text-gray-600 hover:text-[#d4a843] transition-colors"
                    >
                        Log In
                        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#d4a843] transform scale-x-0 origin-left transition-transform group-hover:scale-x-100"></span>
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            <main>
                <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#d4a843]/10 border border-[#404040] mb-8">
                            <span className="w-2 h-2 rounded-full bg-[#d4a843] animate-pulse"></span>
                            <span className="text-sm font-medium text-[#d4a843] tracking-wide uppercase">Live: AI Agent 2.0</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-8 leading-tight">
                            Cold Calling, <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d4a843] to-[#e8c06a]">Reinvented.</span>
                        </h1>
                        <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-600 leading-relaxed mb-12">
                            Stop burning leads. Meet <span className="font-semibold text-white">Amplify</span> — the AI SDR that navigates gatekeepers, handles objections, and books meetings with human-level nuance.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <a
                                href="https://calendly.com/noah-neuroline/30min"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto px-8 py-4 bg-[#d4a843] hover:bg-[#e8c06a] text-[#080808] rounded-lg text-lg font-bold transition-all transform hover:-translate-y-1 shadow-lg shadow-[#d4a843]/20"
                            >
                                Book a Demo
                            </a>
                            <button
                                onClick={onSignIn}
                                className="w-full sm:w-auto px-8 py-4 bg-[#080808] border border-[#404040] text-gray-700 rounded-lg text-lg font-semibold hover:bg-[#1a1a1a] hover:border-[#525252] transition-all"
                            >
                                View Live Dashboard
                            </button>
                        </div>
                    </div>

                    {/* Abstract Background Element */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-[#d4a843]/10 to-[#e8c06a]/10 rounded-full blur-3xl -z-10 opacity-60"></div>
                </div>

                {/* The "Synopsis" / Feature Section */}
                <section className="py-24 bg-[#1a1a1a] border-t border-[#404040]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <div>
                                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                                    More Than Just a Script.
                                    <br />
                                    <span className="text-[#d4a843]">It's a Conversation.</span>
                                </h2>
                                <div className="space-y-8">
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#d4a843]/10 flex items-center justify-center text-[#d4a843]">
                                            <i className="fas fa-brain text-xl"></i>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-2">Contextual Understanding</h3>
                                            <p className="text-gray-600 leading-relaxed">
                                                Amplify doesn't just read lines. It listens, pauses, and adapts to tone and interruptions in real-time, just like your best sales rep.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#d4a843]/10 flex items-center justify-center text-[#d4a843]">
                                            <i className="fas fa-shield-alt text-xl"></i>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-2">Objection Handling</h3>
                                            <p className="text-gray-600 leading-relaxed">
                                                "Not interested"? "Send me an email"? Amplify pivots instantly with proven rebuttals to keep the conversation alive and drive towards a book.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#d4a843]/10 flex items-center justify-center text-[#d4a843]">
                                            <i className="fas fa-bolt text-xl"></i>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-2">Infinite Scaling</h3>
                                            <p className="text-gray-600 leading-relaxed">
                                                Launch 10 or 10,000 concurrent calls instantly. No hiring, no training, no churn. Just consistent, high-performance outreach.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Visual / Abstract Representation of the Agent */}
                            <div className="relative">
                                <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-[#080808] border border-gray-100 p-8">
                                    <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                            <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                        </div>
                                        <div className="text-xs font-mono text-[#e5e7eb]">Amplify_Agent_v2.log</div>
                                    </div>
                                    <div className="space-y-4 font-mono text-sm">
                                        <div className="flex gap-4">
                                            <span className="text-[#e5e7eb] w-16 shrink-0">[10:02:15]</span>
                                            <span className="text-[#d4a843] font-bold">Agent:</span>
                                            <span className="text-white">Hi John, it's Alex from Neuroline. Did I catch you at a bad time?</span>
                                        </div>
                                        <div className="flex gap-4">
                                            <span className="text-[#e5e7eb] w-16 shrink-0">[10:02:18]</span>
                                            <span className="text-[#d1d5db] font-bold">Lead:</span>
                                            <span className="text-gray-600">I'm pretty busy right now, what is this about?</span>
                                        </div>
                                        <div className="flex gap-4">
                                            <span className="text-[#e5e7eb] w-16 shrink-0">[10:02:20]</span>
                                            <span className="text-green-600 text-xs uppercase tracking-wider py-1">Analyzing Tone: Rush/Curious...</span>
                                        </div>
                                        <div className="flex gap-4">
                                            <span className="text-[#e5e7eb] w-16 shrink-0">[10:02:21]</span>
                                            <span className="text-[#d4a843] font-bold">Agent:</span>
                                            <span className="text-white">I'll be brief then. I'm calling because we've helped other roofing companies in Austin automate their lead intake...</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Decorative elements */}
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#d4a843]/10 rounded-full blur-2xl"></div>
                                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#e8c06a]/10 rounded-full blur-2xl"></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="bg-[#080808] border-t border-gray-100 py-12">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="text-[#d4a843] font-black text-lg tracking-tighter opacity-50">NEURO<span className="font-light">LINE</span></div>
                            <span className="text-sm text-[#d1d5db] font-medium">Neuroline © 2026</span>
                        </div>
                        <div className="flex gap-6">
                            <a href="#" className="text-sm text-[#e5e7eb] hover:text-[#d4a843] transition-colors">Privacy Policy</a>
                            <a href="#" className="text-sm text-[#e5e7eb] hover:text-[#d4a843] transition-colors">Terms of Service</a>
                            <a href="mailto:contact@neuroline.com" className="text-sm text-[#e5e7eb] hover:text-[#d4a843] transition-colors">Contact</a>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
};
