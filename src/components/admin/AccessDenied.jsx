import { Link } from 'react-router-dom';
import { signOutAdmin } from '../../services/api/auth.js';

export default function AccessDenied({ email, message }) {
  const handleSignOut = async () => {
    await signOutAdmin();
    window.location.href = '/admin/login';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          {message || 'You do not have administrative permissions to access this panel.'}
        </p>

        {email && (
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 mb-6 font-mono break-all">
            Signed in as: <span className="font-semibold text-gray-700">{email}</span>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleSignOut}
            className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold rounded-lg transition-colors"
          >
            Switch Account / Sign Out
          </button>
          <Link
            to="/"
            className="block w-full py-2.5 px-4 text-center text-sm font-semibold text-brand-navy hover:underline"
          >
            Return to Public Website
          </Link>
        </div>
      </div>
    </div>
  );
}

