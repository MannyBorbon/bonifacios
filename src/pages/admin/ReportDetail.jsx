import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import 'react-quill-new/dist/quill.snow.css';
const ReactQuill = lazy(() => import('react-quill-new'));

function ReportDetail() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [editedName, setEditedName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'administrador';

  useEffect(() => {
    loadReport();
  }, [reportId]);

  const loadReport = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/employees/get-report-detail.php?report_id=${reportId}`, {
        credentials: 'include'
      });
      const result = await response.json();
      if (result.success) {
        setReport(result.report);
        setEditedContent(result.report.content || '');
        setEditedName(result.report.report_name);
      } else {
        alert(result.error || 'Error al cargar reporte');
        navigate('/admin/employees');
      }
    } catch (error) {
      console.error('Error loading report:', error);
      alert('Error al cargar reporte');
      navigate('/admin/employees');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/employees/update-report.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          report_id: parseInt(reportId), 
          content: editedContent, 
          report_name: editedName 
        })
      });
      const result = await response.json();
      if (result.success) {
        alert('Reporte actualizado');
        setIsEditing(false);
        loadReport();
      } else {
        alert(result.error || 'Error al actualizar');
      }
    } catch (error) {
      console.error('Error updating report:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddPhoto = async (file) => {
    const formData = new FormData();
    formData.append('report_id', reportId);
    formData.append('photo', file);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/employees/add-report-photo.php`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      const result = await response.json();
      if (result.success) {
        alert('Foto agregada');
        loadReport();
      } else {
        alert(result.error || 'Error al agregar foto');
      }
    } catch (error) {
      console.error('Error adding photo:', error);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('¿Eliminar esta foto?')) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/employees/delete-report-photo.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_id: photoId })
      });
      const result = await response.json();
      if (result.success) {
        alert('Foto eliminada');
        loadReport();
      } else {
        alert(result.error || 'Error al eliminar foto');
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f14] flex items-center justify-center">
        <div className="text-slate-400">Cargando reporte...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#0f0f14] flex items-center justify-center">
        <div className="text-slate-400">Reporte no encontrado</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f14] via-[#1a1a1f] to-[#0a0a0f] p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <button
            onClick={() => navigate('/admin/employees')}
            className="flex items-center gap-2 text-cyan-400/70 hover:text-cyan-400 transition-colors text-sm"
          >
            ← Regresar a Empleados
          </button>
          {isAdmin && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-xs sm:text-sm text-cyan-400 transition-all hover:bg-cyan-500/20 w-full sm:w-auto"
            >
              {isEditing ? 'Cancelar Edición' : 'Editar Reporte'}
            </button>
          )}
        </div>

        {/* Report Content */}
        <div className="rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-4 sm:p-6 lg:p-8 shadow-lg shadow-cyan-500/5">
          {/* Report Info */}
          <div className="mb-8 pb-6 border-b border-cyan-500/10">
            {isEditing ? (
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="text-2xl font-light text-white bg-transparent border-b border-cyan-500/30 focus:border-cyan-400/60 outline-none w-full mb-2"
              />
            ) : (
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-light text-white mb-2">{report.report_name}</h1>
            )}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-400">
              <span>{report.report_type === 'file' ? '📄' : '📝'} Reporte</span>
              <span>Creado: {new Date(report.created_at).toLocaleDateString('es-MX', { timeZone: 'America/Hermosillo', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span>Por: {report.created_by_name || 'Admin'}</span>
            </div>
          </div>

          {/* Media Content */}
          {(report.file_path || report.photo_path || (report.additional_photos && report.additional_photos.length > 0)) && (
            <div className="mb-6 sm:mb-8">
              {report.photo_path && (
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg font-medium text-cyan-400/70 mb-2 sm:mb-3">Foto Principal del Reporte</h3>
                  <img
                    src={report.photo_path}
                    alt="Reporte"
                    className="w-full max-w-full sm:max-w-2xl mx-auto rounded-lg border border-cyan-500/15"
                  />
                </div>
              )}
              
              {/* Additional Photos Gallery */}
              {report.additional_photos && report.additional_photos.length > 0 && (
                <div className="mb-4 sm:mb-6">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <h3 className="text-base sm:text-lg font-medium text-cyan-400/70">Galería de Fotos ({report.additional_photos.length})</h3>
                    {isAdmin && (
                      <button
                        onClick={() => setShowPhotoGallery(true)}
                        className="rounded-lg border border-cyan-500/20 bg-cyan-500/8 px-3 py-1.5 text-xs text-cyan-400 transition-all hover:bg-cyan-500/15"
                      >
                        Gestionar Fotos
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {report.additional_photos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photo}
                          alt={`Foto ${index + 1}`}
                          className="w-full aspect-square object-cover rounded-lg border border-cyan-500/10 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => window.open(photo, '_blank')}
                        />
                        {isAdmin && (
                          <button
                            onClick={() => handleDeletePhoto(photo.id || index)}
                            className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Eliminar foto"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {report.file_path && (
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg font-medium text-cyan-400/70 mb-2 sm:mb-3">Archivo Adjunto</h3>
                  <a
                    href={report.file_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/8 px-4 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm text-cyan-400 hover:bg-cyan-500/15 transition-colors w-full sm:w-auto justify-center"
                  >
                    📄 Descargar Archivo Original
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Text Content */}
          {report.content && (
            <div className="mb-6 sm:mb-8">
              <h3 className="text-base sm:text-lg font-medium text-cyan-400/70 mb-3 sm:mb-4">Contenido</h3>
              {isEditing ? (
                <div className="quill-dark">
                  <Suspense fallback={<div className="h-60 sm:h-80 bg-[#040c1a]/60 rounded animate-pulse" />}>
                    <ReactQuill
                      theme="snow"
                      value={editedContent}
                      onChange={setEditedContent}
                      style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '0.5rem', minHeight: '200px', maxHeight: '400px' }}
                    />
                  </Suspense>
                </div>
              ) : (
                <div
                  className="prose prose-invert prose-sm sm:prose-lg max-w-none p-3 sm:p-4 lg:p-6 rounded-lg bg-[#030b18]/50 border border-cyan-500/10 text-slate-300"
                  dangerouslySetInnerHTML={{ __html: report.content }}
                />
              )}
            </div>
          )}

          {/* Save Button */}
          {isEditing && (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-4 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm text-cyan-400 transition-all hover:bg-cyan-500/20 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditedContent(report.content || '');
                  setEditedName(report.report_name);
                }}
                className="flex-1 rounded-lg border border-slate-700/30 bg-[#040c1a]/60 px-4 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm text-slate-500 transition-all hover:text-slate-300"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Photo Gallery Management Modal */}
      {showPhotoGallery && (
        <div className="fixed inset-0 bg-[#030712]/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#040c1a] to-[#060f20] border border-cyan-500/20 rounded-xl p-4 sm:p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-light text-white">Gestionar Fotos</h3>
              <button onClick={() => setShowPhotoGallery(false)} className="text-slate-500 hover:text-slate-200 text-sm">✕</button>
            </div>

            {/* Add New Photo */}
            <div className="mb-6">
              <label className="block text-sm text-cyan-500/50 mb-2">Agregar Nueva Foto</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) handleAddPhoto(file);
                }}
                className="w-full rounded-lg border border-cyan-500/15 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/40 focus:outline-none file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-cyan-500/15 file:text-cyan-400 file:text-xs"
              />
            </div>

            {/* Existing Photos Grid */}
            {report.additional_photos && report.additional_photos.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-cyan-500/50 mb-3">Fotos Existentes ({report.additional_photos.length})</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto p-2">
                  {report.additional_photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo}
                        alt={`Foto ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg border border-cyan-500/10 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open(photo, '_blank')}
                      />
                      <button
                        onClick={() => handleDeletePhoto(photo.id || index)}
                        className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Eliminar foto"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPhotoGallery(false)}
                className="flex-1 rounded-lg border border-slate-700/30 bg-[#040c1a]/60 px-4 py-2 text-sm text-slate-500 transition-all hover:text-slate-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportDetail;
