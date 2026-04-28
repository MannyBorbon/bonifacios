import api from './api';

class TrackingService {
  constructor() {
    this.sessionId = null;
    this.currentPageViewId = null;
    this.pageStartTime = null;
    this.maxScrollDepth = 0;
    this.activityInterval = null;
    this.setupVisibilityTracking();
    this.setupWindowCloseTracking();
    this.setupClickTracking();
  }

  // Generar token único de sesión
  generateSessionToken() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Detectar información del dispositivo
  getDeviceInfo() {
    const ua = navigator.userAgent;
    let deviceType = 'desktop';
    let browser = 'unknown';
    let os = 'unknown';

    // Detectar tipo de dispositivo
    if (/mobile/i.test(ua)) deviceType = 'mobile';
    else if (/tablet|ipad/i.test(ua)) deviceType = 'tablet';

    // Detectar navegador
    if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
    else if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
    else if (ua.indexOf('Safari') > -1) browser = 'Safari';
    else if (ua.indexOf('Edge') > -1) browser = 'Edge';

    // Detectar sistema operativo
    if (ua.indexOf('Win') > -1) os = 'Windows';
    else if (ua.indexOf('Mac') > -1) os = 'MacOS';
    else if (ua.indexOf('Linux') > -1) os = 'Linux';
    else if (ua.indexOf('Android') > -1) os = 'Android';
    else if (ua.indexOf('iOS') > -1) os = 'iOS';

    return {
      user_agent: ua,
      device_type: deviceType,
      browser,
      os,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight
    };
  }

  // ─── Heartbeat: actualiza last_activity cada 30 seg ───────────────────────
  startHeartbeat() {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => this.updateActivity(), 30000);
  }
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Iniciar sesión de tracking
  // - sessionStorage persiste en refresh pero se borra al cerrar la pestaña
  // - Si hay sesión en sessionStorage, la reanuda (re-establece PHP $_SESSION)
  // - Si no hay, crea una nueva
  async startSession() {
    const existingId    = sessionStorage.getItem('trackingSessionId');
    const existingToken = sessionStorage.getItem('trackingSessionToken');

    if (existingId && existingToken) {
      try {
        const res = await api.post('/tracking/session/start.php', {
          resumeSessionId: parseInt(existingId, 10),
          resumeToken: existingToken
        });
        if (res.data.resumed) {
          this.sessionId    = parseInt(existingId, 10);
          this.sessionToken = existingToken;
          this.startHeartbeat();
          console.log('Tracking session resumed:', this.sessionId);
          return;
        }
      } catch {
        // Fall through to create new session
      }
      // Session expired or invalid — clear stale storage
      sessionStorage.removeItem('trackingSessionId');
      sessionStorage.removeItem('trackingSessionToken');
    }

    try {
      const response = await api.post('/tracking/session/start.php', {
        timestamp: new Date().toISOString()
      });
      this.sessionId    = response.data.sessionId;
      this.sessionToken = response.data.sessionToken;
      sessionStorage.setItem('trackingSessionId', this.sessionId);
      sessionStorage.setItem('trackingSessionToken', this.sessionToken);
      this.startHeartbeat();
      console.log('Tracking session started:', this.sessionId);
    } catch (error) {
      console.error('Error starting tracking session:', error);
    }
  }

  // Actualizar actividad (heartbeat)
  async updateActivity() {
    if (!this.sessionId) return;
    try {
      await api.post('/tracking/session/activity.php', { sessionId: this.sessionId });
    } catch {
      // Silent fail — non-critical
    }
  }

  // Finalizar sesión (logout explícito)
  async endSession() {
    if (!this.sessionId) return;
    this.stopHeartbeat();
    const id    = this.sessionId;
    const token = this.sessionToken;
    this.sessionId    = null;
    this.sessionToken = null;
    sessionStorage.removeItem('trackingSessionId');
    sessionStorage.removeItem('trackingSessionToken');
    try {
      await api.post('/tracking/session/end.php', { sessionId: id, sessionToken: token });
      console.log('Tracking session ended');
    } catch (error) {
      console.error('Error ending tracking session:', error);
    }
  }

  // Registrar vista de página (deduplica mismo pathname)
  async trackPageView() {
    if (!this.sessionId) return;
    const path = window.location.pathname;
    if (path === this._lastTrackedPath) return; // same page, skip
    this._lastTrackedPath = path;

    try {
      // Actualizar página anterior si existe
      if (this.currentPageViewId) {
        await this.updatePageView();
      }

      const response = await api.post('/tracking/page-view.php', {
        sessionId: this.sessionId,
        pageUrl: window.location.pathname,
        pageTitle: document.title,
        referrer: document.referrer
      });

      this.currentPageViewId = response.data.pageViewId;
      this.pageStartTime = Date.now();
      this.maxScrollDepth = 0;
    } catch (error) {
      console.error('Error tracking pageview:', error);
    }
  }

  // Actualizar tiempo en página
  async updatePageView() {
    if (!this.currentPageViewId || !this.pageStartTime) return;

    try {
      const timeOnPage = Math.round((Date.now() - this.pageStartTime) / 1000);

      await api.post('/tracking/page-view-update.php', {
        pageViewId: this.currentPageViewId,
        timeOnPage,
        scrollDepth: this.maxScrollDepth
      });
    } catch (error) {
      console.error('Error updating pageview:', error);
    }
  }

  // Configurar tracking de scroll
  setupScrollTracking() {
    let scrollTimeout;
    
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      
      scrollTimeout = setTimeout(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = Math.round((scrollTop / docHeight) * 100);
        
        if (scrollPercent > this.maxScrollDepth) {
          this.maxScrollDepth = scrollPercent;
        }
      }, 100);
    });
  }

  // Configurar tracking de clicks (guard against double-registration + 300ms cooldown)
  setupClickTracking() {
    if (this._clickTrackingActive) return;
    this._clickTrackingActive = true;
    this._lastClickAt = 0;
    document.addEventListener('click', (e) => {
      const now = Date.now();
      if (now - this._lastClickAt < 300) return; // skip rapid duplicates
      this._lastClickAt = now;
      this.trackClick(e);
    }, true);
  }

  // Find the nearest meaningful ancestor element (a, button, input, select, [role=button])
  _findMeaningful(el) {
    const TAGS = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
    let node = el;
    for (let i = 0; i < 6 && node && node !== document; i++) {
      if (TAGS.includes(node.tagName) || node.getAttribute?.('role') === 'button' || node.onclick) return node;
      node = node.parentElement;
    }
    return null;
  }

  // Registrar click — solo en elementos significativos (links, botones, inputs)
  async trackClick(event) {
    if (!this.sessionId) return;
    const element = this._findMeaningful(event.target);
    if (!element) return; // ignore clicks on plain text/divs/backgrounds

    try {
      const className = typeof element.className === 'string' ? element.className : null;
      await api.post('/tracking/click.php', {
        sessionId: this.sessionId,
        eventType: 'click',
        pageUrl: window.location.pathname,
        elementId: element.id || null,
        elementClass: className,
        elementText: element.textContent?.trim().substring(0, 100) || null,
        clickX: event.clientX,
        clickY: event.clientY,
        metadata: {
          tagName: element.tagName,
          href: element.href || null
        }
      });
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  }

  // Configurar tracking de visibilidad (minimizar/cambiar pestaña)
  setupVisibilityTracking() {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', async () => {
      if (!this.sessionId) return;

      const isVisible = !document.hidden;
      
      try {
        await api.post('/tracking/visibility.php', {
          isVisible,
          pageUrl: window.location.pathname,
          eventType: isVisible ? 'window_focus' : 'window_blur'
        });

        console.log(isVisible ? 'Ventana visible/maximizada' : 'Ventana minimizada/oculta');
      } catch (error) {
        console.error('Error tracking visibility:', error);
      }
    });
  }

  // Configurar tracking de cierre de ventana
  // NOTA: beforeunload dispara en refresh Y en cierre, por eso NO llamamos end.php aquí.
  // La sesión se cierra: (a) al hacer logout, (b) al abrir nueva sesión (auto-close en start.php).
  // sessionStorage se borra automáticamente al cerrar la pestaña, así que la próxima
  // vez que el usuario abra el admin, start.php creará una nueva sesión y cerrará la anterior.
  setupWindowCloseTracking() {
    if (typeof window === 'undefined') return;

    const sendEndBeacon = () => {
      if (!this.sessionId) return;
      const payload = JSON.stringify({ sessionId: this.sessionId, sessionToken: this.sessionToken });
      navigator.sendBeacon(`${import.meta.env.VITE_API_URL}/tracking/session/end.php`, payload);
    };

    const sendActivityBeacon = () => {
      if (!this.sessionId) return;
      const payload = JSON.stringify({ sessionId: this.sessionId });
      navigator.sendBeacon(`${import.meta.env.VITE_API_URL}/tracking/session/activity.php`, payload);
    };

    window.addEventListener('pagehide', () => {
      sendEndBeacon();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        sendActivityBeacon();
      }
    });

    window.addEventListener('beforeunload', () => {
      sendActivityBeacon();
    });
  }

  // Registrar evento personalizado
  async trackEvent(eventType, data = {}) {
    if (!this.sessionId) return;

    try {
      await api.post('/tracking/click.php', {
        sessionId: this.sessionId,
        eventType,
        pageUrl: window.location.pathname,
        metadata: data
      });
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }
}

export default new TrackingService();
