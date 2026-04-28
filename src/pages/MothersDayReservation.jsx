import { useState } from 'react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function MothersDayReservation() {
  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    guests: 2,
    reservation_date: '2026-05-10', // Fecha fija para Día de las Madres
    reservation_time: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // Función para contar mesas únicas ocupadas
  const countUniqueTables = (tableCodes) => {
    const uniqueTables = new Set();
    tableCodes.forEach(code => {
      if (code && code !== '') {
        uniqueTables.add(code);
      }
    });
    return uniqueTables.size;
  };

  // Función para verificar disponibilidad de mesas
  const checkTableAvailability = async (reservationTime) => {
    try {
      const response = await fetch(`${API_BASE}/reservations/availability.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservation_date: '2026-05-10',
          reservation_time: reservationTime,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking availability:', error);
      return { success: false, error: 'Error al verificar disponibilidad' };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.customer_name || !form.phone || !form.guests || !form.reservation_time) {
      setMessage('Por favor completa todos los campos requeridos.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      // Primero verificar disponibilidad de mesas
      const availabilityCheck = await checkTableAvailability(form.reservation_time);
      
      if (!availabilityCheck.success) {
        setMessage('Error al verificar disponibilidad de mesas. Por favor intenta nuevamente.');
        setIsSubmitting(false);
        return;
      }

      // Verificar si hay mesas disponibles para esa hora
      const occupiedTables = availabilityCheck.occupied_table_codes || [];
      const occupiedCount = countUniqueTables(occupiedTables);
      
      // Para Día de las Madres, si todas las mesas están ocupadas en esa hora, bloquear
      if (occupiedCount >= 26) {
        setMessage(`Lo sentimos, todas las mesas están ocupadas para las ${form.reservation_time}. Por favor selecciona otra hora.`);
        setIsSubmitting(false);
        return;
      }
      
      // Verificar si ya hay una reservación con este teléfono para la misma hora
      const existingReservation = availabilityCheck.occupied.find(
        res => res.phone === form.phone
      );
      
      if (existingReservation) {
        setMessage(`Ya tienes una reservación para las ${form.reservation_time}. No puedes hacer múltiples reservaciones para la misma hora.`);
        setIsSubmitting(false);
        return;
      }
      
      // Si hay más de 20 mesas ocupadas, advertir que hay poca disponibilidad
      if (occupiedCount >= 20) {
        setMessage(`Quedan pocas mesas disponibles para las ${form.reservation_time}. Te recomendamos reservar pronto.`);
      }

      // Si hay mesas disponibles, proceder con la reservación
      const response = await fetch(`${API_BASE}/reservations/mothers-day.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage('¡Reservación recibida! Revisa tu correo para los detalles del depósito.');
        setForm({
          customer_name: '',
          phone: '',
          guests: 2,
          reservation_date: '2026-05-10',
          reservation_time: '',
          notes: '',
        });
      } else {
        setMessage(data.error || 'No se pudo guardar la reservación.');
      }
    } catch {
      setMessage('Error de red, intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-[#0f0f14] via-[#1a1a1f] to-[#0a0a0f] text-[#F4E4C1]">
      <div className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute left-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-[#D4AF37]/10 blur-[90px]" />
        <div className="absolute right-[-120px] top-[80px] h-[360px] w-[360px] rounded-full bg-cyan-500/10 blur-[110px]" />
        <div className="absolute bottom-[-140px] left-[30%] h-[320px] w-[320px] rounded-full bg-fuchsia-500/10 blur-[120px]" />
      </div>
      
      <div className="mx-auto max-w-7xl px-3 py-6 sm:px-5 sm:py-8 lg:px-8 lg:py-10">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-2 inline-flex rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#D4AF37]">
              Experiencia Especial
            </p>
            <h1 className="font-serif text-2xl sm:text-3xl">Reservación Especial Día de las Madres</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#F4E4C1]/65">
              Celebra el Día de las Madres en Bonifacio's con una experiencia inolvidable.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#D4AF37]/20 px-4 py-2 text-sm font-medium text-[#D4AF37]">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Domingo 10 de Mayo 2026
            </div>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg border border-[#D4AF37]/20 bg-black/40 px-4 py-2 text-sm text-[#D4AF37] transition-colors hover:border-[#D4AF37]/40 hover:bg-black/60"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al inicio
          </Link>
        </div>

        {/* Form */}
        <div className="mx-auto max-w-2xl">
          <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-black/60 via-black/40 to-black/60 p-8 sm:p-10 backdrop-blur-xl">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#D4AF37]/8 blur-3xl" />
            <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-[#D4AF37]/5 blur-3xl" />
            
            <div className="relative">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-[#D4AF37]/60 mb-1.5">
                      Nombre completo *
                    </label>
                    <input
                      type="text"
                      value={form.customer_name}
                      onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                      className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-sm text-[#F4E4C1] placeholder-[#F4E4C1]/20 backdrop-blur-md focus:border-[#D4AF37]/50 focus:outline-none transition-colors"
                      placeholder="Tu nombre"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-[#D4AF37]/60 mb-1.5">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-sm text-[#F4E4C1] placeholder-[#F4E4C1]/20 backdrop-blur-md focus:border-[#D4AF37]/50 focus:outline-none transition-colors"
                      placeholder="622 000 0000"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#D4AF37]/60 mb-1.5">
                    Hora *
                  </label>
                    <select
                    value={form.reservation_time}
                    onChange={(e) => setForm({ ...form, reservation_time: e.target.value })}
                    className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-sm text-[#F4E4C1] backdrop-blur-md focus:border-[#D4AF37]/50 focus:outline-none transition-colors"
                    required
                  >
                    <option value="">Selecciona una hora</option>
                    <option value="13:00">1:00 PM</option>
                    <option value="13:30">1:30 PM</option>
                    <option value="14:00">2:00 PM</option>
                    <option value="14:30">2:30 PM</option>
                    <option value="15:00">3:00 PM</option>
                    <option value="15:30">3:30 PM</option>
                    <option value="16:00">4:00 PM</option>
                    <option value="16:30">4:30 PM</option>
                    <option value="17:00">5:00 PM</option>
                    <option value="17:30">5:30 PM</option>
                    <option value="18:00">6:00 PM</option>
                    <option value="18:30">6:30 PM</option>
                    <option value="19:00">7:00 PM</option>
                    <option value="19:30">7:30 PM</option>
                    <option value="20:00">8:00 PM</option>
                    <option value="20:30">8:30 PM</option>
                    <option value="21:00">9:00 PM</option>
                    <option value="21:30">9:30 PM</option>
                    <option value="22:00">10:00 PM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#D4AF37]/60 mb-1.5">
                    Número de personas *
                  </label>
                  <select
                    value={form.guests}
                    onChange={(e) => setForm({ ...form, guests: parseInt(e.target.value) })}
                    className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-sm text-[#F4E4C1] backdrop-blur-md focus:border-[#D4AF37]/50 focus:outline-none transition-colors"
                    required
                  >
                    <option value="1">1 persona</option>
                    <option value="2">2 personas</option>
                    <option value="3">3 personas</option>
                    <option value="4">4 personas</option>
                    <option value="5">5 personas</option>
                    <option value="6">6 personas</option>
                    <option value="7">7 personas</option>
                    <option value="8">8 personas</option>
                    <option value="9">9 personas</option>
                    <option value="10">10 personas</option>
                    <option value="11">11 personas</option>
                    <option value="12">12 personas</option>
                    <option value="13">13 personas</option>
                    <option value="14">14 personas</option>
                    <option value="15">15 personas</option>
                    <option value="16">16 personas</option>
                    <option value="17">17 personas</option>
                    <option value="18">18 personas</option>
                    <option value="19">19 personas</option>
                    <option value="20">20 personas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#D4AF37]/60 mb-1.5">
                    Comentarios adicionales
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={4}
                    className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-sm text-[#F4E4C1] placeholder-[#F4E4C1]/20 backdrop-blur-md focus:border-[#D4AF37]/50 focus:outline-none transition-colors resize-none"
                    placeholder="Alguna preferencia especial o comentario (opcional)"
                  />
                </div>

                <div className="text-center">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#C9A961] px-8 py-3.5 font-serif text-sm font-medium text-black transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#D4AF37]/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Confirmar Reservación
                      </>
                    )}
                  </button>
                </div>

                {message && (
                  <div className={`rounded-lg p-4 text-center ${
                    message.includes('confirmada') || message.includes('éxito') 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {message}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MothersDayReservation;
