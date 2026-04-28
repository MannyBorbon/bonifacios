import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  ChevronLeft,
  Check,
  Clock,
  ArrowRight
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Formateador inteligente de ubicación para Bonifacio's
const formatTableCode = (tableCode) => {
  // 1. Si no hay código, no mostrar ubicación
  if (!tableCode) return '';
  
  const codeUpper = tableCode.toUpperCase();
  let zona = null;
  
  // 2. Identificar el área asignada
  if (codeUpper.includes('TA-')) zona = 'Terraza Alta';
  else if (codeUpper.includes('TB-')) zona = 'Terraza Baja';
  else if (codeUpper.includes('CD-') || codeUpper.includes('MD-') || codeUpper.includes('RM-')) zona = 'Interior';
  
  // 3. Si no se pudo identificar área, no mostrar ubicación
  if (!zona) return '';
  
  // 4. Detectar si es un folio web largo (sin mesa específica)
  if (tableCode.length > 8) {
    return `${zona} · Asignada al llegar`;
  }
  
  // 5. Extraer número de mesa si existe
  const numeroMesa = tableCode.replace(/[^0-9]/g, '');
  
  if (numeroMesa) {
    // Tiene mesa específica asignada
    return `${zona} · Mesa ${numeroMesa}`;
  } else {
    // Solo tiene área asignada, sin número específico
    return `${zona}`;
  }
};

function ReservationClientDetail() {
  const [phone, setPhone] = useState('');
  const [reservations, setReservations] = useState([]);
  // const [accounts, setAccounts] = useState([]); // Temporalmente comentado
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);

  const selected = reservations.find((r) => r.id === selectedId) || null;

  const searchReservations = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      // const [resReservations, resAccounts] = await Promise.all([
      //   fetch(`${API_BASE}/reservations/client-lookup.php`, {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({ phone }),
      //   }),
      //   fetch(`${API_BASE}/reservations/deposit-accounts.php`),
      // ]);
      
      const resReservations = await fetch(`${API_BASE}/reservations/client-lookup.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const dataReservations = await resReservations.json();
      // const dataAccounts = await resAccounts.json(); // Temporalmente comentado

      if (dataReservations.success) {
        const list = Array.isArray(dataReservations.reservations) ? dataReservations.reservations : [];
        setReservations(list);
        setSelectedId(list[0]?.id || null);
        if (!list.length) setMessage('No encontramos reservaciones bajo este número.');
      } else {
        setMessage(dataReservations.error || 'Ocurrió un error en la consulta.');
      }
      // if (dataAccounts.success) setAccounts(Array.isArray(dataAccounts.accounts) ? dataAccounts.accounts : []); // Temporalmente comentado
    } catch {
      setMessage('Error de conexión. Por favor, intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('reservation_id', selected.id);
      formData.append('screenshot', file);
      formData.append('phone', phone);
      const response = await fetch(`${API_BASE}/reservations/client-upload-deposit.php`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        setMessage('Su comprobante ha sido recibido exitosamente.');
        setReservations(prev => prev.map(r => r.id === selected.id ? { ...r, status: 'uploaded' } : r));
      } else {
        setMessage(data.error || 'No pudimos procesar el archivo.');
      }
    } catch {
      setMessage('Error al enviar el comprobante.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#2C2825] font-light selection:bg-[#B8935A]/20">
      
      {/* Navbar Ultra-Minimalista */}
      <nav className="w-full px-8 py-10 max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3 text-[10px] tracking-[0.2em] uppercase text-[#7A7571] hover:text-[#2C2825] transition-colors">
          <ChevronLeft size={14} strokeWidth={1.5} /> Inicio
        </Link>
        {/* Cambiamos el logo a su versión oscura/dorada si es posible, si no, usamos texto elegante */}
        <div className="font-serif text-2xl tracking-widest text-[#B8935A]">BONIFACIO'S</div>
        <div className="w-10"></div> {/* Espaciador para centrar el logo */}
      </nav>

      <main className="max-w-3xl mx-auto px-6 pb-32 relative">
        
        {/* Pantalla de Búsqueda (Se oculta al encontrar resultados) */}
        {!selected && (
          <div className="mt-20 text-center animate-in fade-in duration-1000">
            <h1 className="font-serif text-4xl md:text-5xl text-[#1A1814] mb-4">Su Reservación</h1>
            <p className="text-[#8C857B] text-sm tracking-wide mb-16">Ingrese el número móvil asociado a su experiencia</p>
            
            <div className="max-w-sm mx-auto relative group">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="622 000 0000"
                className="w-full bg-transparent border-b border-[#D1CDC7] focus:border-[#B8935A] py-4 text-center text-3xl font-serif text-[#2C2825] placeholder:text-[#EAE5DE] outline-none transition-colors"
              />
              <button
                onClick={searchReservations}
                disabled={loading || !phone.trim()}
                className="mt-12 w-full bg-[#1A1814] hover:bg-[#B8935A] text-white py-4 text-[10px] tracking-[0.3em] uppercase transition-colors disabled:opacity-30 flex justify-center items-center gap-2"
              >
                {loading ? 'Consultando...' : 'Acceder a mi reserva'} <ArrowRight size={14} />
              </button>
            </div>
            {message && <p className="mt-8 text-[#B8935A] text-xs uppercase tracking-widest">{message}</p>}
          </div>
        )}

        {/* La "Carta" de Reservación */}
        {selected && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
            
            {/* Si hay múltiples reservas, mostramos un selector minimalista arriba */}
            {reservations.length > 1 && (
              <div className="flex justify-center gap-6 mb-12 border-b border-[#EAE5DE] pb-4">
                {reservations.map((r, index) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`text-[10px] uppercase tracking-[0.2em] pb-4 border-b-2 transition-colors ${
                      selected.id === r.id ? 'border-[#B8935A] text-[#1A1814]' : 'border-transparent text-[#8C857B] hover:text-[#1A1814]'
                    }`}
                  >
                    Reserva {index + 1}
                  </button>
                ))}
              </div>
            )}

            {/* El Documento Principal */}
            <div className="bg-white rounded-sm shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-[#EAE5DE] relative overflow-hidden">
              {/* Línea dorada superior fina */}
              <div className="absolute top-0 left-0 w-full h-[2px] bg-[#B8935A]"></div>
              
              <div className="p-8 md:p-14">
                <div className="text-center mb-14">
                  <p className="text-[9px] uppercase tracking-[0.4em] text-[#8C857B] mb-4">A nombre de</p>
                  <h2 className="font-serif text-4xl md:text-5xl text-[#1A1814] mb-8">{selected.customer_name}</h2>
                  
                  <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 text-[#2C2825]">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.3em] text-[#8C857B] mb-1">Fecha</p>
                      <p className="font-serif text-2xl">{selected.reservation_date}</p>
                    </div>
                    <div className="hidden md:block w-px h-8 bg-[#EAE5DE]"></div>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.3em] text-[#8C857B] mb-1">Hora</p>
                      <p className="font-serif text-2xl">{String(selected.reservation_time).slice(0, 5)}</p>
                    </div>
                  </div>
                </div>

                <hr className="border-[#EAE5DE] mb-10" />

                {/* Detalles en Grid Minimalista */}
                <div className="grid grid-cols-2 gap-y-10 gap-x-8 mb-12">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.3em] text-[#8C857B] mb-2">Comensales</p>
                    <p className="text-lg text-[#2C2825]">{selected.guests} Personas</p>
                  </div>
                  {formatTableCode(selected.table_code) && (
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.3em] text-[#8C857B] mb-2">Ubicación</p>
                      <p className="text-lg text-[#2C2825]">{formatTableCode(selected.table_code)}</p>
                    </div>
                  )}
                  <div className={`${formatTableCode(selected.table_code) ? 'col-span-1' : 'col-span-2'}`}>
                    <p className="text-[9px] uppercase tracking-[0.3em] text-[#8C857B] mb-2">Estado de la Reserva</p>
                    <p className={`text-lg flex items-center gap-2 ${
                      selected.status === 'confirmed' ? 'text-[#4A6741]' : 
                      selected.status === 'uploaded' ? 'text-[#6B8E9B]' : 
                      selected.occasion === 'Dia de las Madres' ? 'text-[#B8935A]' : 'text-[#B8935A]'
                    }`}>
                      {selected.status === 'confirmed' ? 'Confirmada' : 
                       selected.status === 'uploaded' ? 'Verificando Comprobante' : 
                       selected.occasion === 'Dia de las Madres' && selected.status !== 'confirmed' && selected.status !== 'uploaded' ? 'Pendiente de Garantía' : selected.status === 'pending' ? 'Pendiente' : 'Confirmada'}
                    </p>
                  </div>
                </div>

                {/* Zona de Garantía / Pago */}
                {selected.occasion === 'Dia de las Madres' && selected.status !== 'confirmed' && (
                  <div className="bg-[#FDFBF7] border border-[#EAE5DE] p-8 rounded-sm">
                    {selected.status === 'uploaded' ? (
                      <div className="text-center py-6">
                        <Clock className="mx-auto text-[#6B8E9B] mb-4" strokeWidth={1.5} size={32} />
                        <h3 className="font-serif text-2xl text-[#1A1814] mb-2">Comprobante Recibido</h3>
                        <p className="text-[#8C857B] text-sm">Nuestro equipo está validando su depósito. Su lugar está apartado.</p>
                      </div>
                    ) : (
                      <>
                        {/* 
                        <div className="text-center mb-8">
                          <h3 className="font-serif text-2xl text-[#1A1814] mb-2">Garantía de Reserva</h3>
                          <p className="text-[#8C857B] text-sm">Para finalizar, por favor realice la transferencia a la siguiente cuenta.</p>
                        </div>
                        
                        {accounts.map((a) => (
                          <div key={a.id} className="mb-8 text-center">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-[#8C857B] mb-1">{a.bank_name}</p>
                            <p className="text-lg text-[#2C2825] mb-2">{a.account_holder}</p>
                            <p className="font-serif text-xl tracking-widest text-[#B8935A] mb-4">{a.clabe}</p>
                            <p className="text-xs text-[#8C857B] italic">{a.instructions}</p>
                          </div>
                        ))}
*/}

                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={loading}
                          className="w-full border border-[#B8935A] text-[#B8935A] hover:bg-[#B8935A] hover:text-white py-4 text-[10px] uppercase tracking-[0.2em] transition-colors flex justify-center items-center gap-2"
                        >
                          {loading ? 'Procesando...' : 'Adjuntar Comprobante de Pago'}
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                      </>
                    )}
                  </div>
                )}

                {selected.status === 'confirmed' && (
                  <div className="mt-10 py-6 text-center">
                     <Check className="mx-auto text-[#4A6741] mb-4" strokeWidth={1.5} size={32} />
                     <p className="font-serif text-2xl text-[#4A6741]">Reserva Confirmada</p>
                     <p className="text-[#8C857B] text-sm mt-2">Le esperamos para brindarle una experiencia inolvidable.</p>
                  </div>
                )}
                
              </div>
            </div>
            
            {/* Mensajes de sistema inferiores */}
            {message && <p className="mt-8 text-center text-[#B8935A] text-xs uppercase tracking-widest">{message}</p>}
          </div>
        )}
      </main>
      
      <footer className="relative mt-12 mb-8 w-full text-center">
         <p className="text-[9px] uppercase tracking-[0.4em] text-[#D1CDC7]">Bonifacio's Restaurant</p>
      </footer>
    </div>
  );
}

export default ReservationClientDetail;