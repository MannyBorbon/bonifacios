import { useState, useEffect, useCallback, useRef, useId, useMemo } from 'react'
import { Info } from 'lucide-react'

/**
 * Selector estilo reloj con bisel giratorio + cristal central clicable.
 * - Arrastre solo en el anillo (bisel), como relojes con corona / bisel táctil
 * - Clic en el cristal central: onCenterPress(módulo) si existe; si no, onSelect(módulo)
 * - Chips perimetrales siguen siendo atajos directos
 * - Actualizaciones de ángulo coalescidas con requestAnimationFrame durante el arrastre
 * - “Fling” corto al soltar según velocidad angular (omitido con prefers-reduced-motion)
 * - Snap con transición premium (CSS spring) cuando no hay arrastre ni fling
 * - Ángulo desde el centro del instrumento (size×size), alineado con chips perimetrales
 * - Zona muerta en el centro: evita saltos de ángulo cuando el dedo está sobre el pivote
 * - Sector resalta la ranura activa o la vista previa bajo gesto (vista fija si prefers-reduced-motion)
 */

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const fn = () => setReduced(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return reduced
}

function normalizeDeg(a) {
  let x = a % 360
  if (x < 0) x += 360
  return x
}

/** Diferencia más corta entre dos ángulos normalizados [0,360), en [-180, 180]. */
function shortestAngleDelta(fromNorm, toNorm) {
  let d = toNorm - fromNorm
  if (d > 180) d -= 360
  if (d < -180) d += 360
  return d
}

export default function CircularSelector({
  options,
  selected,
  onSelect,
  size = 320,
  onCenterPress,
  pendingByKey = {},
}) {
  const uid = useId().replace(/:/g, '')
  const reducedMotion = usePrefersReducedMotion()
  const [rotation, setRotation] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isFlinging, setIsFlinging] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [hoveredBezel, setHoveredBezel] = useState(false)
  const [containerWidth, setContainerWidth] = useState(size)
  const hoveredBezelSyncRef = useRef(false)
  const containerRef = useRef(null)
  /** Centro del disco completo (size×size); mismo pivote que chips y bisel. */
  const instrumentRef = useRef(null)
  const dragRotationRef = useRef(0)
  /** Ángulo del puntero al inicio del gesto menos rotación actual (sincrónico; evita race con primer pointermove). */
  const startAngleRef = useRef(0)
  /** Clave seleccionada al iniciar arrastre (feedback háptico al soltar si cambió). */
  const dragStartKeyRef = useRef(null)
  const dragRafRef = useRef(null)
  const pendingDragRotationRef = useRef(null)
  /** Muestras { t, rotNorm } para velocidad al soltar (máx. 6). */
  const velocitySamplesRef = useRef([])
  const flingRafRef = useRef(null)
  /** Sincronizado con `isDragging` para `lostpointercapture` sin doble cierre. */
  const isDraggingRef = useRef(false)
  /** `pointerId` activo tras setPointerCapture. */
  const activePointerIdRef = useRef(null)
  /** Último ángulo estable (evita ruido con el puntero exactamente en el centro). */
  const lastStableAngleRef = useRef(0)

  const optionsArray = useMemo(() => Object.entries(options), [options])
  const angleStep = 360 / optionsArray.length
  const selectedIndex = optionsArray.findIndex(([key]) => key === selected)
  const targetRotation = selectedIndex >= 0 ? selectedIndex * angleStep : 0
  const dialSize = useMemo(
    () => Math.max(220, Math.min(size, containerWidth || size)),
    [size, containerWidth]
  )
  const compactMode = dialSize <= 340

  useEffect(() => {
    const node = containerRef.current
    if (!node || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      setContainerWidth(Math.floor(entry.contentRect.width))
    })
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  /* Alinear perilla con `selected` externo cuando no hay gesto local (arrastre / fling). */
  useEffect(() => {
    if (isDragging || isFlinging) return
    /* Sincronización intencionada con prop controlada; alternativa sería elevar estado al padre. */
    // eslint-disable-next-line react-hooks/set-state-in-effect -- alinear rotación con `selected` tras clic/drag en chips y bisel
    setRotation(targetRotation)
    dragRotationRef.current = targetRotation
    lastStableAngleRef.current = targetRotation
  }, [targetRotation, isDragging, isFlinging])

  useEffect(
    () => () => {
      if (dragRafRef.current != null) cancelAnimationFrame(dragRafRef.current)
      if (flingRafRef.current != null) cancelAnimationFrame(flingRafRef.current)
    },
    []
  )

  /** Puntero en el anillo entre el cristal central y el borde (bisel). */
  const isPointOnBezel = useCallback(
    (clientX, clientY) => {
      const el = instrumentRef.current
      if (!el) return false
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const d = Math.hypot(clientX - cx, clientY - cy)
      const scale = rect.width / dialSize
      const innerPx = dialSize * (compactMode ? 0.42 : 0.4) * 0.5 * scale + (compactMode ? 8 : 10)
      const outerPx = rect.width / 2 - 8
      return d >= innerPx && d <= outerPx
    },
    [dialSize, compactMode]
  )

  const getAngle = useCallback((clientX, clientY) => {
    const el = instrumentRef.current
    if (!el) return lastStableAngleRef.current
    const rect = el.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    let dx = clientX - centerX
    let dy = clientY - centerY
    const dist = Math.hypot(dx, dy)
    const minR = rect.width * 0.056
    if (dist < 0.75) {
      return lastStableAngleRef.current
    }
    if (dist < minR) {
      const s = minR / dist
      dx *= s
      dy *= s
    }
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)
    const out = normalizeDeg(angle + 90)
    lastStableAngleRef.current = out
    return out
  }, [])

  const snapToNearest = useCallback(
    (deg) => {
      const n = optionsArray.length
      if (!n) return deg
      const normalized = normalizeDeg(deg)
      const idx = Math.round(normalized / angleStep) % n
      return idx * angleStep
    },
    [angleStep, optionsArray.length]
  )

  const applyRotationVisualOnly = useCallback((deg) => {
    const normalized = normalizeDeg(deg)
    setRotation(normalized)
    dragRotationRef.current = normalized
  }, [])

  const applyRotationAndSelect = useCallback(
    (deg) => {
      const n = optionsArray.length
      if (!n) return
      const normalized = normalizeDeg(deg)
      setRotation(normalized)
      dragRotationRef.current = normalized
      const idx = Math.round(normalized / angleStep) % n
      const [key] = optionsArray[idx]
      if (key !== selected) onSelect(key)
    },
    [angleStep, optionsArray, onSelect, selected]
  )

  const finalizeSnap = useCallback(
    (fromDeg, opts = { haptic: true }) => {
      const snapped = snapToNearest(fromDeg)
      setRotation(snapped)
      dragRotationRef.current = snapped
      const n = optionsArray.length
      const idx = Math.round(normalizeDeg(snapped) / angleStep) % n
      const [key] = optionsArray[idx]
      if (key !== selected) onSelect(key)
      const started = dragStartKeyRef.current
      dragStartKeyRef.current = null
      if (
        opts.haptic &&
        started != null &&
        key !== started &&
        typeof navigator !== 'undefined' &&
        typeof navigator.vibrate === 'function'
      ) {
        navigator.vibrate(10)
      }
      return snapped
    },
    [angleStep, optionsArray, selected, onSelect, snapToNearest]
  )

  const flushPendingDragRotation = useCallback(() => {
    dragRafRef.current = null
    const deg = pendingDragRotationRef.current
    pendingDragRotationRef.current = null
    if (deg == null) return
    applyRotationAndSelect(deg)
  }, [applyRotationAndSelect])

  const scheduleDragRotation = useCallback(
    (deg) => {
      pendingDragRotationRef.current = deg
      if (dragRafRef.current != null) return
      dragRafRef.current = requestAnimationFrame(flushPendingDragRotation)
    },
    [flushPendingDragRotation]
  )

  const pushVelocitySample = useCallback((rotNorm) => {
    const t = performance.now()
    const arr = velocitySamplesRef.current
    arr.push({ t, rot: normalizeDeg(rotNorm) })
    while (arr.length > 6) arr.shift()
  }, [])

  const endDragOrFling = useCallback(() => {
    if (dragRafRef.current != null) {
      cancelAnimationFrame(dragRafRef.current)
      dragRafRef.current = null
    }
    flushPendingDragRotation()

    isDraggingRef.current = false
    setIsDragging(false)

    const samples = velocitySamplesRef.current
    velocitySamplesRef.current = []

    let degPerMs = 0
    if (samples.length >= 2 && !reducedMotion) {
      const a = samples[samples.length - 1]
      const b = samples[samples.length - 2]
      const dt = a.t - b.t
      if (dt > 2 && dt < 90) {
        const d = shortestAngleDelta(b.rot, a.rot)
        degPerMs = d / dt
      }
    }

    const FLING_MIN = 0.28
    const FRICTION = 0.9
    const MIN_V = 0.055
    const MAX_STEPS = 40

    if (!reducedMotion && Math.abs(degPerMs) > FLING_MIN) {
      setIsFlinging(true)
      let v = degPerMs * 14
      let r = dragRotationRef.current
      let steps = 0

      const tick = () => {
        flingRafRef.current = null
        r = normalizeDeg(r + v)
        v *= FRICTION
        applyRotationVisualOnly(r)
        steps += 1
        if (Math.abs(v) < MIN_V || steps >= MAX_STEPS) {
          finalizeSnap(r, { haptic: true })
          setIsFlinging(false)
          return
        }
        flingRafRef.current = requestAnimationFrame(tick)
      }
      flingRafRef.current = requestAnimationFrame(tick)
      return
    }

    finalizeSnap(dragRotationRef.current, { haptic: true })
  }, [reducedMotion, flushPendingDragRotation, finalizeSnap, applyRotationVisualOnly])

  const onInstrumentPointerMove = useCallback(
    (e) => {
      if (!instrumentRef.current) return
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
      const currentAngle = getAngle(e.clientX, e.clientY)
      const newRotation = normalizeDeg(currentAngle - startAngleRef.current)
      pushVelocitySample(newRotation)
      scheduleDragRotation(newRotation)
    },
    [getAngle, pushVelocitySample, scheduleDragRotation]
  )

  const onInstrumentPointerUp = useCallback(
    (e) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
      isDraggingRef.current = false
      activePointerIdRef.current = null
      e.currentTarget.releasePointerCapture(e.pointerId)
      endDragOrFling()
    },
    [endDragOrFling]
  )

  const onInstrumentLostPointerCapture = useCallback(() => {
    activePointerIdRef.current = null
    if (isDraggingRef.current) {
      endDragOrFling()
    }
  }, [endDragOrFling])

  const onInstrumentPointerDown = useCallback(
    (e) => {
      const el = e.target
      if (!(el instanceof Element)) return
      if (el.closest('[data-circular-chip]')) return
      if (el.closest('[data-circular-center-action]')) return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if (!isPointOnBezel(e.clientX, e.clientY)) return

      if (flingRafRef.current != null) {
        cancelAnimationFrame(flingRafRef.current)
        flingRafRef.current = null
      }
      if (isFlinging) {
        setIsFlinging(false)
        finalizeSnap(dragRotationRef.current, { haptic: false })
      }

      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      activePointerIdRef.current = e.pointerId
      dragStartKeyRef.current = selected
      isDraggingRef.current = true
      setIsDragging(true)
      velocitySamplesRef.current = []
      const a = getAngle(e.clientX, e.clientY)
      startAngleRef.current = a - dragRotationRef.current
      pushVelocitySample(dragRotationRef.current)
    },
    [getAngle, selected, pushVelocitySample, isFlinging, finalizeSnap, isPointOnBezel]
  )

  const centerSize = dialSize * (compactMode ? 0.5 : 0.42)
  const selectedLabel = options[selected]?.label ?? ''

  /** Durante arrastre o fling el centro sigue el ángulo; con reduced-motion solo el `selected` confirmado. */
  const centerDisplayKey = useMemo(() => {
    if (reducedMotion || (!isFlinging && !isDragging)) return selected
    const n = optionsArray.length
    if (!n) return selected
    const idx = Math.round(normalizeDeg(rotation) / angleStep) % n
    return optionsArray[idx][0]
  }, [reducedMotion, isFlinging, isDragging, rotation, angleStep, optionsArray, selected])

  const tickHighlightIndex = useMemo(() => {
    const n = optionsArray.length
    if (!n) return 0
    const livePreview = !reducedMotion && (isDragging || isFlinging)
    if (livePreview) {
      return Math.round(normalizeDeg(rotation) / angleStep) % n
    }
    return selectedIndex >= 0 ? selectedIndex : 0
  }, [reducedMotion, isDragging, isFlinging, rotation, angleStep, optionsArray.length, selectedIndex])

  const centerDisplayLabel = options[centerDisplayKey]?.label ?? selectedLabel
  const centerMetric = useMemo(() => {
    const fromMap = pendingByKey?.[centerDisplayKey]
    if (fromMap && typeof fromMap === 'object' && !Array.isArray(fromMap)) {
      const label = typeof fromMap.label === 'string' ? fromMap.label.trim() : ''
      const value = fromMap.value
      if (value == null || value === '') return null
      return {
        label: label || 'Pendientes',
        value: typeof value === 'number' ? (Number.isFinite(value) ? value : null) : String(value),
      }
    }
    if (typeof fromMap === 'number' && Number.isFinite(fromMap)) {
      return { label: 'Pendientes', value: fromMap }
    }
    if (typeof fromMap === 'string' && fromMap.trim()) {
      return { label: 'Pendientes', value: fromMap.trim() }
    }
    const fromOption = options?.[centerDisplayKey]?.pending
    if (typeof fromOption === 'number' && Number.isFinite(fromOption)) {
      return { label: 'Pendientes', value: fromOption }
    }
    return null
  }, [pendingByKey, centerDisplayKey, options])
  const handleCenterAction = useCallback(() => {
    const key = centerDisplayKey
    if (onCenterPress) onCenterPress(key)
    else onSelect(key)
  }, [onCenterPress, onSelect, centerDisplayKey])
  const previewIndex = useMemo(() => {
    const n = optionsArray.length
    if (!n) return 0
    return Math.round(normalizeDeg(rotation) / angleStep) % n
  }, [rotation, angleStep, optionsArray.length])
  const activeRingIndex = reducedMotion ? selectedIndex : isDragging || isFlinging ? previewIndex : selectedIndex
  const optionCount = optionsArray.length
  const centerLabelLength = centerDisplayLabel.length
  const mobileCenterLabelClass =
    centerLabelLength > 16
      ? 'line-clamp-2 min-h-[2.5rem] max-w-[8.5rem] px-1 text-[9px] leading-[1.15] whitespace-normal break-words'
      : centerLabelLength > 12
        ? 'line-clamp-2 min-h-[2.4rem] max-w-[8.7rem] px-1 text-[9.5px] leading-[1.15] whitespace-normal break-words'
        : 'line-clamp-2 min-h-[2.2rem] max-w-[8.9rem] px-1 text-[10.5px] leading-[1.18] whitespace-normal break-words'

  /* Sector “premium”: sigue la ranura activa o la vista previa bajo gesto. */
  const sectorStyle = useMemo(() => {
    const idx = isDragging || isFlinging ? tickHighlightIndex : selectedIndex >= 0 ? selectedIndex : 0
    const start = -90 + idx * angleStep - angleStep / 2
    const end = angleStep
    return {
      background: [
        `conic-gradient(from ${start}deg, rgba(191,219,254,0.22) 0deg, rgba(148,163,184,0.08) ${end * 0.55}deg, rgba(30,41,59,0.04) ${end}deg, transparent ${end}deg)`,
        'radial-gradient(ellipse at center, rgba(255,255,255,0.08) 0%, transparent 64%)',
      ].join(', '),
    }
  }, [selectedIndex, tickHighlightIndex, isDragging, isFlinging, angleStep])

  const ringTransition =
    reducedMotion || isDragging || isFlinging
      ? 'none'
      : 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)'
  const sheenTransition = reducedMotion ? 'none' : 'transform 0.75s cubic-bezier(0.22, 1, 0.36, 1)'
  const motionIntensity = isDragging || isFlinging ? 1 : 0
  const rotationNorm = normalizeDeg(rotation)
  const lightAngle = rotationNorm * 1.35
  const haloOpacity = isDragging || isFlinging ? 0.9 : 0.65

  if (!optionsArray.length) {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 rounded-2xl border border-amber-500/25 bg-slate-900/50 px-6 py-8 text-center shadow-inner"
      >
        <Info className="h-8 w-8 text-amber-400/80" aria-hidden strokeWidth={1.5} />
        <p className="max-w-sm text-sm font-medium text-slate-200">Sin módulos para mostrar</p>
        <p className="max-w-sm text-xs leading-relaxed text-slate-400">
          Añade entradas al mapa de opciones para activar la navegación circular.
        </p>
      </div>
    )
  }

  const sliderHelpFull =
    'Gire el bisel exterior del reloj, en el anillo entre el borde y el cristal central, para elegir el módulo. Evite las tarjetas perimetrales y el cristal central al girar. Pulse el cristal central para abrir el módulo mostrado.'

  return (
    <section
      ref={containerRef}
      className="relative flex w-full flex-col items-center py-4 sm:py-6"
      aria-label="Selector de módulos"
    >
      <p id={`${uid}-slider-help`} className="sr-only">
        {sliderHelpFull}
      </p>
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(148,163,184,0.09)_0%,rgba(51,65,85,0.05)_34%,transparent_72%)] opacity-95"
        style={{ width: `${dialSize * 1.18}px`, height: `${dialSize * 1.08}px` }}
        aria-hidden
      />

      <div
        ref={instrumentRef}
        className={`relative z-[1] select-none rounded-full outline-none motion-safe:transition-shadow motion-safe:duration-300 ${
          isDragging
            ? 'cursor-grabbing shadow-[0_0_0_1px_rgba(148,163,184,0.34),0_22px_58px_-26px_rgba(15,23,42,0.75)]'
            : hoveredBezel
              ? 'cursor-grab'
              : ''
        } ${isHovering && !isDragging ? 'shadow-[0_28px_72px_-26px_rgba(15,23,42,0.8)]' : ''} focus-within:shadow-[0_0_0_1px_rgba(148,163,184,0.26),0_0_28px_-18px_rgba(71,85,105,0.45)]`}
        style={{ width: `${dialSize}px`, height: `${dialSize}px`, touchAction: 'none', contain: 'layout' }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          setIsHovering(false)
          hoveredBezelSyncRef.current = false
          setHoveredBezel(false)
        }}
        onMouseMove={(e) => {
          if (!instrumentRef.current) return
          const on = isPointOnBezel(e.clientX, e.clientY)
          if (hoveredBezelSyncRef.current !== on) {
            hoveredBezelSyncRef.current = on
            setHoveredBezel(on)
          }
        }}
        onPointerDown={onInstrumentPointerDown}
        onPointerMove={onInstrumentPointerMove}
        onPointerUp={onInstrumentPointerUp}
        onPointerCancel={onInstrumentPointerUp}
        onLostPointerCapture={onInstrumentLostPointerCapture}
        role="group"
        aria-label={`Selector circular. Módulo en pantalla: ${centerDisplayLabel}.`}
      >
        {isDragging && (
          <div
            className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_50%_40%,rgba(148,163,184,0.12),rgba(51,65,85,0.08)_40%,transparent_68%)] motion-safe:transition-opacity motion-safe:duration-200"
            aria-hidden
          />
        )}
        {/* Base visual 3D con CSS + rotacion por gesto */}
        <div className="absolute inset-0 rounded-full shadow-[0_26px_90px_-24px_rgba(0,0,0,0.92)]" aria-hidden>
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#182232] via-[#0c1321] to-[#070b14]" />
          <div
            className="absolute inset-0 rounded-full"
            style={{
              backgroundImage: [
                'repeating-radial-gradient(circle at center, rgba(255,255,255,0.022) 0 1.2px, rgba(0,0,0,0) 1.2px 3.2px)',
                'repeating-conic-gradient(from 0deg, rgba(148,163,184,0.028) 0deg 0.9deg, rgba(2,6,23,0) 0.9deg 3.2deg)',
              ].join(', '),
              opacity: 0.6,
              mixBlendMode: 'soft-light',
            }}
          />
          <div
            className="absolute inset-0 rounded-full"
            style={{
              backgroundImage: `conic-gradient(from ${lightAngle}deg, rgba(255,255,255,0.12) 0deg, rgba(148,163,184,0.03) 54deg, rgba(2,6,23,0.0) 128deg, rgba(255,255,255,0.08) 220deg, rgba(2,6,23,0) 360deg)`,
              mixBlendMode: 'screen',
              opacity: 0.8,
            }}
          />
          <div className="absolute inset-[3.5%] rounded-full border border-slate-200/12 bg-gradient-to-b from-slate-200/8 via-transparent to-black/40" />
          <div
            className="absolute inset-[7.5%] rounded-full border border-slate-300/15"
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              transition: ringTransition,
              backgroundImage: [
                'conic-gradient(from 0deg, rgba(226,232,240,0.18), rgba(30,41,59,0.78) 32%, rgba(148,163,184,0.14) 58%, rgba(15,23,42,0.84) 100%)',
                'repeating-conic-gradient(from 0deg, rgba(255,255,255,0.09) 0deg 0.8deg, rgba(2,6,23,0.0) 0.8deg 7deg)',
                'radial-gradient(circle at 50% 8%, rgba(255,255,255,0.2), transparent 46%)',
              ].join(', '),
            }}
          />
          <div className="absolute inset-[12.5%] rounded-full border border-violet-300/35 shadow-[0_0_24px_-10px_rgba(167,139,250,0.85)]" />
          <div
            className="absolute inset-[12.5%] rounded-full border border-violet-200/20"
            style={{
              opacity: 0.5 + motionIntensity * 0.25,
              boxShadow: `0 0 ${14 + motionIntensity * 12}px -6px rgba(167,139,250,${0.45 + motionIntensity * 0.35})`,
            }}
          />
          <div className="absolute inset-[17%] rounded-full border border-slate-400/20 bg-gradient-to-b from-slate-300/8 to-transparent" />
          <div
            className="absolute inset-[18.5%] rounded-full"
            style={{
              backgroundImage:
                'repeating-conic-gradient(from 0deg, rgba(226,232,240,0.06) 0deg 0.55deg, rgba(2,6,23,0) 0.55deg 2.4deg)',
              opacity: 0.5,
            }}
          />
          <div
            className="absolute inset-[16%] rounded-full"
            style={{
              transform: `rotate(${-rotation * 0.38}deg)`,
              transformOrigin: 'center center',
              transition: sheenTransition,
              backgroundImage:
                'conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.18) 28deg, transparent 55deg, transparent 360deg)',
              mixBlendMode: 'screen',
              opacity: haloOpacity,
            }}
          />
          <div
            className="absolute inset-[12.5%] rounded-full"
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              transition: ringTransition,
            }}
          >
            <span className="absolute left-1/2 top-[-3px] h-[12px] w-[3px] -translate-x-1/2 rounded-full bg-slate-100 shadow-[0_0_10px_rgba(226,232,240,0.9)]" />
          </div>
          <div
            className="absolute inset-[23%] rounded-full"
            style={{
              transform: `rotate(${rotation * 1.8}deg)`,
              transformOrigin: 'center center',
              transition: ringTransition,
              backgroundImage:
                'conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.12) 9deg, transparent 17deg, transparent 360deg)',
              opacity: 0.45 + motionIntensity * 0.25,
              filter: 'blur(0.5px)',
            }}
          />
        </div>
        <div
          className="pointer-events-none absolute inset-[2px] rounded-full bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(2,6,23,0.34)_92%)]"
          aria-hidden
        />
        {!compactMode && (
          <div
            className={`pointer-events-none absolute inset-[11%] rounded-full motion-safe:transition-opacity motion-safe:duration-500 ${isDragging || isFlinging ? 'opacity-95' : 'opacity-75'}`}
            style={sectorStyle}
            aria-hidden
          />
        )}

        {/* Periferia unificada estilo hardware */}
        <div className={`${compactMode ? 'pointer-events-none z-[18]' : 'z-[20]'} absolute inset-0`} aria-hidden={compactMode}>
          <span
            className="absolute inset-[7%] rounded-full border border-slate-400/15"
            style={{
              backgroundImage:
                'radial-gradient(circle at center, transparent 68%, rgba(148,163,184,0.1) 70%, transparent 73%)',
            }}
          />
          {optionsArray.map(([key, cfg], idx) => {
            const angle = idx * angleStep - 90
            const rad = (angle * Math.PI) / 180
            const markerRadius = dialSize * (compactMode ? 0.49 : 0.482)
            const x = dialSize / 2 + markerRadius * Math.cos(rad)
            const y = dialSize / 2 + markerRadius * Math.sin(rad)
            const isActive = idx === activeRingIndex
            const isSelected = key === selected

            const plate = (
              <span
                className={`relative flex items-center justify-center rounded-[0.6rem] border text-center leading-none shadow-[0_6px_16px_-8px_rgba(0,0,0,0.75)] ${
                  reducedMotion ? '' : 'transition-all duration-200'
                }`}
                style={{
                  transform: `translateY(${compactMode ? -16 : -14}px) scale(${isActive ? 1.16 : 0.98})`,
                  fontSize: compactMode ? (isActive ? '18px' : '16px') : isActive ? '17px' : '15px',
                  width: compactMode ? (isActive ? '34px' : '30px') : isActive ? '30px' : '26px',
                  height: compactMode ? (isActive ? '34px' : '30px') : isActive ? '30px' : '26px',
                  opacity: isActive ? 1 : 0.8,
                  borderColor: isActive ? 'rgba(226,232,240,0.5)' : 'rgba(148,163,184,0.26)',
                  background: isActive
                    ? 'linear-gradient(180deg, rgba(203,213,225,0.26), rgba(15,23,42,0.9))'
                    : 'linear-gradient(180deg, rgba(51,65,85,0.55), rgba(2,6,23,0.86))',
                  boxShadow: isActive
                    ? '0 8px 18px -8px rgba(0,0,0,0.85), 0 0 16px -6px rgba(167,139,250,0.7)'
                    : '0 6px 16px -8px rgba(0,0,0,0.75)',
                }}
              >
                {cfg.icon}
              </span>
            )

            return (
              <span
                key={key}
                className="absolute flex items-center justify-center"
                style={{ left: `${x}px`, top: `${y}px`, transform: 'translate(-50%, -50%)' }}
              >
                {compactMode ? (
                  plate
                ) : (
                  <button
                    type="button"
                    data-circular-chip=""
                    onClick={() => onSelect(key)}
                    aria-label={`${cfg.label}, ranura ${idx + 1} de ${optionCount}`}
                    className="relative active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/75 focus-visible:ring-offset-2 focus-visible:ring-offset-[#040c1a]"
                    aria-current={isSelected ? 'true' : undefined}
                  >
                    {plate}
                  </button>
                )}
              </span>
            )
          })}
        </div>

        {/* Cristal central: abrir módulo */}
        <div
          className="absolute left-1/2 top-1/2 z-[25] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
          style={{
            width: `${centerSize * 0.92}px`,
            height: `${centerSize * 0.92}px`,
            maxWidth: `${dialSize * 0.42}px`,
            maxHeight: `${dialSize * 0.42}px`,
          }}
        >
          <button
            type="button"
            data-circular-center-action=""
            onClick={handleCenterAction}
            aria-label={`Abrir módulo: ${centerDisplayLabel}`}
            className="group relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-white/[0.18] bg-[radial-gradient(ellipse_at_50%_2%,rgba(255,255,255,0.24),transparent_39%),linear-gradient(168deg,rgba(100,116,139,0.72),rgba(2,6,12,0.98)_64%)] text-center shadow-[inset_0_10px_20px_rgba(255,255,255,0.12),inset_0_-34px_58px_rgba(0,0,0,0.85),0_18px_44px_-20px_rgba(0,0,0,0.92)] ring-1 ring-slate-200/16 transition-[transform,box-shadow,border-color,filter] duration-300 hover:border-slate-200/30 hover:shadow-[inset_0_10px_18px_rgba(255,255,255,0.14),0_18px_48px_-20px_rgba(0,0,0,0.92)] hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-[inset_0_10px_20px_rgba(255,255,255,0.12),inset_0_-34px_58px_rgba(0,0,0,0.85),0_0_0_2px_rgba(226,232,240,0.65),0_18px_44px_-20px_rgba(0,0,0,0.92)]"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <span
              className="pointer-events-none absolute inset-[2px] rounded-full border border-white/[0.08]"
              aria-hidden
            />
            <span
              className="pointer-events-none absolute inset-x-[12%] top-[5%] h-[24%] rounded-[100%] bg-gradient-to-b from-white/24 to-transparent opacity-70"
              aria-hidden
            />
            <span
              className="pointer-events-none absolute inset-[5px] rounded-full bg-gradient-to-br from-slate-200/[0.05] via-transparent to-slate-500/[0.03]"
              aria-hidden
            />
            <span
              className="pointer-events-none absolute inset-[6px] rounded-full"
              style={{
                backgroundImage:
                  'repeating-radial-gradient(circle at center, rgba(255,255,255,0.035) 0 0.9px, rgba(0,0,0,0) 0.9px 2.4px)',
                opacity: 0.4,
                mixBlendMode: 'soft-light',
              }}
              aria-hidden
            />
            <span
              className="pointer-events-none absolute inset-[8%] rounded-full"
              style={{
                transform: `rotate(${rotation * 1.25}deg)`,
                transformOrigin: 'center center',
                transition: ringTransition,
                backgroundImage:
                  'conic-gradient(from 0deg, rgba(255,255,255,0.14) 0deg, transparent 48deg, transparent 360deg)',
                opacity: 0.8,
              }}
              aria-hidden
            />
            <div
              className={`relative z-[1] flex w-full flex-col items-center text-center ${
                compactMode ? 'max-w-[88%] gap-0.5 pt-1' : 'max-w-[82%] gap-1 pt-2'
              }`}
            >
              <span className={`${compactMode ? 'text-[1.75rem]' : 'text-[1.7rem]'} leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)] ${reducedMotion ? '' : 'transition-transform duration-300'} ${isDragging || isFlinging ? 'scale-105' : 'scale-100'}`}>
                {options[centerDisplayKey]?.icon}
              </span>
              <span
                className={`${
                  compactMode
                    ? 'line-clamp-2 min-h-[2.2rem] max-w-[8.2rem] text-[9.5px] leading-[1.15] tracking-[0.08em]'
                    : 'line-clamp-2 min-h-[2.25rem] max-w-[9.25rem] text-[10px] tracking-[0.16em] leading-snug'
                } font-semibold uppercase text-slate-100/96`}
              >
                {options[centerDisplayKey]?.label}
              </span>
              {centerMetric != null && (
                <span className="flex flex-col items-center leading-none text-amber-200/85">
                  <span className={`${compactMode ? 'text-[7px] tracking-[0.08em]' : 'text-[9px] tracking-[0.11em]'} font-medium uppercase`}>
                    {centerMetric.label}
                  </span>
                  <span className={`${compactMode ? 'mt-0.5 text-[10px]' : 'mt-1 text-[12px]'} font-semibold tabular-nums`}>
                    {centerMetric.value}
                  </span>
                </span>
              )}
            </div>
            <span className="pointer-events-none absolute bottom-2.5 left-1/2 h-px w-8 -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-slate-300/35 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" aria-hidden />
          </button>
        </div>
      </div>
    </section>
  )
}
