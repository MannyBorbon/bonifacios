import { useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getVisitorId() {
  let id = localStorage.getItem('bfc_vid');
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).substr(2, 12)}`;
    localStorage.setItem('bfc_vid', id);
  }
  return id;
}

function getDeviceInfo() {
  const ua = navigator.userAgent;
  let deviceType = 'desktop';
  let browser = 'unknown';
  let os = 'unknown';

  if (/mobile/i.test(ua)) deviceType = 'mobile';
  else if (/tablet|ipad/i.test(ua)) deviceType = 'tablet';

  if (/chrome/i.test(ua) && !/edg/i.test(ua)) browser = 'Chrome';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/edg/i.test(ua)) browser = 'Edge';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';

  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad/i.test(ua)) os = 'iOS';

  return { deviceType, browser, os };
}

function getUTMParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get('utm_source') || '',
    utmMedium: params.get('utm_medium') || '',
    utmCampaign: params.get('utm_campaign') || ''
  };
}

export default function PublicTracker() {
  useEffect(() => {
    const track = async () => {
      try {
        const { deviceType, browser, os } = getDeviceInfo();
        const utm = getUTMParams();

        await fetch(`${API_URL}/analytics/public-track.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitorId: getVisitorId(),
            pageUrl: window.location.pathname,
            pageTitle: document.title,
            referrer: document.referrer,
            deviceType,
            browser,
            os,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            language: navigator.language || '',
            ...utm
          })
        });
      } catch {
        // Silent fail — don't break user experience
      }
    };

    track();
  }, []);

  return null; // Renders nothing
}
