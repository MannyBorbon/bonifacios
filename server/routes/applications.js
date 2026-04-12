import express from 'express';
import PDFDocument from 'pdfkit';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/submit', async (req, res) => {
  try {
    const {
      name,
      studies,
      email,
      phone,
      currentJob,
      position,
      experience,
      address,
      noStudies,
      noEmail,
      noCurrentJob
    } = req.body;

    const result = await query(
      `INSERT INTO job_applications 
      (name, studies, email, phone, current_job, position, experience, address, 
       no_studies, no_email, no_current_job) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        noStudies ? null : studies,
        noEmail ? null : email,
        phone,
        noCurrentJob ? null : currentJob,
        position,
        experience,
        address,
        noStudies,
        noEmail,
        noCurrentJob
      ]
    );

    await query(
      'INSERT INTO analytics (metric_type, metric_value, date) VALUES (?, ?, CURDATE()) ON DUPLICATE KEY UPDATE metric_value = metric_value + 1',
      ['job_applications', 1]
    );

    res.status(201).json({
      message: 'Application submitted successfully',
      applicationId: result.insertId
    });
  } catch (error) {
    console.error('Submit application error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/list', authenticateToken, async (req, res) => {
  try {
    const { status, position, limit = 50, offset = 0 } = req.query;
    
    let sql = `
      SELECT a.*, u.full_name as reviewed_by_name 
      FROM job_applications a 
      LEFT JOIN users u ON a.reviewed_by = u.id 
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND a.status = ?';
      params.push(status);
    }

    if (position) {
      sql += ' AND a.position = ?';
      params.push(position);
    }

    sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const applications = await query(sql, params);

    const countSql = 'SELECT COUNT(*) as total FROM job_applications WHERE 1=1' + 
      (status ? ' AND status = ?' : '') + 
      (position ? ' AND position = ?' : '');
    const countParams = [];
    if (status) countParams.push(status);
    if (position) countParams.push(position);
    
    const [{ total }] = await query(countSql, countParams);

    res.json({
      applications,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('List applications error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const applications = await query(
      `SELECT a.*, u.full_name as reviewed_by_name 
       FROM job_applications a 
       LEFT JOIN users u ON a.reviewed_by = u.id 
       WHERE a.id = ?`,
      [req.params.id]
    );

    if (applications.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(applications[0]);
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status, notes } = req.body;

    await query(
      `UPDATE job_applications 
       SET status = ?, notes = ?, reviewed_by = ?, reviewed_at = NOW() 
       WHERE id = ?`,
      [status, notes, req.user.id, req.params.id]
    );

    await query(
      'INSERT INTO activity_log (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'update_application_status', 'job_application', req.params.id, `Changed status to ${status}`]
    );

    res.json({ message: 'Application updated successfully' });
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/pdf', authenticateToken, async (req, res) => {
  try {
    const applications = await query(
      'SELECT * FROM job_applications WHERE id = ?',
      [req.params.id]
    );

    if (applications.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const app = applications[0];

    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=application-${app.id}.pdf`);
    
    doc.pipe(res);

    doc.fontSize(20).text("Bonifacio's Restaurant", { align: 'center' });
    doc.fontSize(16).text('Solicitud de Empleo', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Solicitud #${app.id}`, { align: 'right' });
    doc.text(`Fecha: ${new Date(app.created_at).toLocaleDateString('es-MX')}`, { align: 'right' });
    doc.moveDown(2);

    doc.fontSize(14).text('Información Personal', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Nombre: ${app.name}`);
    doc.text(`Estudios: ${app.no_studies ? 'No tiene estudios' : app.studies}`);
    doc.text(`Correo: ${app.no_email ? 'No tiene correo' : app.email}`);
    doc.text(`Teléfono: ${app.phone}`);
    doc.text(`Dirección: ${app.address}`);
    doc.moveDown();

    doc.fontSize(14).text('Información Laboral', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Trabajo Actual: ${app.no_current_job ? 'No tiene trabajo actual' : app.current_job}`);
    doc.text(`Puesto que busca: ${app.position}`);
    doc.text(`Años de experiencia: ${app.experience}`);
    doc.moveDown();

    doc.fontSize(14).text('Estado de la Solicitud', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Estado: ${app.status}`);
    if (app.notes) {
      doc.text(`Notas: ${app.notes}`);
    }

    doc.end();

    await query(
      'INSERT INTO activity_log (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'download_application_pdf', 'job_application', app.id, `Downloaded PDF for application ${app.id}`]
    );

  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const [stats] = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'reviewing' THEN 1 ELSE 0 END) as reviewing,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM job_applications
    `);

    const positions = await query(`
      SELECT position, COUNT(*) as count 
      FROM job_applications 
      GROUP BY position 
      ORDER BY count DESC
    `);

    res.json({ stats, positions });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
