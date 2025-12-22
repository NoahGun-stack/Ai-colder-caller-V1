import React, { useState } from 'react';
import { supabase } from '../services/supabase';

const Auth: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setMessage({ type: 'success', text: 'Check your email for the confirmation link!' });
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'An error occurred' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#f8f9fb]">
            <div className="w-full max-w-md bg-white p-8 border border-[#e5e7eb] shadow-sm">
                <div className="mb-6 text-center">
                    <h1 className="text-xl font-bold uppercase tracking-tight text-[#111827]">RoofPulse</h1>
                    <p className="text-sm text-[#6b7280] mt-2">
                        {isSignUp ? 'Create your account' : 'Sign in to your account'}
                    </p>
                </div>

                {message && (
                    <div className={`mb-4 p-3 text-xs font-medium ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-[#374151] mb-1">Email address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border border-[#d1d5db] px-3 py-2 text-sm focus:border-[#4338ca] focus:ring-1 focus:ring-[#4338ca] outline-none transition-all"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[#374151] mb-1">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-[#d1d5db] px-3 py-2 text-sm focus:border-[#4338ca] focus:ring-1 focus:ring-[#4338ca] outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#4338ca] hover:bg-[#3730a3] text-white font-medium py-2.5 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                    >
                        {loading ? (
                            <i className="fas fa-circle-notch fa-spin"></i>
                        ) : (
                            isSignUp ? 'Create account' : 'Sign in'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setMessage(null);
                        }}
                        className="text-xs text-[#4338ca] font-medium hover:underline"
                    >
                        {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Auth;
