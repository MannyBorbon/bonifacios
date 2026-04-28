import { useEffect, useState, useRef, useCallback } from 'react';
import { chatAPI } from '../../services/api';

const TZ = 'America/Hermosillo';
const fmtTime = (d) => {
  if (!d) return '';
  const date = new Date(d.includes?.('T') ? d : String(d).replace(' ', 'T'));
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString('es-MX', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
  if (now - date < 7 * 864e5) return date.toLocaleDateString('es-MX', { timeZone: TZ, weekday: 'short' });
  return date.toLocaleDateString('es-MX', { timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit' });
};
const fmtFull = (d) => {
  if (!d) return '';
  const date = new Date(d.includes?.('T') ? d : String(d).replace(' ', 'T'));
  return date.toLocaleString('es-MX', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};
const fmtSize = (b) => { if (!b) return ''; if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; };
const fmtDur = (s) => { const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${sec.toString().padStart(2, '0')}`; };

// ─── Jitsi Video Call Component ───────────────────────────────────────────────
function JitsiMeeting({ roomName, displayName, onClose }) {
  const containerRef = useRef(null);
  const apiRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const loadAndStart = () => {
      if (cancelled || !containerRef.current) return;
      if (apiRef.current) { try { apiRef.current.dispose(); } catch { /* intentional */ } }

      const api = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName,
        parentNode: containerRef.current,
        width: '100%',
        height: '100%',
        userInfo: { displayName },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          prejoinPageEnabled: false,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          TOOLBAR_BUTTONS: ['microphone', 'camera', 'hangup', 'chat', 'fullscreen', 'tileview'],
        },
      });
      apiRef.current = api;
      api.addListener('readyToClose', () => onClose());
    };

    if (window.JitsiMeetExternalAPI) {
      loadAndStart();
    } else {
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = loadAndStart;
      script.onerror = () => { alert('No se pudo cargar Jitsi Meet'); onClose(); };
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (apiRef.current) { try { apiRef.current.dispose(); } catch { /* intentional */ } apiRef.current = null; }
    };
  }, [roomName, displayName, onClose]);

  return (
    <div className="relative border-b border-cyan-500/10" style={{ height: '45vh', minHeight: 280 }}>
      <div ref={containerRef} className="w-full h-full" />
      <button onClick={onClose}
        className="absolute top-2 right-2 rounded-full bg-red-500/90 text-white p-1.5 hover:bg-red-600 transition-colors shadow-lg z-10">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

// ─── Custom Audio Player (WhatsApp style) ────────────────────────────────────
const WAVE_BARS = [4,7,5,8,3,6,9,5,7,4,8,6,3,7,5,9,4,6,8,5,7,3,6,8,4,7,5,9,6,3];

function AudioPlayer({ src, isMine }) {
  const audioRef = useRef(null);
  const amrRef = useRef(null);
  const timerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [useAmr, setUseAmr] = useState(false);

  const accent = isMine ? '#22d3ee' : '#9CA3AF';
  const progress = duration > 0 ? currentTime / duration : 0;
  const fileName = src?.split('/').pop() || 'audio';

  // Cleanup AMR on unmount
  useEffect(() => {
    return () => {
      if (amrRef.current) { try { amrRef.current.stop(); } catch { /* intentional */ } }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const playWithAmrDecoder = async () => {
    try {
      const BenzAMRRecorder = (await import('benz-amr-recorder')).default;
      const amr = new BenzAMRRecorder();
      await amr.initWithUrl(src);
      amrRef.current = amr;
      setDuration(amr.getDuration() || 0);
      setUseAmr(true);

      amr.onPlay(() => {
        setPlaying(true);
        timerRef.current = setInterval(() => {
          if (amrRef.current) setCurrentTime(amrRef.current.getCurrentPosition() || 0);
        }, 200);
      });
      amr.onStop(() => { setPlaying(false); setCurrentTime(0); if (timerRef.current) clearInterval(timerRef.current); });
      amr.onEnded(() => { setPlaying(false); setCurrentTime(0); if (timerRef.current) clearInterval(timerRef.current); });

      amr.play();
    } catch (err) {
      console.error('AMR decoder failed:', err);
      // Last resort: try Web Audio API decodeAudioData
      try {
        const resp = await fetch(src);
        const buf = await resp.arrayBuffer();
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const decoded = await ctx.decodeAudioData(buf);
        const source = ctx.createBufferSource();
        source.buffer = decoded;
        source.connect(ctx.destination);
        setDuration(decoded.duration);
        source.start();
        setPlaying(true);
        timerRef.current = setInterval(() => {
          setCurrentTime(prev => { const next = prev + 0.2; if (next >= decoded.duration) { clearInterval(timerRef.current); setPlaying(false); return 0; } return next; });
        }, 200);
        source.onended = () => { setPlaying(false); setCurrentTime(0); if (timerRef.current) clearInterval(timerRef.current); };
      } catch {
        // Nothing works — just open download
        window.open(src, '_blank');
      }
    }
  };

  const toggle = async () => {
    if (playing) {
      if (useAmr && amrRef.current) { amrRef.current.pause(); setPlaying(false); if (timerRef.current) clearInterval(timerRef.current); }
      else if (audioRef.current) { audioRef.current.pause(); setPlaying(false); }
      return;
    }

    setLoading(true);

    // If we already know native audio doesn't work, go straight to AMR decoder
    if (useAmr && amrRef.current) {
      try { amrRef.current.play(); } catch { await playWithAmrDecoder(); }
      setLoading(false);
      return;
    }

    // Try native <audio> first
    const a = audioRef.current;
    if (a) {
      try {
        a.load();
        await a.play();
        setPlaying(true);
        setLoading(false);
        return;
      } catch {
        // Native failed, try AMR decoder
      }
    }

    await playWithAmrDecoder();
    setLoading(false);
  };

  const seek = (e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pct * duration;
    if (!useAmr && audioRef.current) { audioRef.current.currentTime = newTime; setCurrentTime(newTime); }
  };

  return (
    <div className="py-1.5 min-w-[220px] max-w-[300px]">
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        onLoadedMetadata={(e) => { if (e.target.duration && isFinite(e.target.duration)) setDuration(e.target.duration); }}
        onDurationChange={(e) => { if (e.target.duration && isFinite(e.target.duration)) setDuration(e.target.duration); }}
        onTimeUpdate={(e) => { setCurrentTime(e.target.currentTime); if (e.target.duration && isFinite(e.target.duration) && !duration) setDuration(e.target.duration); }}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
        style={{ display: 'none' }}
      />

      <div className="flex items-center gap-2">
        <button onClick={toggle} className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95" style={{ background: `${accent}20` }}>
          {loading ? (
            <div className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: accent, borderTopColor: 'transparent' }} />
          ) : playing ? (
            <svg className="h-5 w-5" fill={accent} viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
          ) : (
            <svg className="h-5 w-5 ml-0.5" fill={accent} viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-[2px] h-6 cursor-pointer" onClick={seek}>
            {WAVE_BARS.map((h, i) => {
              const barProgress = i / WAVE_BARS.length;
              const active = barProgress < progress;
              return (
                <div key={i} className="flex-1 rounded-full transition-all duration-150" style={{
                  height: `${h * 2.5}px`,
                  background: active ? accent : `${accent}30`,
                  minWidth: '2px'
                }} />
              );
            })}
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-[10px] text-slate-700">{playing || currentTime > 0 ? fmtDur(currentTime) : '0:00'}</span>
            <span className="text-[10px] text-slate-700">{duration > 0 ? fmtDur(duration) : '-:--'}</span>
          </div>
        </div>

        <a href={src} download={fileName} className="flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: `${accent}15` }} title="Descargar audio">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke={accent} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        </a>
      </div>
    </div>
  );
}

// ─── Message Bubble ──────────────────────────────────────────────────────────
function MessageBubble({ msg, isMine }) {
  const [preview, setPreview] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const t = msg.message_type;
  const f = msg.file_url;
  const isSending = msg._sending;

  const fileIcon = () => {
    const ext = (msg.file_name || '').split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return { bg: 'bg-red-500/20', color: 'text-red-400', label: 'PDF' };
    if (['doc', 'docx'].includes(ext)) return { bg: 'bg-blue-500/20', color: 'text-blue-400', label: 'DOC' };
    if (['xls', 'xlsx'].includes(ext)) return { bg: 'bg-green-500/20', color: 'text-green-400', label: 'XLS' };
    if (['zip', 'rar'].includes(ext)) return { bg: 'bg-purple-500/20', color: 'text-purple-400', label: 'ZIP' };
    return { bg: 'bg-neutral-500/20', color: 'text-neutral-400', label: ext.toUpperCase() || 'FILE' };
  };

  return (
    <>
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1 animate-[fadeIn_0.15s_ease-out]`}>
        <div className={`max-w-[80%] sm:max-w-[65%] rounded-2xl px-3 py-2 shadow-sm ${isSending ? 'opacity-60' : ''} ${
          isMine
            ? 'bg-gradient-to-br from-cyan-500/15 to-blue-600/10 border border-cyan-500/15 rounded-br-sm'
            : 'bg-gradient-to-br from-[#060d1f]/90 to-[#040c1a]/80 border border-slate-700/20 rounded-bl-sm'
        }`}>
          {t === 'image' && f && (
            <div className="relative mb-1 rounded-lg overflow-hidden cursor-pointer" onClick={() => setPreview(true)}>
              {!imgLoaded && <div className="w-full h-40 bg-[#060d1f]/60 animate-pulse rounded-lg" />}
              <img src={f} alt={msg.file_name || ''} onLoad={() => setImgLoaded(true)} className={`rounded-lg max-h-72 w-auto transition-all hover:brightness-110 ${imgLoaded ? '' : 'h-0'}`} />
            </div>
          )}
          {t === 'video' && f && (
            <video controls playsInline preload="metadata" className="rounded-lg max-h-72 w-full mb-1 bg-black">
              <source src={f} />
            </video>
          )}
          {t === 'audio' && f && (
            <AudioPlayer src={f} isMine={isMine} />
          )}
          {t === 'file' && f && (() => { const fi = fileIcon(); return (
            <a href={f} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl bg-[#030b18]/60 px-3 py-2.5 mb-1 hover:bg-cyan-500/8 transition-colors group">
              <div className={`h-10 w-10 rounded-lg ${fi.bg} flex items-center justify-center flex-shrink-0`}>
                <span className={`text-[10px] font-bold ${fi.color}`}>{fi.label}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300 truncate group-hover:text-slate-100">{msg.file_name || 'Archivo'}</p>
                <p className="text-[10px] text-slate-700">{fmtSize(msg.file_size)}</p>
              </div>
              <svg className="h-4 w-4 text-slate-700 group-hover:text-cyan-300 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </a>
          ); })()}
          {msg.content && (
            <p className={`text-[13px] leading-relaxed whitespace-pre-wrap break-words text-slate-200`}>{msg.content}</p>
          )}
          <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : ''}`}>
            <span className="text-[9px] text-slate-700">{isSending ? 'Enviando...' : fmtFull(msg.created_at)}</span>
            {isMine && !isSending && (
              <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
                <path d="M2 8.5l3 3 5-6" stroke={msg.is_read ? '#22d3ee' : '#47556980'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                {msg.is_read && <path d="M5.5 8.5l3 3 5-6" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
              </svg>
            )}
          </div>
        </div>
      </div>
      {preview && t === 'image' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4 animate-[fadeIn_0.2s]" onClick={() => setPreview(false)}>
          <button className="absolute top-4 right-4 text-white/60 hover:text-white z-10" onClick={() => setPreview(false)}>
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <img src={f} alt="" className="max-h-[90vh] max-w-[95vw] rounded-xl shadow-2xl" />
        </div>
      )}
    </>
  );
}

// ─── Main Messages Component ─────────────────────────────────────────────────
function Messages() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [videoCall, setVideoCall] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [supportTickets, setSupportTickets] = useState([]);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketCategory, setTicketCategory] = useState('general');
  const [showSidebar, setShowSidebar] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const pollRef = useRef(null);
  const msgCountRef = useRef(0);
  const mediaRecorderRef = useRef(null);
  const recordChunksRef = useRef([]);
  const recordTimerRef = useRef(null);

  const scrollToBottom = (force = false) => {
    setTimeout(() => {
      if (!chatContainerRef.current) return;
      const el = chatContainerRef.current;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      if (nearBottom || force) messagesEndRef.current?.scrollIntoView({ behavior: force ? 'auto' : 'smooth' });
    }, 50);
  };

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = '40px';
    ta.style.height = Math.min(ta.scrollHeight, 128) + 'px';
  };

  const loadConversations = useCallback(async () => {
    try {
      const res = await chatAPI.getConversations();
      setConversations(res.data.conversations || []);
    } catch { /* silent */ }
  }, []);

  const loadMessages = useCallback(async (convId, isPolling = false) => {
    if (!convId) return;
    if (!isPolling) setLoadingMsgs(true);
    try {
      const res = await chatAPI.getMessages(convId);
      const newMsgs = res.data.messages || [];
      if (isPolling) {
        if (newMsgs.length !== msgCountRef.current) {
          setMessages(newMsgs);
          msgCountRef.current = newMsgs.length;
          scrollToBottom();
          loadConversations();
        }
      } else {
        setMessages(newMsgs);
        msgCountRef.current = newMsgs.length;
        scrollToBottom(true);
        loadConversations();
      }
    } catch { if (!isPolling) setMessages([]); }
    finally { if (!isPolling) setLoadingMsgs(false); }
  }, [loadConversations]);

  const loadUsers = useCallback(async () => {
    try {
      const res = await chatAPI.getUsers();
      setUsers(res.data || []);
    } catch { /* silent */ }
  }, []);

  const loadAllUsers = useCallback(async () => {
    try {
      const res = await chatAPI.getUsersOnline();
      if (res.data?.success) {
        setAllUsers(res.data.users || []);
        setIsAdmin(!!res.data.is_admin);
      }
    } catch { /* silent */ }
  }, []);

  const loadSupportTickets = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/support/tickets.php`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setSupportTickets(data.tickets || []);
    } catch {
      setSupportTickets([]);
    }
  }, []);

  useEffect(() => { loadConversations(); loadUsers(); loadAllUsers(); loadSupportTickets(); }, [loadConversations, loadUsers, loadAllUsers, loadSupportTickets]);

  // Poll online status every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadAllUsers, 30000);
    return () => clearInterval(interval);
  }, [loadAllUsers]);

  useEffect(() => {
    if (activeConv?.conversation_id) {
      pollRef.current = setInterval(() => loadMessages(activeConv.conversation_id, true), 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeConv, loadMessages]);

  const openConversation = (conv) => {
    setActiveConv(conv);
    setVideoCall(false);
    setShowSidebar(false);
    msgCountRef.current = 0;
    loadMessages(conv.conversation_id);
  };

  const startNewChat = (u) => {
    setShowNewChat(false);
    const existing = conversations.find(c => c.other_user_id == u.id);
    if (existing) { openConversation(existing); return; }
    setActiveConv({ conversation_id: null, other_user_id: u.id, other_name: u.full_name, other_username: u.username, other_avatar: u.profile_photo || null, unread_count: 0 });
    setMessages([]);
    setShowSidebar(false);
  };

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;
    const tempId = 'temp_' + Date.now();
    const optimistic = { id: tempId, sender_id: currentUser.id, message_type: 'text', content, file_url: null, file_name: null, file_size: 0, is_read: false, created_at: new Date().toISOString(), _sending: true };
    setMessages(prev => [...prev, optimistic]);
    setText('');
    if (textareaRef.current) { textareaRef.current.style.height = '40px'; }
    scrollToBottom(true);
    setSending(true);
    try {
      const payload = { content };
      if (activeConv.conversation_id) payload.conversation_id = activeConv.conversation_id;
      else payload.recipient_id = activeConv.other_user_id;
      const res = await chatAPI.send(payload);
      if (res.data.success) {
        if (!activeConv.conversation_id) setActiveConv(prev => ({ ...prev, conversation_id: res.data.conversation_id }));
        setMessages(prev => prev.map(m => m.id === tempId ? res.data.message : m));
        msgCountRef.current++;
        loadConversations();
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    } catch { setMessages(prev => prev.filter(m => m.id !== tempId)); }
    finally { setSending(false); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImg = file.type.startsWith('image/');
    const isVid = file.type.startsWith('video/');
    const isAud = file.type.startsWith('audio/');
    const type = isImg ? 'image' : isVid ? 'video' : isAud ? 'audio' : 'file';
    setUploading(file.name);

    const tempId = 'temp_' + Date.now();
    const optimistic = { id: tempId, sender_id: currentUser.id, message_type: type, content: text.trim() || null, file_url: isImg ? URL.createObjectURL(file) : null, file_name: file.name, file_size: file.size, is_read: false, created_at: new Date().toISOString(), _sending: true };
    setMessages(prev => [...prev, optimistic]);
    scrollToBottom(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (activeConv.conversation_id) formData.append('conversation_id', activeConv.conversation_id);
      else formData.append('recipient_id', activeConv.other_user_id);
      if (text.trim()) formData.append('content', text.trim());

      const res = await chatAPI.upload(formData);
      if (res.data.success) {
        if (!activeConv.conversation_id) setActiveConv(prev => ({ ...prev, conversation_id: res.data.conversation_id }));
        setMessages(prev => prev.map(m => m.id === tempId ? res.data.message : m));
        setText('');
        msgCountRef.current++;
        loadConversations();
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    } catch { setMessages(prev => prev.filter(m => m.id !== tempId)); }
    finally { setUploading(null); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      recordChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (recordChunksRef.current.length === 0) return;
        const blob = new Blob(recordChunksRef.current, { type: mimeType });
        const file = new File([blob], `voicenote_${Date.now()}.webm`, { type: mimeType });
        // Send as file upload
        setUploading('Nota de voz');
        const tempId = 'temp_' + Date.now();
        const optimistic = { id: tempId, sender_id: currentUser.id, message_type: 'audio', content: null, file_url: URL.createObjectURL(blob), file_name: file.name, file_size: file.size, is_read: false, created_at: new Date().toISOString(), _sending: true };
        setMessages(prev => [...prev, optimistic]);
        scrollToBottom(true);
        try {
          const formData = new FormData();
          formData.append('file', file);
          if (activeConv.conversation_id) formData.append('conversation_id', activeConv.conversation_id);
          else formData.append('recipient_id', activeConv.other_user_id);
          const res = await chatAPI.upload(formData);
          if (res.data.success) {
            if (!activeConv.conversation_id) setActiveConv(prev => ({ ...prev, conversation_id: res.data.conversation_id }));
            setMessages(prev => prev.map(m => m.id === tempId ? res.data.message : m));
            msgCountRef.current++;
            loadConversations();
          } else { setMessages(prev => prev.filter(m => m.id !== tempId)); }
        } catch { setMessages(prev => prev.filter(m => m.id !== tempId)); }
        finally { setUploading(null); }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordTime(0);
      recordTimerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000);
    } catch (err) {
      console.error('Mic access error:', err);
      alert('No se pudo acceder al micrófono. Verifica los permisos.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      recordChunksRef.current = [];
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    setRecordTime(0);
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
  };

  const totalUnread = conversations.reduce((s, c) => s + (parseInt(c.unread_count) || 0), 0);

  const createSupportTicket = async () => {
    if (!ticketTitle.trim()) return;
    try {
      const payload = {
        title: ticketTitle.trim(),
        category: ticketCategory,
        priority: 'normal',
        conversation_id: activeConv?.conversation_id || null
      };
      const res = await fetch(`${import.meta.env.VITE_API_URL}/support/tickets.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setTicketTitle('');
        setTicketCategory('general');
        loadSupportTickets();
      }
    } catch {
      // silent
    }
  };

  const avatar = (c) => {
    if (c?.other_avatar) return <img src={c.other_avatar} alt="" className="w-full h-full object-cover" />;
    return <span className="text-cyan-400 font-semibold text-sm">{(c?.other_name || '?')[0].toUpperCase()}</span>;
  };

  const lastMsgPreview = (conv) => {
    const prefix = conv.last_sender_id == currentUser.id ? 'Tú: ' : '';
    if (conv.last_message_type && conv.last_message_type !== 'text') {
      const labels = { image: '📷 Foto', video: '🎬 Video', audio: '🎵 Audio', file: '📄 Archivo' };
      return prefix + (labels[conv.last_message_type] || '📎 Archivo');
    }
    return prefix + (conv.last_message || '');
  };

  return (
    <div className="flex h-[calc(100vh-120px)] rounded-xl border border-cyan-500/10 bg-gradient-to-br from-[#040c1a] to-[#060f20] overflow-hidden">
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* ── Sidebar ── */}
      <div className={`${showSidebar ? 'flex' : 'hidden'} sm:flex flex-col w-full sm:w-80 lg:w-96 border-r border-cyan-500/10 bg-[#030b18]/60`}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-cyan-500/8">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-light text-white tracking-wide">Chat</h2>
            {totalUnread > 0 && <span className="rounded-full bg-cyan-400 px-1.5 py-0.5 text-[9px] text-[#030712] font-bold min-w-[18px] text-center">{totalUnread}</span>}
          </div>
          <button onClick={() => setShowNewChat(true)} className="rounded-full bg-cyan-500/10 p-2 text-cyan-400 hover:bg-cyan-500/20 transition-all hover:scale-105 active:scale-95" title="Nuevo chat">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {(() => {
            // Build unified list: users with conversations first (sorted by last message), then users without conversations
            const convUserIds = new Set(conversations.map(c => c.other_user_id));
            const onlineMap = {};
            allUsers.forEach(u => { onlineMap[u.id] = u.is_online; });
            const usersWithoutConv = allUsers.filter(u => !convUserIds.has(u.id));

            return (
              <>
                {/* Self chat button */}
                <button
                  onClick={() => startNewChat({ id: currentUser.id, full_name: currentUser.full_name || 'Tú', username: currentUser.username || 'yo' })}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-cyan-500/5 border-b border-cyan-500/8 ${
                    activeConv?.other_user_id === currentUser.id && !activeConv?.conversation_id ? 'bg-cyan-500/8 border-l-2 border-l-cyan-400' : 'border-l-2 border-l-transparent'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="h-11 w-11 rounded-full bg-gradient-to-br from-cyan-500/15 to-blue-600/10 border border-cyan-500/25 flex items-center justify-center overflow-hidden">
                      <span className="text-cyan-400 font-bold text-base">Tú</span>
                    </div>
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#040c1a] bg-cyan-500/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-cyan-400 truncate">Tú</p>
                    <p className="text-[10px] text-slate-600">@{currentUser.username}</p>
                  </div>
                </button>

                {/* Users with existing conversations */}
                {conversations.map(conv => {
                  const online = onlineMap[conv.other_user_id];
                  return (
                    <button key={'conv-' + conv.conversation_id} onClick={() => openConversation(conv)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-cyan-500/5 ${
                        activeConv?.conversation_id === conv.conversation_id ? 'bg-cyan-500/8 border-l-2 border-l-cyan-400' : 'border-l-2 border-l-transparent'
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="h-11 w-11 rounded-full bg-cyan-500/8 border border-cyan-500/15 flex items-center justify-center overflow-hidden">{avatar(conv)}</div>
                        {parseInt(conv.unread_count) > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-cyan-400 text-[9px] text-[#030712] font-bold flex items-center justify-center shadow-lg">{conv.unread_count}</span>
                        )}
                        {isAdmin && (
                          <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#040c1a] ${online ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm truncate ${parseInt(conv.unread_count) > 0 ? 'font-semibold text-white' : 'font-medium text-slate-300'}`}>{conv.other_name}</p>
                          <span className={`text-[10px] flex-shrink-0 ml-2 ${parseInt(conv.unread_count) > 0 ? 'text-cyan-400' : 'text-slate-600'}`}>{fmtTime(conv.last_message_time)}</span>
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${parseInt(conv.unread_count) > 0 ? 'text-slate-300 font-medium' : 'text-slate-600'}`}>{lastMsgPreview(conv)}</p>
                      </div>
                    </button>
                  );
                })}

                {/* Divider if there are users without conversations */}
                {usersWithoutConv.length > 0 && conversations.length > 0 && (
                  <div className="px-4 py-2 border-t border-cyan-500/5">
                    <p className="text-[10px] text-slate-700 uppercase tracking-wider">Otros usuarios</p>
                  </div>
                )}

                {/* Users without conversations */}
                {usersWithoutConv.map(u => {
                  const online = u.is_online;
                  return (
                    <button key={'user-' + u.id} onClick={() => startNewChat(u)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-cyan-500/5 ${
                        activeConv?.other_user_id === u.id && !activeConv?.conversation_id ? 'bg-cyan-500/8 border-l-2 border-l-cyan-400' : 'border-l-2 border-l-transparent'
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="h-11 w-11 rounded-full bg-cyan-500/8 border border-cyan-500/15 flex items-center justify-center overflow-hidden">
                          {u.profile_photo ? <img src={u.profile_photo} alt="" className="w-full h-full object-cover" /> : <span className="text-cyan-400 font-semibold text-sm">{(u.full_name || '?')[0].toUpperCase()}</span>}
                        </div>
                        {isAdmin && (
                          <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#040c1a] ${online ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-400 truncate">{u.full_name}</p>
                        <p className="text-[10px] text-slate-600">@{u.username}</p>
                      </div>
                    </button>
                  );
                })}

                {conversations.length === 0 && usersWithoutConv.length === 0 && (
                  <div className="p-8 text-center">
                    <p className="text-xs text-slate-700">Sin usuarios disponibles</p>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* ── Chat Area ── */}
      <div className={`${!showSidebar ? 'flex' : 'hidden'} sm:flex flex-col flex-1`}>
        {activeConv ? (
          <>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-cyan-500/8 bg-[#040c1a]/50 backdrop-blur-sm">
              <button onClick={() => setShowSidebar(true)} className="sm:hidden text-cyan-500/60 hover:text-cyan-400 p-1">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="h-10 w-10 rounded-full bg-cyan-500/8 border border-cyan-500/15 flex items-center justify-center overflow-hidden">{avatar(activeConv)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{activeConv.other_name}</p>
                <p className="text-[10px] text-slate-700">@{activeConv.other_username}</p>
              </div>
              <button onClick={() => setVideoCall(v => !v)} title={videoCall ? 'Cerrar videollamada' : 'Videollamada'}
                className={`rounded-full p-2 transition-all hover:scale-105 active:scale-95 ${videoCall ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'text-cyan-500/40 hover:text-cyan-400 hover:bg-cyan-500/10'}`}>
                {videoCall ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                )}
              </button>
              <button
                onClick={() => setShowSupport(true)}
                title="Soporte técnico"
                className="rounded-full p-2 text-amber-400/60 hover:text-amber-300 hover:bg-amber-500/10 transition-all"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-1.414 1.414m0 0A9 9 0 003 12v1m13.95-5.95A9 9 0 0121 12v1m-4.05-5.95L12 12m0 0v9m0-9L7.05 7.05" />
                </svg>
              </button>
            </div>

            {videoCall && <JitsiMeeting
              roomName={`bonifacios-${[currentUser.id, activeConv.other_user_id].sort((a,b)=>a-b).join('-')}`}
              displayName={currentUser.full_name || currentUser.username}
              onClose={() => setVideoCall(false)}
            />}

            <div ref={chatContainerRef} className={`flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-0.5 ${videoCall ? 'max-h-[30vh]' : ''}`} style={{ background: 'linear-gradient(180deg, rgba(4,12,26,0.4) 0%, rgba(4,12,26,0.1) 100%)' }}>
              {loadingMsgs && messages.length === 0 && (
                <div className="flex justify-center py-10">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full border border-cyan-500/20 border-t-cyan-400 animate-spin" />
                    <span className="text-xs text-slate-700">Cargando...</span>
                  </div>
                </div>
              )}
              {!loadingMsgs && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                  <div className="h-16 w-16 rounded-full bg-cyan-500/8 flex items-center justify-center mb-3">
                    <svg className="h-8 w-8 text-cyan-400/20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  </div>
                  <p className="text-sm text-slate-700">Inicia la conversación</p>
                </div>
              )}
              {messages.map(msg => <MessageBubble key={msg.id} msg={msg} isMine={msg.sender_id == currentUser.id} />)}
              <div ref={messagesEndRef} />
            </div>

            {uploading && (
              <div className="px-4 py-1.5 border-t border-cyan-500/5 bg-[#040c1a]/50 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full border border-cyan-500/10 border-t-cyan-400 animate-spin" />
                <span className="text-xs text-slate-500 truncate">Subiendo {uploading}...</span>
              </div>
            )}

            <div className="border-t border-cyan-500/8 bg-[#040c1a]/50 px-3 py-2.5">
              {recording ? (
                <div className="flex items-center gap-3">
                  <button onClick={cancelRecording} className="flex-shrink-0 rounded-full p-2 text-red-400 hover:bg-red-500/10 transition-all active:scale-90" title="Cancelar">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm text-red-400 font-medium">{fmtDur(recordTime)}</span>
                    <div className="flex-1 flex items-center gap-[2px] h-4">
                      {Array.from({ length: 20 }, (_, i) => (
                        <div key={i} className="flex-1 rounded-full bg-red-400/40 animate-pulse" style={{ height: `${4 + Math.random() * 12}px`, animationDelay: `${i * 50}ms` }} />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-700">Grabando...</span>
                  </div>
                  <button onClick={stopRecording} className="flex-shrink-0 rounded-full bg-cyan-400 p-2.5 text-[#030712] transition-all hover:scale-105 active:scale-95 shadow-lg" title="Enviar nota de voz">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <button onClick={() => fileInputRef.current?.click()} disabled={!!uploading}
                    className="flex-shrink-0 rounded-full p-2 text-cyan-500/40 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all active:scale-90 disabled:opacity-30">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                  </button>
                  <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" />
                  <textarea ref={textareaRef} value={text}
                    onChange={e => { setText(e.target.value); autoResize(); }}
                    onKeyDown={handleKeyDown}
                    placeholder="Mensaje..."
                    rows={1}
                    className="flex-1 resize-none rounded-2xl border border-cyan-500/10 bg-[#060d1f]/60 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-cyan-400/30 focus:bg-[#060d1f]/80 transition-all"
                    style={{ minHeight: '40px', maxHeight: '128px' }}
                  />
                  {text.trim() ? (
                    <button onClick={handleSend} disabled={sending || !!uploading}
                      className="flex-shrink-0 rounded-full bg-cyan-400 p-2.5 text-[#030712] transition-all hover:bg-cyan-300 hover:scale-105 active:scale-95 disabled:opacity-25 shadow-lg shadow-cyan-400/20">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                    </button>
                  ) : (
                    <button onClick={startRecording} disabled={!!uploading || sending}
                      className="flex-shrink-0 rounded-full bg-cyan-500/10 p-2.5 text-cyan-400 transition-all hover:bg-cyan-500/20 hover:scale-105 active:scale-95 disabled:opacity-25 shadow-lg" title="Grabar nota de voz">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-600/5 flex items-center justify-center mb-5">
              <svg className="h-10 w-10 text-cyan-400/20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
            <h3 className="text-xl font-light text-slate-600">Bonifacio's Chat</h3>
            <p className="text-xs text-slate-700 mt-2">Selecciona o inicia una conversación</p>
          </div>
        )}
      </div>

      {/* ── New Chat Modal ── */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.15s]" onClick={() => setShowNewChat(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#040c1a] to-[#060f20] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-cyan-500/10 flex items-center justify-between">
              <h3 className="text-base font-light text-white">Nueva Conversación</h3>
              <button onClick={() => setShowNewChat(false)} className="text-slate-500 hover:text-slate-200 transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto p-2">
              {users.map(u => (
                <button key={u.id} onClick={() => startNewChat(u)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-cyan-500/5 transition-all active:scale-[0.98]">
                  <div className="h-10 w-10 rounded-full bg-cyan-500/8 border border-cyan-500/15 flex items-center justify-center overflow-hidden">
                    {u.profile_photo ? <img src={u.profile_photo} alt="" className="w-full h-full object-cover" /> : <span className="text-cyan-400 font-semibold">{u.full_name[0].toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 font-medium">{u.full_name}</p>
                    <p className="text-[10px] text-slate-700">@{u.username} · {u.role}</p>
                  </div>
                  <svg className="h-4 w-4 text-cyan-500/20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {showSupport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowSupport(false)}>
          <div className="w-full max-w-xl rounded-2xl border border-amber-500/20 bg-gradient-to-br from-[#040c1a] to-[#060f20] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-amber-500/10 flex items-center justify-between">
              <h3 className="text-base font-light text-white">Tickets de soporte</h3>
              <button onClick={() => setShowSupport(false)} className="text-slate-500 hover:text-slate-200 transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 border-b border-amber-500/10">
              <div className="flex gap-2">
                <input
                  value={ticketTitle}
                  onChange={(e) => setTicketTitle(e.target.value)}
                  placeholder="Describe el problema técnico..."
                  className="flex-1 rounded-xl border border-slate-700/60 bg-[#030b18] px-3 py-2 text-sm text-slate-200"
                />
                <select value={ticketCategory} onChange={(e) => setTicketCategory(e.target.value)} className="rounded-xl border border-slate-700/60 bg-[#030b18] px-2 py-2 text-xs text-slate-200">
                  <option value="general">General</option>
                  <option value="sistema">Sistema</option>
                  <option value="pagos">Pagos</option>
                  <option value="reservaciones">Reservaciones</option>
                </select>
                <button onClick={createSupportTicket} className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  Crear
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto p-3 space-y-2">
              {supportTickets.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-6">Sin tickets registrados</p>
              ) : supportTickets.map((t) => (
                <div key={t.id} className="rounded-xl border border-slate-700/50 bg-[#030b18]/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-200">{t.title}</p>
                    <span className="text-[10px] text-amber-300/80 uppercase">{t.status}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">{t.creator_name || 'Usuario'} · {fmtFull(t.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Messages;
