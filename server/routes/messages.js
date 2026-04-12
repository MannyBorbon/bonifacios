import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/inbox', authenticateToken, async (req, res) => {
  try {
    const messages = await query(
      `SELECT m.*, 
              u.full_name as sender_name, 
              u.avatar as sender_avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.recipient_id = ?
       ORDER BY m.created_at DESC`,
      [req.user.id]
    );

    res.json(messages);
  } catch (error) {
    console.error('Get inbox error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/sent', authenticateToken, async (req, res) => {
  try {
    const messages = await query(
      `SELECT m.*, 
              u.full_name as recipient_name, 
              u.avatar as recipient_avatar
       FROM messages m
       JOIN users u ON m.recipient_id = u.id
       WHERE m.sender_id = ?
       ORDER BY m.created_at DESC`,
      [req.user.id]
    );

    res.json(messages);
  } catch (error) {
    console.error('Get sent messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const [result] = await query(
      'SELECT COUNT(*) as count FROM messages WHERE recipient_id = ? AND is_read = FALSE',
      [req.user.id]
    );

    res.json({ count: result.count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const messages = await query(
      `SELECT m.*, 
              sender.full_name as sender_name, 
              sender.avatar as sender_avatar,
              recipient.full_name as recipient_name,
              recipient.avatar as recipient_avatar
       FROM messages m
       JOIN users sender ON m.sender_id = sender.id
       JOIN users recipient ON m.recipient_id = recipient.id
       WHERE m.id = ? AND (m.sender_id = ? OR m.recipient_id = ?)`,
      [req.params.id, req.user.id, req.user.id]
    );

    if (messages.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = messages[0];

    if (message.recipient_id === req.user.id && !message.is_read) {
      await query(
        'UPDATE messages SET is_read = TRUE, read_at = NOW() WHERE id = ?',
        [req.params.id]
      );
    }

    res.json(message);
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { recipient_id, subject, message, parent_message_id } = req.body;

    if (!recipient_id || !subject || !message) {
      return res.status(400).json({ error: 'Recipient, subject, and message are required' });
    }

    const result = await query(
      `INSERT INTO messages (sender_id, recipient_id, subject, message, parent_message_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, recipient_id, subject, message, parent_message_id || null]
    );

    await query(
      'INSERT INTO activity_log (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'send_message', 'message', result.insertId, `Sent message to user ${recipient_id}`]
    );

    res.status(201).json({
      message: 'Message sent successfully',
      messageId: result.insertId
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const messages = await query(
      'SELECT * FROM messages WHERE id = ? AND (sender_id = ? OR recipient_id = ?)',
      [req.params.id, req.user.id, req.user.id]
    );

    if (messages.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    await query('DELETE FROM messages WHERE id = ?', [req.params.id]);

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/users/list', authenticateToken, async (req, res) => {
  try {
    const users = await query(
      'SELECT id, username, full_name, avatar, role FROM users WHERE id != ? AND is_active = TRUE ORDER BY full_name',
      [req.user.id]
    );

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
