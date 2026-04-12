import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Iniciar sesión de tracking
router.post('/session/start', authenticateToken, async (req, res) => {
  try {
    const { sessionToken, deviceInfo } = req.body;
    const { ip_address, user_agent, device_type, browser, os, country, city } = deviceInfo || {};

    const result = await query(
      `INSERT INTO user_sessions 
       (user_id, session_token, ip_address, user_agent, device_type, browser, os, country, city) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        sessionToken,
        ip_address || req.ip,
        user_agent || req.headers['user-agent'],
        device_type,
        browser,
        os,
        country,
        city
      ]
    );

    res.json({ sessionId: result.insertId });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Actualizar actividad de sesión
router.post('/session/activity', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.body;

    await query(
      'UPDATE user_sessions SET last_activity = NOW() WHERE id = ? AND user_id = ?',
      [sessionId, req.user.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Finalizar sesión
router.post('/session/end', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.body;

    await query(
      `UPDATE user_sessions 
       SET ended_at = NOW(), 
           is_active = FALSE,
           duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW())
       WHERE id = ? AND user_id = ?`,
      [sessionId, req.user.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Registrar click/evento
router.post('/click', authenticateToken, async (req, res) => {
  try {
    const { sessionId, eventType, pageUrl, elementId, elementClass, elementText, clickX, clickY, metadata } = req.body;

    await query(
      `INSERT INTO user_clicks 
       (session_id, user_id, event_type, page_url, element_id, element_class, element_text, click_x, click_y, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        req.user.id,
        eventType,
        pageUrl,
        elementId,
        elementClass,
        elementText,
        clickX,
        clickY,
        metadata ? JSON.stringify(metadata) : null
      ]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Track click error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Registrar vista de página
router.post('/pageview', authenticateToken, async (req, res) => {
  try {
    const { sessionId, pageUrl, pageTitle, referrer } = req.body;

    const result = await query(
      `INSERT INTO page_views 
       (session_id, user_id, page_url, page_title, referrer) 
       VALUES (?, ?, ?, ?, ?)`,
      [sessionId, req.user.id, pageUrl, pageTitle, referrer]
    );

    res.json({ pageViewId: result.insertId });
  } catch (error) {
    console.error('Track pageview error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Actualizar tiempo en página
router.post('/pageview/update', authenticateToken, async (req, res) => {
  try {
    const { pageViewId, timeOnPage, scrollDepth } = req.body;

    await query(
      `UPDATE page_views 
       SET time_on_page = ?, scroll_depth = ?, left_at = NOW() 
       WHERE id = ? AND user_id = ?`,
      [timeOnPage, scrollDepth, pageViewId, req.user.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update pageview error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Obtener sesiones de un usuario
router.get('/sessions/:userId', authenticateToken, async (req, res) => {
  try {
    const sessions = await query(
      `SELECT * FROM user_sessions 
       WHERE user_id = ? 
       ORDER BY started_at DESC 
       LIMIT 100`,
      [req.params.userId]
    );

    res.json(sessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Obtener clicks de una sesión
router.get('/session/:sessionId/clicks', authenticateToken, async (req, res) => {
  try {
    const clicks = await query(
      `SELECT * FROM user_clicks 
       WHERE session_id = ? 
       ORDER BY timestamp ASC`,
      [req.params.sessionId]
    );

    res.json(clicks);
  } catch (error) {
    console.error('Get clicks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Obtener páginas visitadas de una sesión
router.get('/session/:sessionId/pages', authenticateToken, async (req, res) => {
  try {
    const pages = await query(
      `SELECT * FROM page_views 
       WHERE session_id = ? 
       ORDER BY viewed_at ASC`,
      [req.params.sessionId]
    );

    res.json(pages);
  } catch (error) {
    console.error('Get pages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Analytics: Resumen de actividad
router.get('/analytics/summary', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const [totalSessions] = await query(
      `SELECT COUNT(*) as total FROM user_sessions 
       WHERE started_at >= ? AND started_at <= ?`,
      [startDate || '2024-01-01', endDate || new Date()]
    );

    const [avgDuration] = await query(
      `SELECT AVG(duration_seconds) as avg_duration FROM user_sessions 
       WHERE ended_at IS NOT NULL AND started_at >= ? AND started_at <= ?`,
      [startDate || '2024-01-01', endDate || new Date()]
    );

    const [totalClicks] = await query(
      `SELECT COUNT(*) as total FROM user_clicks 
       WHERE timestamp >= ? AND timestamp <= ?`,
      [startDate || '2024-01-01', endDate || new Date()]
    );

    const topPages = await query(
      `SELECT page_url, COUNT(*) as views, AVG(time_on_page) as avg_time 
       FROM page_views 
       WHERE viewed_at >= ? AND viewed_at <= ?
       GROUP BY page_url 
       ORDER BY views DESC 
       LIMIT 10`,
      [startDate || '2024-01-01', endDate || new Date()]
    );

    const activeUsers = await query(
      `SELECT u.username, u.full_name, COUNT(s.id) as sessions, 
              SUM(s.duration_seconds) as total_time
       FROM users u
       LEFT JOIN user_sessions s ON u.id = s.user_id
       WHERE s.started_at >= ? AND s.started_at <= ?
       GROUP BY u.id
       ORDER BY sessions DESC`,
      [startDate || '2024-01-01', endDate || new Date()]
    );

    res.json({
      totalSessions: totalSessions.total,
      avgDuration: Math.round(avgDuration.avg_duration || 0),
      totalClicks: totalClicks.total,
      topPages,
      activeUsers
    });
  } catch (error) {
    console.error('Get analytics summary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
