import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import siteConfig from '../../config/site.config';

const SITE_URL = 'https://yesenterprises.net.in';
const DEFAULT_IMAGE = `${SITE_URL}/assets/logo.jpeg`;

function updateOrCreateMeta(selector, attributeName, attributeValue, content) {
  let element = document.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content || '');
}

function updateOrCreateLink(selector, rel, href, extraAttributes = {}) {
  let element = document.querySelector(selector);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    for (const [key, val] of Object.entries(extraAttributes)) {
      element.setAttribute(key, val);
    }
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

/**
 * Dynamic SEO Component for YES ENTERPRISES
 * Updates document.title, canonical, hreflang, Open Graph, Twitter cards, and Schema.org JSON-LD.
 */
export default function SEO({
  title,
  description,
  canonicalPath,
  image,
  type = 'website',
  schema = null,
  noindex = false,
}) {
  const location = useLocation();

  useEffect(() => {
    // 1. Resolve Path and Canonical URLs
    const rawPath = canonicalPath || location.pathname;
    const isHindi = rawPath.startsWith('/hi');
    let enRelativePath = isHindi ? rawPath.replace(/^\/hi/, '') : rawPath;
    if (!enRelativePath || enRelativePath === '') enRelativePath = '/';

    const currentUrl = `${SITE_URL}${rawPath === '/' ? '' : rawPath}`;
    const enUrl = `${SITE_URL}${enRelativePath === '/' ? '' : enRelativePath}`;
    const hiUrl = `${SITE_URL}/hi${enRelativePath === '/' ? '' : enRelativePath}`;

    // 2. Resolve Title & Description
    const defaultTitle = isHindi
      ? 'फीडिंग बोतलें, पानी की बोतलें एवं स्टेनलेस स्टील टिफिन | YES ENTERPRISES'
      : 'Feeding Bottles, Water Bottles & Stainless Steel Tiffins | YES ENTERPRISES';
    const finalTitle = title ? `${title} | YES ENTERPRISES` : defaultTitle;

    const defaultDesc = isHindi
      ? 'YES ENTERPRISES — फीडिंग बोतलें, पानी की बोतलें, स्टील सिपर और टिफिन बॉक्स के निर्माता एवं थोक आपूर्तिकर्ता।'
      : 'Explore feeding bottles, water bottles, stainless steel sippers and tiffin boxes from YES ENTERPRISES. Wholesale catalogue.';
    const finalDesc = description || defaultDesc;

    // 3. Resolve Image
    let finalImageUrl = DEFAULT_IMAGE;
    if (image) {
      if (image.startsWith('http://') || image.startsWith('https://')) {
        finalImageUrl = image;
      } else {
        finalImageUrl = `${SITE_URL}${image.startsWith('/') ? '' : '/'}${image}`;
      }
    }

    // 4. Update Document Title
    document.title = finalTitle;

    // 5. Update HTML lang
    document.documentElement.lang = isHindi ? 'hi' : 'en';

    // 6. Meta Description & Robots
    updateOrCreateMeta('meta[name="description"]', 'name', 'description', finalDesc);
    updateOrCreateMeta(
      'meta[name="robots"]',
      'name',
      'robots',
      noindex ? 'noindex, nofollow' : 'index, follow'
    );

    // 7. Canonical & Hreflang
    updateOrCreateLink('link[rel="canonical"]', 'canonical', currentUrl);
    updateOrCreateLink('link[rel="alternate"][hreflang="en"]', 'alternate', enUrl, { hreflang: 'en' });
    updateOrCreateLink('link[rel="alternate"][hreflang="hi"]', 'alternate', hiUrl, { hreflang: 'hi' });
    updateOrCreateLink('link[rel="alternate"][hreflang="x-default"]', 'alternate', enUrl, { hreflang: 'x-default' });

    // 8. Open Graph
    updateOrCreateMeta('meta[property="og:site_name"]', 'property', 'og:site_name', siteConfig.companyName);
    updateOrCreateMeta('meta[property="og:type"]', 'property', 'og:type', type);
    updateOrCreateMeta('meta[property="og:url"]', 'property', 'og:url', currentUrl);
    updateOrCreateMeta('meta[property="og:title"]', 'property', 'og:title', finalTitle);
    updateOrCreateMeta('meta[property="og:description"]', 'property', 'og:description', finalDesc);
    updateOrCreateMeta('meta[property="og:image"]', 'property', 'og:image', finalImageUrl);

    // 9. Twitter / X Cards
    updateOrCreateMeta('meta[name="twitter:card"]', 'name', 'twitter:card', type === 'product' ? 'summary_large_image' : 'summary');
    updateOrCreateMeta('meta[name="twitter:title"]', 'name', 'twitter:title', finalTitle);
    updateOrCreateMeta('meta[name="twitter:description"]', 'name', 'twitter:description', finalDesc);
    updateOrCreateMeta('meta[name="twitter:image"]', 'name', 'twitter:image', finalImageUrl);

    // 10. Structured Data (Schema.org JSON-LD)
    let schemaScript = document.getElementById('page-structured-data');
    if (schema) {
      if (!schemaScript) {
        schemaScript = document.createElement('script');
        schemaScript.type = 'application/ld+json';
        schemaScript.id = 'page-structured-data';
        document.head.appendChild(schemaScript);
      }
      schemaScript.textContent = JSON.stringify(schema);
    } else if (schemaScript) {
      schemaScript.remove();
    }

    return () => {
      // Cleanup custom structured data if needed
      const existing = document.getElementById('page-structured-data');
      if (existing) existing.remove();
    };
  }, [title, description, canonicalPath, image, type, schema, noindex, location.pathname]);

  return null;
}
