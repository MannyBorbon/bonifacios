import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const pageViews = await query(
      `SELECT date, metric_value as value 
       FROM analytics 
       WHERE metric_type = 'page_views' 
       AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY date ASC`,
      [days]
    );

    const applications = await query(
      `SELECT date, metric_value as value 
       FROM analytics 
       WHERE metric_type = 'job_applications' 
       AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY date ASC`,
      [days]
    );

    const [totalApps] = await query(
      'SELECT COUNT(*) as total FROM job_applications'
    );

    const [pendingApps] = await query(
      'SELECT COUNT(*) as total FROM job_applications WHERE status = "pending"'
    );

    const [totalUsers] = await query(
      'SELECT COUNT(*) as total FROM users WHERE is_active = TRUE'
    );

    const [unreadMessages] = await query(
      'SELECT COUNT(*) as total FROM messages WHERE recipient_id = ? AND is_read = FALSE',
      [req.user.id]
    );

    const recentActivity = await query(
      `SELECT a.*, u.full_name as user_name 
       FROM activity_log a 
       LEFT JOIN users u ON a.user_id = u.id 
       ORDER BY a.created_at DESC 
       LIMIT 10`
    );

    const topPositions = await query(
      `SELECT position, COUNT(*) as count 
       FROM job_applications 
       GROUP BY position 
       ORDER BY count DESC 
       LIMIT 5`
    );

    res.json({
      charts: {
        pageViews,
        applications
      },
      stats: {
        totalApplications: totalApps.total,
        pendingApplications: pendingApps.total,
        totalUsers: totalUsers.total,
        unreadMessages: unreadMessages.total
      },
      recentActivity,
      topPositions
    });
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/track', async (req, res) => {
  try {
    const { metric_type, metric_value = 1, metadata } = req.body;

    await query(
      `INSERT INTO analytics (metric_type, metric_value, date, metadata) 
       VALUES (?, ?, CURDATE(), ?) 
       ON DUPLICATE KEY UPDATE metric_value = metric_value + ?`,
      [metric_type, metric_value, metadata ? JSON.stringify(metadata) : null, metric_value]
    );

    res.json({ message: 'Metric tracked successfully' });
  } catch (error) {
    console.error('Track metric error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
