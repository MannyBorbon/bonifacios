import { useState, useEffect, useCallback, useRef } from 'react'
import { Mic, MicOff, Video, VideoOff } from 'lucide-react'
import { meetingsAPI } from '../../services/api'

export default function GroupCallWebRTC({ meetingId, currentUserId, participants, mode = 'video', onClose, meetingTitle = 'Reunion en vivo' }) {
  const [localStream, setLocalStream] = useState(null)
  const [remoteStreams, setRemoteStreams] = useState(() => new Map())
  const [audioMuted, setAudioMuted] = useState(false)
  const [videoMuted, setVideoMuted] = useState(mode === 'audio')
  const [status, setStatus] = useState('connecting')
  const [errorMsg, setErrorMsg] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  const pcsRef = useRef(new Map())
  const localStreamRef = useRef(null)
  const iceServersRef = useRef([{ urls: 'stun:stun.l.google.com:19302' }])
  const knownPeersRef = useRef(new Set())
  const localVideoElRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const createPeerConnection = useCallback((remoteUserId) => {
    if (pcsRef.current.has(remoteUserId)) return pcsRef.current.get(remoteUserId)
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current })
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current))
    }
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) meetingsAPI.sendSignal({ meeting_id: parseInt(meetingId), to_user_id: remoteUserId, signal_type: 'ice', payload: JSON.stringify(candidate) }).catch(() => {})
    }
    pc.ontrack = ({ streams }) => {
      if (streams?.[0]) setRemoteStreams(prev => new Map(prev).set(remoteUserId, streams[0]))
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') try { pc.restartIce() } catch { /* intentional */ }
    }
    pcsRef.current.set(remoteUserId, pc)
    knownPeersRef.current.add(remoteUserId)
    return pc
  }, [meetingId])

  const createOffer = useCallback(async (remoteUserId) => {
    try {
      const pc = createPeerConnection(remoteUserId)
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await meetingsAPI.sendSignal({ meeting_id: parseInt(meetingId), to_user_id: remoteUserId, signal_type: 'offer', payload: JSON.stringify(offer) })
    } catch (err) { console.error('[WebRTC] offer error:', err) }
  }, [meetingId, createPeerConnection])

  const poll = useCallback(async () => {
    try {
      const res = await meetingsAPI.pollSignals(parseInt(meetingId))
      for (const sig of (res.data?.signals || [])) {
        const uid = parseInt(sig.from_user_id)
        let data
        try { data = JSON.parse(sig.payload) } catch { continue }
        if (sig.signal_type === 'offer') {
          const pc = pcsRef.current.get(uid) || createPeerConnection(uid)
          try {
            if (pc.signalingState !== 'stable') continue
            await pc.setRemoteDescription(new RTCSessionDescription(data))
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            await meetingsAPI.sendSignal({ meeting_id: parseInt(meetingId), to_user_id: uid, signal_type: 'answer', payload: JSON.stringify(answer) })
          } catch (err) { console.error('[WebRTC] offer handling:', err) }
        } else if (sig.signal_type === 'answer') {
          const pc = pcsRef.current.get(uid)
          if (pc?.signalingState === 'have-local-offer') try { await pc.setRemoteDescription(new RTCSessionDescription(data)) } catch { /* intentional */ }
        } else if (sig.signal_type === 'ice') {
          const pc = pcsRef.current.get(uid)
          if (pc?.remoteDescription) try { await pc.addIceCandidate(new RTCIceCandidate(data)) } catch { /* intentional */ }
        }
      }
    } catch { /* ignore poll errors */ }
  }, [meetingId, createPeerConnection])

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      try {
        const iceRes = await meetingsAPI.getIceServers()
        if (!cancelled && Array.isArray(iceRes.data?.iceServers)) iceServersRef.current = iceRes.data.iceServers
      } catch { /* use default STUN */ }
      const getMediaWithFallback = async () => {
        const attempts = mode !== 'audio' ? [
          { audio: { echoCancellation: true, noiseSuppression: true }, video: { width: { ideal: 1280 }, height: { ideal: 720 } } },
          { audio: { echoCancellation: true, noiseSuppression: true }, video: true },
          { audio: true, video: false },
        ] : [
          { audio: { echoCancellation: true, noiseSuppression: true }, video: false },
          { audio: true, video: false },
        ]
        let lastErr = null
        for (const constraints of attempts) {
          try {
            return await navigator.mediaDevices.getUserMedia(constraints)
          } catch (err) {
            lastErr = err
            if (err.name === 'NotAllowedError') throw err
          }
        }
        throw lastErr
      }
      try {
        const stream = await getMediaWithFallback()
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        localStreamRef.current = stream
        setLocalStream(stream)
        setStatus('ready')
      } catch (err) {
        if (!cancelled) {
          setStatus('error')
          const msg = err.name === 'NotAllowedError'
            ? 'Permiso denegado. Habilita la cámara y el micrófono en la barra del navegador y recarga.'
            : err.name === 'NotFoundError'
              ? 'No se encontró la cámara o micrófono. Verifica que estén conectados y que Windows tenga permisos de privacidad activados (Configuración → Privacidad → Cámara / Micrófono).'
              : err.name === 'NotReadableError'
                ? 'El dispositivo está siendo usado por otra aplicación. Cierra otras apps que usen la cámara y recarga.'
                : `Error al acceder a dispositivos: ${err.message}`
          setErrorMsg(msg)
        }
      }
    }
    init()
    return () => {
      cancelled = true
      localStreamRef.current?.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
      pcsRef.current.forEach(pc => { try { pc.close() } catch { /* intentional */ } })
      pcsRef.current.clear()
      knownPeersRef.current.clear()
      meetingsAPI.cleanupSignals(parseInt(meetingId)).catch(() => {})
    }
  }, [meetingId, mode, retryKey])

  useEffect(() => {
    if (localVideoElRef.current && localStream) localVideoElRef.current.srcObject = localStream
  }, [localStream])

  useEffect(() => {
    if (!localStream) return
    poll()
    const id = setInterval(poll, 1500)
    return () => clearInterval(id)
  }, [localStream, poll])

  useEffect(() => {
    if (!localStream) return
    participants.forEach(p => {
      const uid = parseInt(p.user_id)
      if (uid === currentUserId || knownPeersRef.current.has(uid)) return
      if (currentUserId > uid) createOffer(uid)
      else createPeerConnection(uid)
    })
    pcsRef.current.forEach((pc, uid) => {
      if (!participants.find(p => parseInt(p.user_id) === uid)) {
        try { pc.close() } catch { /* intentional */ }
        pcsRef.current.delete(uid)
        knownPeersRef.current.delete(uid)
        setRemoteStreams(prev => { const n = new Map(prev); n.delete(uid); return n })
      }
    })
  }, [participants, localStream, currentUserId, createOffer, createPeerConnection])

  const localVideoRef = useCallback((el) => {
    localVideoElRef.current = el
    if (el && localStreamRef.current) el.srcObject = localStreamRef.current
  }, [])

  const toggleAudio = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
    setAudioMuted(p => !p)
  }

  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
    setVideoMuted(p => !p)
  }

  if (status === 'error') return (
    <div className="overflow-hidden rounded-2xl border border-rose-500/20 bg-[#0d0607] p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20 mx-auto mb-3">
        <MicOff className="h-5 w-5 text-rose-400" />
      </div>
      <p className="text-sm text-rose-300 font-medium mb-2">Sin acceso a cámara / micrófono</p>
      <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed mb-5">{errorMsg}</p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
        <button
          onClick={() => { setStatus('connecting'); setErrorMsg(''); setRetryKey(k => k + 1) }}
          className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-3 sm:px-4 sm:py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 active:bg-cyan-500/25 transition-colors touch-manipulation min-h-[44px]"
        >Reintentar</button>
        <button onClick={() => onCloseRef.current?.()} className="rounded-xl border border-slate-600/40 bg-slate-800/50 px-5 py-3 sm:px-4 sm:py-2 text-xs text-slate-300 hover:bg-slate-700/50 active:bg-slate-700/60 transition-colors touch-manipulation min-h-[44px]">Cerrar</button>
      </div>
    </div>
  )

  const remoteArr = [...remoteStreams.entries()]

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#061018] via-[#040c14] to-[#020910] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] ring-1 ring-cyan-500/[0.08]">

      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.05] px-3 py-2">
        <div className="inline-flex items-center gap-2 text-[10px] text-cyan-100/90">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${remoteArr.length === 0 ? 'animate-pulse bg-amber-400' : 'bg-emerald-400'}`} />
          {status === 'connecting' ? 'Iniciando...' : remoteArr.length > 0 ? `Conectado · ${remoteArr.length + 1} participantes` : 'Esperando participantes...'}
        </div>
        <span className="ml-2 max-w-[45%] truncate text-[10px] font-medium text-slate-400">{meetingTitle}</span>
      </div>

      {/* ── Video area ── */}
      <div className="relative min-h-[200px] flex-1 bg-black/20" style={{ height: 'clamp(200px, 44svh, 520px)' }}>
        {remoteArr.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4">
            {mode !== 'audio' ? (
              <div className="relative h-32 w-44 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 sm:h-48 sm:w-64">
                <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                <div className="absolute bottom-1 left-1 rounded bg-black/50 px-1 text-[9px] text-white/70">T&#250;</div>
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
                <Mic className="h-7 w-7 text-slate-400" />
              </div>
            )}
            <p className="text-center text-xs text-slate-500">Esperando que otros participantes se unan...</p>
            {mode !== 'audio' && !videoMuted && (
              <p className="text-center text-[10px] text-slate-600 max-w-xs leading-relaxed">
                ¿Pantalla negra? Ve a <strong className="text-slate-500">Configuración de Windows → Privacidad → Cámara</strong> y activa el acceso para el navegador.
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Remote grid — 1 col on mobile, 2 col on sm+ when >1 peer */}
            <div className={`h-full w-full p-1.5 grid gap-1.5 ${
              remoteArr.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
            }`}>
              {remoteArr.map(([uid, stream]) => {
                const peer = participants.find(p => parseInt(p.user_id) === uid)
                return (
                  <div key={uid} className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-slate-900">
                    <video ref={el => { if (el && el.srcObject !== stream) el.srcObject = stream }} autoPlay playsInline className="h-full w-full object-cover" />
                    {peer && <div className="absolute bottom-1 left-1 rounded bg-black/55 px-1.5 py-0.5 text-[9px] text-white/80">{peer.full_name || peer.username || `Usuario ${uid}`}</div>}
                  </div>
                )
              })}
            </div>
            {/* Local PiP — top-right corner so it never overlaps controls */}
            {mode !== 'audio' && (
              <div className="absolute right-2 top-2 z-[3] aspect-[3/4] w-[18%] max-w-[80px] overflow-hidden rounded-xl border border-white/20 bg-slate-900 shadow-lg sm:aspect-video sm:max-w-[110px]">
                <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                <div className="absolute bottom-0.5 left-0.5 rounded bg-black/50 px-1 text-[8px] text-white/70">T&#250;</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Controls — block element, never overlaps video ── */}
      <div className="flex shrink-0 items-center justify-center gap-2.5 sm:gap-2 border-t border-white/[0.05] bg-[#020810]/80 px-3 py-3 sm:py-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-2.5">
        <button type="button" onClick={toggleAudio}
          className={`flex min-w-[56px] sm:min-w-[52px] flex-col items-center gap-0.5 rounded-xl px-3 py-2.5 sm:py-2 text-[10px] font-medium transition-colors touch-manipulation min-h-[48px] sm:min-h-0 ${audioMuted ? 'bg-rose-500/22 text-rose-200' : 'bg-slate-700/45 text-slate-100 hover:bg-slate-600/55 active:bg-slate-600/70'}`}>
          {audioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          {audioMuted ? 'MIC-OFF' : 'MIC'}
        </button>
        {mode !== 'audio' && (
          <button type="button" onClick={toggleVideo}
            className={`flex min-w-[56px] sm:min-w-[52px] flex-col items-center gap-0.5 rounded-xl px-3 py-2.5 sm:py-2 text-[10px] font-medium transition-colors touch-manipulation min-h-[48px] sm:min-h-0 ${videoMuted ? 'bg-rose-500/22 text-rose-200' : 'bg-slate-700/45 text-slate-100 hover:bg-slate-600/55 active:bg-slate-600/70'}`}>
            {videoMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            {videoMuted ? 'CAM-OFF' : 'CAM'}
          </button>
        )}
        <button type="button" onClick={() => onCloseRef.current?.()}
          className="flex min-w-[56px] sm:min-w-[52px] flex-col items-center gap-0.5 rounded-xl bg-rose-600/85 px-3 py-2.5 sm:py-2 text-[10px] font-medium text-rose-50 transition-colors hover:bg-rose-500 active:bg-rose-400 touch-manipulation min-h-[48px] sm:min-h-0">
          <span className="text-base leading-none">✕</span>
          Salir
        </button>
      </div>
    </div>
  )
}
