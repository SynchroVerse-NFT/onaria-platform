import { useState, FormEvent } from 'react';
import { Link } from 'react-router';
import toast from 'react-hot-toast';

export default function RequestPasswordReset() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!email) {
            toast.error('Please enter your email address');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/reset-password/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to send reset email');
            }

            setSuccess(true);
            toast.success('Check your email for reset instructions');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to send reset email');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-cosmic-gradient-full p-4">
                <div className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20 rounded-2xl p-8 md:p-12 max-w-md w-full">
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cosmic-blue/20 mb-4">
                            <svg className="w-8 h-8 text-cosmic-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold mb-4 text-white">Check Your Email</h2>
                        <p className="text-gray-300 mb-6">
                            If an account exists for <strong className="text-white">{email}</strong>, you'll receive a password reset link shortly.
                        </p>
                        <p className="text-sm text-gray-400 mb-6">
                            The link will expire in 1 hour for security reasons. If you don't receive an email, check your spam folder.
                        </p>
                        <Link
                            to="/"
                            className="inline-block bg-cosmic-gradient text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all"
                        >
                            Return to Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-cosmic-gradient-full p-4">
            <form onSubmit={handleSubmit} className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20 rounded-2xl p-8 md:p-12 max-w-md w-full">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold mb-2 text-white">Reset Password</h2>
                    <p className="text-gray-300">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cosmic-blue focus:border-transparent"
                            required
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-cosmic-gradient text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Sending...
                            </span>
                        ) : (
                            'Send Reset Link'
                        )}
                    </button>

                    <div className="text-center">
                        <Link to="/" className="text-cosmic-blue hover:text-cosmic-purple transition-colors text-sm">
                            Back to Login
                        </Link>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10">
                    <p className="text-xs text-gray-400 text-center">
                        Remember your password?{' '}
                        <Link to="/" className="text-cosmic-blue hover:text-cosmic-purple transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>
            </form>
        </div>
    );
}
