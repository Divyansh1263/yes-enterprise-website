import React from 'react';
import { Link } from 'react-router-dom';

export default class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ADMIN_ERROR_BOUNDARY_CAUGHT]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <span className="text-3xl">⚠️</span>
            </div>

            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              An unexpected error occurred in the Admin Panel
            </h1>

            <p className="text-sm text-gray-600 leading-relaxed">
              {this.state.error?.message || 'Something went wrong while rendering this section.'}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleRetry}
                className="w-full sm:w-auto px-5 py-2.5 bg-brand-navy text-white text-xs font-bold rounded-xl hover:bg-brand-navy-light shadow-sm transition-colors"
              >
                🔄 Refresh Page
              </button>
              <Link
                to="/admin/dashboard"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="w-full sm:w-auto px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 shadow-sm transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
