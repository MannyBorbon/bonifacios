import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function SpecialEventReservation() {
  const { slug } = useParams();
  const [eventConfig, setEventConfig] = useState(null);
  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    email: '',
    guests: 2,
    reservation_date: '',
    reservation_time: '',
    notes: '',
    event_type_id: ''
  });
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/reservations/event-types.php?public=1`);
        const data = await res.json();
        if (!data.success) return;
        const found = (data.events || []).find((e) => e.slug === slug);
        if (!found) return;
        setEventConfig(found);
        setForm((prev) => ({
          ...prev,
          reservation_date: found.event_date || '',
          event_type_id: String(found.id)
        }));
      } catch {
        // silent
      }
    };
    load();
  }, [slug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_name || !form.phone || !form.reservation_date || !form.reservation_time || !form.event_type_id) {
      setMessage('Completa los campos requeridos');
      return;
    }
    setIsSubmitting(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/reservations/special-event.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Reservacion enviada correctamente');
        setForm((prev) => ({
          ...prev,
          customer_name: '',
          phone: '',
          email: '',
          guests: 2,
          reservation_time: '',
          notes: ''
        }));
      } else {
        setMessage(data.error || 'No se pudo enviar la reservacion');
      }
    } catch {
      setMessage('Error de red');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f14] via-[#1a1a1f] to-[#0a0a0f] p-4 text-[#F4E4C1]">
      <div className="mx-auto max-w-2xl rounded-2xl border border-[#D4AF37]/25 bg-black/40 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-serif">Reservacion Especial {eventConfig?.name || ''}</h1>
          <Link to="/" className="text-sm text-[#D4AF37]">Volver</Link>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-3 py-2" placeholder="Nombre" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
          <input className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-3 py-2" placeholder="Telefono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-3 py-2" placeholder="Correo (opcional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input type="date" className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-3 py-2" value={form.reservation_date} onChange={(e) => setForm({ ...form, reservation_date: e.target.value })} />
            <input type="time" className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-3 py-2" value={form.reservation_time} onChange={(e) => setForm({ ...form, reservation_time: e.target.value })} />
          </div>
          <input type="number" min={1} max={20} className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-3 py-2" value={form.guests} onChange={(e) => setForm({ ...form, guests: parseInt(e.target.value, 10) || 1 })} />
          <textarea className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-3 py-2" rows={3} placeholder="Notas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button disabled={isSubmitting} className="w-full rounded-lg bg-[#D4AF37] px-4 py-2 font-semibold text-black">{isSubmitting ? 'Enviando...' : 'Reservar'}</button>
          {message && <p className="text-xs text-amber-300">{message}</p>}
        </form>
      </div>
    </div>
  );
}

