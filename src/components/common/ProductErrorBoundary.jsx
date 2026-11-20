import React from 'react';
import { Link } from 'react-router-dom';
import { buildWhatsAppContactUrl } from '../../lib/whatsapp';

/**
 * ProductErrorBoundary:
 * Catches any unhandled React render errors inside ProductDetail to prevent
 * the entire application from unmounting and displaying a blank white screen.
 */
export default class ProductErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[PRODUCT_DETAIL_ERROR_CAUGHT]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isHindi = typeof window !== 'undefined' && window.location.pathname.startsWith('/hi');
      const waUrl = buildWhatsAppContactUrl(isHindi ? 'hi' : 'en');
      const productsPath = isHindi ? '/hi/products' : '/products';

      return (
        <div className="min-h-screen bg-white flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-3xl">
              ⚠️
            </div>
            <h1 className="text-2xl font-bold text-brand-navy">
              {isHindi ? 'उत्पाद विवरण लोड करने में समस्या' : 'Unable to Display Product'}
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              {isHindi
                ? 'इस उत्पाद को प्रदर्शित करते समय एक तकनीकी समस्या आई। कृपया पुनः प्रयास करें या हमारे कैटलॉग पर वापस जाएं।'
                : 'An unexpected error occurred while rendering this product. Please refresh or return to the catalogue.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="px-6 py-3 bg-brand-navy text-white font-semibold rounded-xl hover:bg-brand-navy-light transition-colors text-sm"
              >
                🔄 {isHindi ? 'पुनः प्रयास करें' : 'Try Again'}
              </button>
              <Link
                to={productsPath}
                className="px-6 py-3 bg-brand-ivory text-brand-navy font-semibold rounded-xl hover:bg-gray-200 transition-colors text-sm border border-gray-200"
              >
                {isHindi ? 'कैटलॉग पर वापस जाएं' : 'Back to Catalogue'}
              </Link>
            </div>
            <div className="pt-2">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                <span>💬 {isHindi ? 'WhatsApp पर पूछताछ करें' : 'Enquire directly on WhatsApp'}</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
