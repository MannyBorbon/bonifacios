import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { quotesAPI } from '../../services/api'

const TZ = 'America/Hermosillo'
const fmtDate = (d) => {
  if (!d) return ''
  const date = new Date(String(d).replace(' ', 'T'))
  return date.toLocaleDateString('es-MX', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' })
}

const EMPTY_OS = {
  folio: '', event_manager: 'Chef Manuel Borbón', guaranteed_guests: '',
  setup_access: '', event_start: '', food_service_start: '', food_service_end: '',
  event_end: '', breakdown: '',
  room_name: '', setup_type: '', tables: '', chairs: '',
  support_tables: '', linen_specs: '', layout_notes: '',
  expedition_requirements: '',
  menu_details: '', dietary_notes: '', beverage_service: '',
  liquor_list: '', kitchen_notes: '',
  av_sound: '', av_visual: '', lighting: '', connectivity: '',
  external_vendors: '', waitstaff_count: '', bartender_count: '', additional_staff: '',
  price_breakdown: '', service_charge_pct: '16', payment_method: '',
  deposit_amount: '', balance_due: '',
  client_signature_name: '', venue_signature_name: 'Chef Manuel Borbón',
}

function BEOField({ label, children, span2 = false }) {
  return (
    <div className={`${span2 ? 'sm:col-span-2' : ''}`}>
      <label className="block text-[9px] uppercase tracking-widest text-cyan-500/50 mb-1">{label}</label>
      {children}
    </div>
  )
}

function BEOInput({ value, onChange, placeholder, type = 'text', rows }) {
  const cls = 'w-full rounded-md border border-cyan-500/15 bg-[#030b18]/60 px-3 py-1.5 text-sm text-slate-200 placeholder-slate-700 focus:border-cyan-500/40 focus:outline-none transition-colors'
  if (rows) return <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} className={`${cls} resize-none`} />
  return <input type={type} value={value} onChange={onChange} placeholder={placeholder} className={cls} />
}

function SectionHeader({ number, title }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
        <span className="text-[10px] text-cyan-400 font-medium">{number}</span>
      </div>
      <h3 className="text-xs uppercase tracking-[0.2em] text-cyan-400/80 font-medium">{title}</h3>
      <div className="flex-1 h-px bg-cyan-500/10" />
    </div>
  )
}

// ─── Print-optimized BEO Document ───────────────────────────────────────────
function PrintableBEO({ quote, beo }) {
  const rows = (val) => val ? val.split('\n').map((l, i) => <div key={i}>{l || <>&nbsp;</>}</div>) : <span style={{ color: '#aaa' }}>—</span>

  return (
    <div id="beo-print-area" style={{ fontFamily: 'Arial, sans-serif', color: '#111', background: '#fff', padding: '0', maxWidth: '210mm', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ background: '#1a1a1f', color: '#D4AF37', padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 'bold', letterSpacing: 2 }}>BONIFACIO&apos;S RESTAURANT</div>
          <div style={{ fontSize: 10, color: '#F4E4C1', marginTop: 2, letterSpacing: 1 }}>SAN CARLOS, SONORA &nbsp;·&nbsp; ORDEN DE SERVICIO</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#F4E4C1' }}>Folio: <strong style={{ color: '#D4AF37' }}>{beo.folio || `OS-${quote.id}`}</strong></div>
          <div style={{ fontSize: 10, color: '#F4E4C1', marginTop: 4 }}>Solicitud: #{quote.id}</div>
          <div style={{ fontSize: 10, color: '#F4E4C1' }}>info@bonifaciossancarlos.com</div>
          <div style={{ fontSize: 10, color: '#F4E4C1' }}>Tel: 622 173 8884</div>
        </div>
      </div>

      <div style={{ padding: '20px 30px' }}>
        {/* Section 1 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ background: '#f0f0f0', padding: '4px 10px', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, borderLeft: '3px solid #D4AF37' }}>1. Información General</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <tbody>
              <tr>
                <td style={{ width: '25%', color: '#666', paddingBottom: 4 }}>Nombre del evento:</td>
                <td style={{ width: '25%', borderBottom: '1px solid #ddd', paddingBottom: 4 }}>{quote.event_type} — {quote.name}</td>
                <td style={{ width: '25%', color: '#666', paddingLeft: 16, paddingBottom: 4 }}>Fecha del evento:</td>
                <td style={{ width: '25%', borderBottom: '1px solid #ddd', paddingBottom: 4 }}>{fmtDate(quote.event_date)}</td>
              </tr>
              <tr>
                <td style={{ color: '#666', paddingBottom: 4, paddingTop: 6 }}>Cliente:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingBottom: 4, paddingTop: 6 }}>{quote.name}</td>
                <td style={{ color: '#666', paddingLeft: 16, paddingBottom: 4, paddingTop: 6 }}>Teléfono:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingBottom: 4, paddingTop: 6 }}>{quote.phone}</td>
              </tr>
              <tr>
                <td style={{ color: '#666', paddingBottom: 4, paddingTop: 6 }}>Correo cliente:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingBottom: 4, paddingTop: 6 }}>{quote.email}</td>
                <td style={{ color: '#666', paddingLeft: 16, paddingBottom: 4, paddingTop: 6 }}>Gerente a cargo:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingBottom: 4, paddingTop: 6 }}>{beo.event_manager}</td>
              </tr>
              <tr>
                <td style={{ color: '#666', paddingTop: 6 }}>N° de Folio:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingTop: 6 }}>{beo.folio || `OS-${quote.id}`}</td>
                <td style={{ color: '#666', paddingLeft: 16, paddingTop: 6 }}>Área asignada:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingTop: 6 }}>{quote.location}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 2 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ background: '#f0f0f0', padding: '4px 10px', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, borderLeft: '3px solid #D4AF37' }}>2. Asistencia y Horarios</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <tbody>
              <tr>
                <td style={{ width: '25%', color: '#666', paddingBottom: 4 }}>Personas esperadas:</td>
                <td style={{ width: '25%', borderBottom: '1px solid #ddd', paddingBottom: 4 }}>{quote.guests}</td>
                <td style={{ width: '25%', color: '#666', paddingLeft: 16, paddingBottom: 4 }}>Personas garantizadas:</td>
                <td style={{ width: '25%', borderBottom: '1px solid #ddd', paddingBottom: 4 }}>{beo.guaranteed_guests}</td>
              </tr>
              <tr>
                <td style={{ color: '#666', paddingBottom: 4, paddingTop: 6 }}>Acceso montaje:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingBottom: 4, paddingTop: 6 }}>{beo.setup_access}</td>
                <td style={{ color: '#666', paddingLeft: 16, paddingBottom: 4, paddingTop: 6 }}>Inicio evento:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingBottom: 4, paddingTop: 6 }}>{beo.event_start}</td>
              </tr>
              <tr>
                <td style={{ color: '#666', paddingBottom: 4, paddingTop: 6 }}>Inicio A&B:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingBottom: 4, paddingTop: 6 }}>{beo.food_service_start}</td>
                <td style={{ color: '#666', paddingLeft: 16, paddingBottom: 4, paddingTop: 6 }}>Fin A&B:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingBottom: 4, paddingTop: 6 }}>{beo.food_service_end}</td>
              </tr>
              <tr>
                <td style={{ color: '#666', paddingTop: 6 }}>Fin evento:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingTop: 6 }}>{beo.event_end}</td>
                <td style={{ color: '#666', paddingLeft: 16, paddingTop: 6 }}>Desmontaje:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingTop: 6 }}>{beo.breakdown}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 3 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ background: '#f0f0f0', padding: '4px 10px', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, borderLeft: '3px solid #D4AF37' }}>3. Espacio y Montaje</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <tbody>
              <tr>
                <td style={{ width: '25%', color: '#666', paddingBottom: 4 }}>Salón / Área:</td>
                <td style={{ width: '25%', borderBottom: '1px solid #ddd', paddingBottom: 4 }}>{beo.room_name || quote.location}</td>
                <td style={{ width: '25%', color: '#666', paddingLeft: 16, paddingBottom: 4 }}>Tipo de montaje:</td>
                <td style={{ width: '25%', borderBottom: '1px solid #ddd', paddingBottom: 4 }}>{beo.setup_type}</td>
              </tr>
              <tr>
                <td style={{ color: '#666', paddingBottom: 4, paddingTop: 6 }}>Mesas:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingBottom: 4, paddingTop: 6 }}>{beo.tables}</td>
                <td style={{ color: '#666', paddingLeft: 16, paddingBottom: 4, paddingTop: 6 }}>Sillas:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingBottom: 4, paddingTop: 6 }}>{beo.chairs}</td>
              </tr>
              <tr>
                <td style={{ color: '#666', paddingBottom: 4, paddingTop: 6 }}>Mesas de apoyo:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingBottom: 4, paddingTop: 6 }} colSpan={3}>{beo.support_tables}</td>
              </tr>
              <tr>
                <td style={{ color: '#666', paddingTop: 6 }}>Mantelería:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingTop: 6 }} colSpan={3}>{beo.linen_specs}</td>
              </tr>
              {beo.layout_notes && (
                <tr>
                  <td style={{ color: '#666', paddingTop: 6, verticalAlign: 'top' }}>Diagrama / notas:</td>
                  <td style={{ borderBottom: '1px solid #ddd', paddingTop: 6 }} colSpan={3}>{rows(beo.layout_notes)}</td>
                </tr>
              )}
              {beo.expedition_requirements && (
                <tr>
                  <td style={{ color: '#666', paddingTop: 6, verticalAlign: 'top' }}>Requerimientos:</td>
                  <td style={{ borderBottom: '1px solid #ddd', paddingTop: 6 }} colSpan={3}>{rows(beo.expedition_requirements)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Section 4 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ background: '#f0f0f0', padding: '4px 10px', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, borderLeft: '3px solid #D4AF37' }}>4. Alimentos y Bebidas</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <tbody>
              <tr>
                <td style={{ color: '#666', paddingBottom: 4, verticalAlign: 'top', width: '25%' }}>Menú:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingBottom: 6 }} colSpan={3}>{rows(beo.menu_details)}</td>
              </tr>
              <tr>
                <td style={{ color: '#666', paddingBottom: 4, paddingTop: 6, verticalAlign: 'top' }}>Restricciones dieta:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingBottom: 4, paddingTop: 6 }} colSpan={3}>{rows(beo.dietary_notes)}</td>
              </tr>
              <tr>
                <td style={{ color: '#666', paddingBottom: 4, paddingTop: 6 }}>Servicio bebidas:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingBottom: 4, paddingTop: 6 }}>{beo.beverage_service}</td>
                <td style={{ color: '#666', paddingLeft: 16, paddingBottom: 4, paddingTop: 6 }}>Licores/vinos:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingBottom: 4, paddingTop: 6 }}>{beo.liquor_list}</td>
              </tr>
              {beo.kitchen_notes && (
                <tr>
                  <td style={{ color: '#666', paddingTop: 6, verticalAlign: 'top' }}>Notas cocina:</td>
                  <td style={{ borderBottom: '1px solid #ddd', paddingTop: 6 }} colSpan={3}>{rows(beo.kitchen_notes)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Section 5 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ background: '#f0f0f0', padding: '4px 10px', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, borderLeft: '3px solid #D4AF37' }}>5. Equipo Audiovisual y Tecnología</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <tbody>
              <tr>
                <td style={{ width: '25%', color: '#666', paddingBottom: 4 }}>Sonido:</td>
                <td style={{ width: '25%', borderBottom: '1px solid #ddd', paddingBottom: 4 }}>{beo.av_sound || '—'}</td>
                <td style={{ width: '25%', color: '#666', paddingLeft: 16, paddingBottom: 4 }}>Visual (pantallas):</td>
                <td style={{ width: '25%', borderBottom: '1px solid #ddd', paddingBottom: 4 }}>{beo.av_visual || '—'}</td>
              </tr>
              <tr>
                <td style={{ color: '#666', paddingTop: 6 }}>Iluminación:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingTop: 6 }}>{beo.lighting || '—'}</td>
                <td style={{ color: '#666', paddingLeft: 16, paddingTop: 6 }}>Conectividad:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingTop: 6 }}>{beo.connectivity || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 6 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ background: '#f0f0f0', padding: '4px 10px', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, borderLeft: '3px solid #D4AF37' }}>6. Proveedores y Personal</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <tbody>
              <tr>
                <td style={{ width: '25%', color: '#666', paddingBottom: 4 }}>Meseros:</td>
                <td style={{ width: '25%', borderBottom: '1px solid #ddd', paddingBottom: 4 }}>{beo.waitstaff_count || '—'}</td>
                <td style={{ width: '25%', color: '#666', paddingLeft: 16, paddingBottom: 4 }}>Bartenders:</td>
                <td style={{ width: '25%', borderBottom: '1px solid #ddd', paddingBottom: 4 }}>{beo.bartender_count || '—'}</td>
              </tr>
              <tr>
                <td style={{ color: '#666', paddingTop: 6 }}>Personal adicional:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingTop: 6 }} colSpan={3}>{beo.additional_staff || '—'}</td>
              </tr>
              {beo.external_vendors && (
                <tr>
                  <td style={{ color: '#666', paddingTop: 6, verticalAlign: 'top' }}>Proveedores externos:</td>
                  <td style={{ borderBottom: '1px solid #ddd', paddingTop: 6 }} colSpan={3}>{rows(beo.external_vendors)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Section 7 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ background: '#f0f0f0', padding: '4px 10px', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, borderLeft: '3px solid #D4AF37' }}>7. Costos, Facturación y Firmas</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 12 }}>
            <tbody>
              <tr>
                <td style={{ width: '25%', color: '#666', paddingBottom: 4, verticalAlign: 'top' }}>Desglose de precios:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingBottom: 6 }} colSpan={3}>{rows(beo.price_breakdown)}</td>
              </tr>
              <tr>
                <td style={{ color: '#666', paddingTop: 6 }}>Cargo por servicio:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingTop: 6 }}>{beo.service_charge_pct}%</td>
                <td style={{ color: '#666', paddingLeft: 16, paddingTop: 6 }}>Forma de pago:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingTop: 6 }}>{beo.payment_method}</td>
              </tr>
              <tr>
                <td style={{ color: '#666', paddingTop: 6 }}>Anticipo:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingTop: 6 }}>{beo.deposit_amount}</td>
                <td style={{ color: '#666', paddingLeft: 16, paddingTop: 6 }}>Saldo pendiente:</td>
                <td style={{ borderBottom: '1px solid #ddd', paddingTop: 6 }}>{beo.balance_due}</td>
              </tr>
            </tbody>
          </table>

          {/* Signatures */}
          <div style={{ display: 'flex', gap: 40, marginTop: 32 }}>
            <div style={{ flex: 1 }}>
              <div style={{ borderTop: '2px solid #333', paddingTop: 6, marginTop: 40 }}>
                <div style={{ fontSize: 11, fontWeight: 'bold' }}>{beo.client_signature_name || quote.name}</div>
                <div style={{ fontSize: 10, color: '#666' }}>Firma del Cliente</div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ borderTop: '2px solid #333', paddingTop: 6, marginTop: 40 }}>
                <div style={{ fontSize: 11, fontWeight: 'bold' }}>{beo.venue_signature_name}</div>
                <div style={{ fontSize: 10, color: '#666' }}>Representante Bonifacio&apos;s Restaurant</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#1a1a1f', color: '#F4E4C1', padding: '10px 30px', fontSize: 10, display: 'flex', justifyContent: 'space-between' }}>
        <span>Bonifacio&apos;s Restaurant · San Carlos, Sonora</span>
        <span>info@bonifaciossancarlos.com · 622 173 8884</span>
        <span>bonifaciossancarlos.com</span>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function QuoteBEO() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quote, setQuote] = useState(null)
  const [beo, setBeo] = useState(EMPTY_OS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [qRes, bRes, rRes, cRes] = await Promise.all([
        quotesAPI.getQuote(id),
        quotesAPI.getBEO(id),
        quotesAPI.getRequirements(id),
        quotesAPI.getCotizaciones(id),
      ])
      const q = qRes.data.quote
      const reqs = rRes.data.requirements || []
      const cotizaciones = cRes.data.cotizaciones || []
      setQuote(q)

      if (bRes.data.beo) {
        // Already saved — load saved OS but patch any blank fields from cotización
        const saved = bRes.data.beo
        setBeo({ ...EMPTY_OS, ...(saved.beo_data || {}), folio: saved.folio || `OS-${id}` })
      } else {
        // First open — auto-fill from cotización (final first, else latest)
        const cot = cotizaciones.find(c => c.is_final) || cotizaciones[0] || null
        const c = cot?.data || {}
        const reqText = reqs.length > 0 ? reqs.map(r => `• ${r.item}`).join('\n') : ''

        // Build extras + anticipos text for price breakdown
        const extrasText = (c.extras || []).length > 0
          ? '\nExtras:\n' + c.extras.map(e => `  • ${e.concepto}: $${parseFloat(e.monto || 0).toFixed(2)}`).join('\n')
          : ''
        const anticiposText = (c.anticipos || []).length > 0
          ? '\nAnticipos recibidos:\n' + c.anticipos.map(a => `  • ${a.fecha}: $${parseFloat(a.monto || 0).toFixed(2)}`).join('\n')
          : ''
        const priceText = [
          c.subtotal ? `Subtotal por persona: $${c.subtotal}` : '',
          c.servicio ? `(+) Servicio: $${c.servicio}` : '',
          c.total_persona ? `Total por persona: $${c.total_persona}` : '',
          c.invitados ? `(×) ${c.invitados} invitados = $${c.total_general}` : '',
          extrasText,
          c.total_con_extras ? `\nTotal con extras: $${c.total_con_extras}` : '',
          anticiposText,
          c.saldo ? `Saldo pendiente: $${c.saldo}` : '',
        ].filter(Boolean).join('\n')

        setBeo({
          ...EMPTY_OS,
          folio: `OS-${id}`,
          client_signature_name: q.name,
          // Section 2 — Horarios from cotización
          guaranteed_guests: c.invitados || String(q.guests || ''),
          event_start: c.hora_evento || '',
          food_service_start: c.hora_cena || '',
          setup_access: '',
          // Section 3 — Espacio
          room_name: c.area || q.location || '',
          expedition_requirements: reqText,
          // Section 4 — Alimentos y Bebidas
          menu_details: (c.menu_items || []).filter(m => m.descripcion).map(m => `${m.tipo}: ${m.descripcion}`).join('\n') || '',
          dietary_notes: c.nota_alimentos || '',
          beverage_service: (c.bebidas_items || []).filter(b => b.descripcion || b.tipo).map(b => `${b.tipo}${b.descripcion ? ` - ${b.descripcion}` : ''}${b.precio ? ` $${parseFloat(b.precio).toFixed(2)}${b.precio_tipo === 'cu' ? ' c/u' : ''}` : ''}`).join('\n') || '',
          liquor_list: c.entretenimiento ? `Entretenimiento: ${c.entretenimiento}` : '',
          kitchen_notes: c.condiciones || q.notes || '',
          // Section 6 — Financiero
          price_breakdown: priceText,
          deposit_amount: (c.anticipos || []).reduce((s, a) => s + (parseFloat(a.monto) || 0), 0).toFixed(2),
          balance_due: c.saldo || '',
          external_vendors: c.celebracion ? `Tipo de evento: ${c.celebracion}` : '',
        })
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { folio, ...beoData } = beo
      await quotesAPI.saveBEO({ quote_id: parseInt(id), folio, beo_data: beoData })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch { /* silent */ }
    finally { setSaving(false) }
  }

  const handlePrint = () => window.print()

  const upd = (field) => (e) => setBeo(prev => ({ ...prev, [field]: e.target.value }))

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 rounded-full border-t border-cyan-400 animate-spin" />
    </div>
  )
  if (!quote) return (
    <div className="p-8 text-center text-slate-500">
      <Link to="/admin/quotes" className="text-cyan-400">← Regresar a Cotizaciones</Link>
    </div>
  )

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #beo-print-area, #beo-print-area * { visibility: visible !important; }
          #beo-print-area { position: fixed; top: 0; left: 0; width: 100%; background: white; }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      <div className="space-y-6 pb-16">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/admin/quotes/${id}`)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Expediente #{id}
            </button>
            <span className="text-slate-700">/</span>
            <h1 className="text-xl font-light text-white">Orden de Servicio <span className="text-cyan-400">· {quote.event_type}</span></h1>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-400 hover:border-cyan-400/60 hover:bg-cyan-500/20 disabled:opacity-40 transition-all">
              {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar OS'}
            </button>
            <button onClick={handlePrint} className="inline-flex items-center gap-2 rounded-full border border-slate-500/30 bg-slate-500/10 px-4 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-400/50 hover:bg-slate-500/20 transition-all">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Imprimir / PDF
            </button>
          </div>
        </div>

        {/* BEO Form - edit mode (hidden on print) */}
        <div className="space-y-6 no-print">
          {/* S1 – Información General */}
          <div className="rounded-xl border border-cyan-500/15 bg-[#040c1a]/80 p-5">
            <SectionHeader number="1" title="Información General" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <BEOField label="Número de Folio (OS)">
                <BEOInput value={beo.folio} onChange={upd('folio')} placeholder={`OS-${id}`} />
              </BEOField>
              <BEOField label="Gerente / Ejecutivo a cargo">
                <BEOInput value={beo.event_manager} onChange={upd('event_manager')} placeholder="Chef Manuel Borbón" />
              </BEOField>
              <BEOField label="Nombre del cliente (auto)">
                <div className="px-3 py-1.5 rounded-md border border-cyan-500/10 bg-[#030b18]/30 text-sm text-slate-400">{quote.name}</div>
              </BEOField>
              <BEOField label="Teléfono cliente (auto)">
                <div className="px-3 py-1.5 rounded-md border border-cyan-500/10 bg-[#030b18]/30 text-sm text-slate-400">{quote.phone}</div>
              </BEOField>
              <BEOField label="Correo cliente (auto)">
                <div className="px-3 py-1.5 rounded-md border border-cyan-500/10 bg-[#030b18]/30 text-sm text-slate-400">{quote.email}</div>
              </BEOField>
              <BEOField label="Área del evento (auto)">
                <div className="px-3 py-1.5 rounded-md border border-cyan-500/10 bg-[#030b18]/30 text-sm text-slate-400">{quote.location}</div>
              </BEOField>
            </div>
          </div>

          {/* S2 – Asistencia y Horarios */}
          <div className="rounded-xl border border-cyan-500/15 bg-[#040c1a]/80 p-5">
            <SectionHeader number="2" title="Asistencia y Horarios" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <BEOField label="Personas esperadas (auto)">
                <div className="px-3 py-1.5 rounded-md border border-cyan-500/10 bg-[#030b18]/30 text-sm text-slate-400">{quote.guests}</div>
              </BEOField>
              <BEOField label="Personas garantizadas">
                <BEOInput value={beo.guaranteed_guests} onChange={upd('guaranteed_guests')} placeholder="0" type="number" />
              </BEOField>
              <BEOField label="Acceso para montaje (hora)">
                <BEOInput value={beo.setup_access} onChange={upd('setup_access')} placeholder="09:00" />
              </BEOField>
              <BEOField label="Inicio del evento">
                <BEOInput value={beo.event_start} onChange={upd('event_start')} placeholder="14:00" />
              </BEOField>
              <BEOField label="Inicio servicio A&B">
                <BEOInput value={beo.food_service_start} onChange={upd('food_service_start')} placeholder="14:30" />
              </BEOField>
              <BEOField label="Fin servicio A&B">
                <BEOInput value={beo.food_service_end} onChange={upd('food_service_end')} placeholder="22:00" />
              </BEOField>
              <BEOField label="Finalización del evento">
                <BEOInput value={beo.event_end} onChange={upd('event_end')} placeholder="23:00" />
              </BEOField>
              <BEOField label="Desmontaje">
                <BEOInput value={beo.breakdown} onChange={upd('breakdown')} placeholder="23:30" />
              </BEOField>
            </div>
          </div>

          {/* S3 – Espacio y Montaje */}
          <div className="rounded-xl border border-cyan-500/15 bg-[#040c1a]/80 p-5">
            <SectionHeader number="3" title="Espacio y Montaje" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <BEOField label="Salón / Área específica">
                <BEOInput value={beo.room_name} onChange={upd('room_name')} placeholder="Comedor, Terraza Alta, etc." />
              </BEOField>
              <BEOField label="Tipo de montaje">
                <BEOInput value={beo.setup_type} onChange={upd('setup_type')} placeholder="Banquete, Cóctel, Auditorio…" />
              </BEOField>
              <BEOField label="Cantidad de mesas">
                <BEOInput value={beo.tables} onChange={upd('tables')} placeholder="10" />
              </BEOField>
              <BEOField label="Cantidad de sillas">
                <BEOInput value={beo.chairs} onChange={upd('chairs')} placeholder="80" />
              </BEOField>
              <BEOField label="Mesas de apoyo" span2>
                <BEOInput value={beo.support_tables} onChange={upd('support_tables')} placeholder="Registro, DJ, Buffet, Regalos…" />
              </BEOField>
              <BEOField label="Mantelería (colores y texturas)" span2>
                <BEOInput value={beo.linen_specs} onChange={upd('linen_specs')} placeholder="Blanco liso, orguanza dorada…" />
              </BEOField>
              <BEOField label="Plano / Diagrama / Notas de distribución" span2>
                <BEOInput value={beo.layout_notes} onChange={upd('layout_notes')} placeholder="Descripción o notas del diagrama…" rows={3} />
              </BEOField>
              <div className="sm:col-span-2">
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-[9px] uppercase tracking-widest text-cyan-500/50">Requerimientos del expediente</label>
                  <span className="text-[9px] rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-2 py-0.5">auto → editable</span>
                </div>
                <BEOInput value={beo.expedition_requirements} onChange={upd('expedition_requirements')} placeholder="Se llena automáticamente desde el checklist del expediente…" rows={4} />
              </div>
            </div>
          </div>

          {/* S4 – Alimentos y Bebidas */}
          <div className="rounded-xl border border-cyan-500/15 bg-[#040c1a]/80 p-5">
            <SectionHeader number="4" title="Alimentos y Bebidas" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <BEOField label="Menú desglosado por tiempos" span2>
                <BEOInput value={beo.menu_details} onChange={upd('menu_details')} placeholder="Entrada: ...\nPlato fuerte: ...\nPostre: ..." rows={5} />
              </BEOField>
              <BEOField label="Restricciones dietéticas / alergias" span2>
                <BEOInput value={beo.dietary_notes} onChange={upd('dietary_notes')} placeholder="Vegetarianos: 3, Sin gluten: 1…" rows={2} />
              </BEOField>
              <BEOField label="Tipo de servicio de bebidas">
                <BEOInput value={beo.beverage_service} onChange={upd('beverage_service')} placeholder="Barra libre, por consumo…" />
              </BEOField>
              <BEOField label="Lista de licores, vinos y mezcladores">
                <BEOInput value={beo.liquor_list} onChange={upd('liquor_list')} placeholder="Vodka, Whisky, Vino tinto, Agua…" />
              </BEOField>
              <BEOField label="Notas de cocina" span2>
                <BEOInput value={beo.kitchen_notes} onChange={upd('kitchen_notes')} placeholder="Observaciones especiales para cocina…" rows={2} />
              </BEOField>
            </div>
          </div>

          {/* S5 – Audiovisual */}
          <div className="rounded-xl border border-cyan-500/15 bg-[#040c1a]/80 p-5">
            <SectionHeader number="5" title="Equipo Audiovisual y Tecnología" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <BEOField label="Equipo de sonido">
                <BEOInput value={beo.av_sound} onChange={upd('av_sound')} placeholder="Micrófonos, bocinas, consola…" />
              </BEOField>
              <BEOField label="Equipo visual">
                <BEOInput value={beo.av_visual} onChange={upd('av_visual')} placeholder="Pantalla, proyector…" />
              </BEOField>
              <BEOField label="Iluminación">
                <BEOInput value={beo.lighting} onChange={upd('lighting')} placeholder="Especificaciones de luz…" />
              </BEOField>
              <BEOField label="Conectividad (Wi-Fi / Energía)">
                <BEOInput value={beo.connectivity} onChange={upd('connectivity')} placeholder="Red, tomacorrientes…" />
              </BEOField>
            </div>
          </div>

          {/* S6 – Proveedores y Personal */}
          <div className="rounded-xl border border-cyan-500/15 bg-[#040c1a]/80 p-5">
            <SectionHeader number="6" title="Proveedores y Personal" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <BEOField label="Proveedores externos" span2>
                <BEOInput value={beo.external_vendors} onChange={upd('external_vendors')} placeholder="DJ: nombre, tel\nFotógrafo: nombre, tel…" rows={3} />
              </BEOField>
              <BEOField label="Meseros requeridos">
                <BEOInput value={beo.waitstaff_count} onChange={upd('waitstaff_count')} placeholder="4" type="number" />
              </BEOField>
              <BEOField label="Bartenders requeridos">
                <BEOInput value={beo.bartender_count} onChange={upd('bartender_count')} placeholder="2" type="number" />
              </BEOField>
              <BEOField label="Personal adicional" span2>
                <BEOInput value={beo.additional_staff} onChange={upd('additional_staff')} placeholder="Seguridad, guardarropa, valet…" />
              </BEOField>
            </div>
          </div>

          {/* S7 – Costos y Firmas */}
          <div className="rounded-xl border border-cyan-500/15 bg-[#040c1a]/80 p-5">
            <SectionHeader number="7" title="Costos, Facturación y Firmas" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <BEOField label="Desglose de precios unitarios" span2>
                <BEOInput value={beo.price_breakdown} onChange={upd('price_breakdown')} placeholder="Salón: $X\nMenú por persona: $X\nA&B: $X…" rows={4} />
              </BEOField>
              <BEOField label="Cargo por servicio (%)">
                <BEOInput value={beo.service_charge_pct} onChange={upd('service_charge_pct')} placeholder="16" type="number" />
              </BEOField>
              <BEOField label="Método de pago">
                <BEOInput value={beo.payment_method} onChange={upd('payment_method')} placeholder="Transferencia, efectivo, tarjeta…" />
              </BEOField>
              <BEOField label="Anticipo recibido ($)">
                <BEOInput value={beo.deposit_amount} onChange={upd('deposit_amount')} placeholder="5000.00" />
              </BEOField>
              <BEOField label="Saldo pendiente ($)">
                <BEOInput value={beo.balance_due} onChange={upd('balance_due')} placeholder="10000.00" />
              </BEOField>
              <BEOField label="Nombre cliente para firma">
                <BEOInput value={beo.client_signature_name} onChange={upd('client_signature_name')} placeholder={quote.name} />
              </BEOField>
              <BEOField label="Nombre representante Bonifacio's">
                <BEOInput value={beo.venue_signature_name} onChange={upd('venue_signature_name')} placeholder="Chef Manuel Borbón" />
              </BEOField>
            </div>
          </div>

          {/* Bottom action bar */}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-5 py-2 text-sm font-medium text-cyan-400 hover:border-cyan-400/60 hover:bg-cyan-500/20 disabled:opacity-40 transition-all">
              {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar OS'}
            </button>
            <button onClick={handlePrint} className="inline-flex items-center gap-2 rounded-full border border-slate-500/30 bg-slate-500/10 px-5 py-2 text-sm font-medium text-slate-300 hover:border-slate-400/50 transition-all">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Imprimir / Descargar PDF
            </button>
          </div>
        </div>

        {/* Print version — hidden on screen, visible on print */}
        <div id="beo-print-area">
          <PrintableBEO quote={quote} beo={beo} />
        </div>
      </div>
    </>
  )
}
