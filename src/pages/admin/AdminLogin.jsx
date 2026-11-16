import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import SEO from '../../components/seo/SEO.jsx';

export default function AdminLogin() {
  const { user, isAdmin, loading, error, statusCode, isForbidden, isLocal, isDevBypass, signInDev } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [signingIn, setSigningIn] = useState(false);
  const [loginError, setLoginError] = useState(null);

  const from = location.state?.from?.pathname || '/admin/dashboard';

  useEffect(() => {
    if (!loading && isAdmin) {
      navigate(from, { replace: true });
    }
  }, [loading, isAdmin, navigate, from]);

  const handleDevLogin = async () => {
    setSigningIn(true);
    setLoginError(null);
    try {
      const res = await signInDev();
      if (res.ok) {
        navigate(from, { replace: true });
      } else {
        setLoginError(res.error || 'Failed to authenticate via local development bypass.');
      }
    } catch (err) {
      setLoginError(err.message || 'An unexpected error occurred during local sign in.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleCloudflareAccessLogin = () => {
    // Navigating directly to /api/admin/session or /admin in production initiates Cloudflare Access IdP flow
    window.location.href = '/api/admin/session';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <LoadingSpinner message="Checking authentication status..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <SEO title="Admin Login" noindex={true} />
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-block">
          <img
            src="/assets/logo.jpeg"
            alt="YES ENTERPRISES"
            className="h-16 w-16 mx-auto rounded-xl object-contain bg-white p-1.5 shadow-sm border border-gray-100"
          />
        </Link>
        <h2 className="mt-4 text-2xl font-extrabold text-brand-navy">YES ENTERPRISES</h2>
        <p className="mt-1 text-sm text-gray-500 font-medium">Administrator Portal</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-gray-200/80 sm:px-10">
          {/* Forbidden Notice */}
          {isForbidden && (
            <div className="mb-6 rounded-xl bg-red-50 p-4 border border-red-100 text-sm text-red-700">
              <div className="flex items-start gap-2.5">
                <span className="text-red-500 font-bold shrink-0">⚠️</span>
                <div>
                  <p className="font-semibold">Access Denied (403)</p>
                  <p className="mt-0.5 text-xs text-red-600">
                    Your authenticated account is not listed in the <code>ADMIN_EMAILS</code> allowlist.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* General Login Error */}
          {(loginError || (error && statusCode !== 401)) && (
            <div className="mb-6 rounded-xl bg-amber-50 p-4 border border-amber-100 text-sm text-amber-800">
              <p className="font-medium">{loginError || error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Cloudflare Access Production Information */}
            <div className="rounded-xl bg-brand-ivory/60 border border-brand-navy/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs font-bold text-brand-navy uppercase tracking-wider">
                  Cloudflare Access Security
                </h3>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Administrative access is protected by Zero Trust Cloudflare Access with RS256 cryptographic verification and email allowlisting.
              </p>
            </div>

            {/* Local Development Action vs Production Cloudflare Access Action */}
            {isLocal ? (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                  <p className="font-semibold">Local Development Mode Active</p>
                  <p className="mt-1 text-blue-700">
                    You are running on localhost. You can sign in using the local admin bypass approved for Phase 4 testing.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDevLogin}
                  disabled={signingIn}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-brand-navy hover:bg-brand-navy-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-navy transition-colors disabled:opacity-60"
                >
                  {signingIn ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    'Sign In as Local Admin (Dev Bypass)'
                  )}
                </button>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={handleCloudflareAccessLogin}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-brand-navy hover:bg-brand-navy-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-navy transition-colors"
                >
                  Sign In with Cloudflare Access
                </button>
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <Link to="/" className="text-brand-navy hover:underline font-medium">
                ← Back to Catalogue
              </Link>
              <span>YES ENTERPRISES</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
