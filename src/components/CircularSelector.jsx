import React, { useState, useEffect, useCallback, useRef } from 'react';

/**
 * ============================================================
 * CIRCULAR SELECTOR - Ultra Premium High-Tech Component
 * ============================================================
 * Selector circular tipo perilla premium para navegación del dashboard
 * - Diseño futurista con efectos de neón y partículas
 * - Soporte completo para mouse, touch y touchpad
 * - Animaciones suaves y feedback visual
 * - Preparado para dashboard general (no implementado aún)
 * ============================================================
 */

export default function CircularSelector({ options, selected, onSelect, size = 320 }) {
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startAngle, setStartAngle] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const centerRef = useRef(null);

  const optionsArray = Object.entries(options);
  const angleStep = 360 / optionsArray.length;
  const selectedIndex = optionsArray.findIndex(([key]) => key === selected);
  const targetRotation = selectedIndex * angleStep;

  // Sincronizar rotación con selección
  useEffect(() => {
    if (!isDragging) {
      setRotation(targetRotation);
    }
  }, [targetRotation, isDragging]);

  const getAngle = useCallback((clientX, clientY) => {
    if (!centerRef.current) return 0;
    const rect = centerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
    return angle + 90;
  }, []);

  const handleStart = (clientX, clientY) => {
    setIsDragging(true);
    setStartAngle(getAngle(clientX, clientY) - rotation);
  };

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    const nearestIndex = Math.round(rotation / angleStep) % optionsArray.length;
    setRotation(nearestIndex * angleStep);
  }, [rotation, angleStep, optionsArray.length]);

  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e) => {
      const currentAngle = getAngle(e.clientX, e.clientY);
      let newRotation = currentAngle - startAngle;
      
      while (newRotation < 0) newRotation += 360;
      while (newRotation >= 360) newRotation -= 360;
      
      setRotation(newRotation);
      
      const nearestIndex = Math.round(newRotation / angleStep) % optionsArray.length;
      const [key] = optionsArray[nearestIndex];
      if (key !== selected) {
        onSelect(key);
      }
    };

    const handleMouseUp = () => handleEnd();
    
    const handleTouchMove = (e) => {
      const touch = e.touches[0];
      const currentAngle = getAngle(touch.clientX, touch.clientY);
      let newRotation = currentAngle - startAngle;
      
      while (newRotation < 0) newRotation += 360;
      while (newRotation >= 360) newRotation -= 360;
      
      setRotation(newRotation);
      
      const nearestIndex = Math.round(newRotation / angleStep) % optionsArray.length;
      const [key] = optionsArray[nearestIndex];
      if (key !== selected) {
        onSelect(key);
      }
    };
    
    const handleTouchEnd = () => handleEnd();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, startAngle, rotation, angleStep, optionsArray, selected, onSelect, handleEnd, getAngle]);

  // Soporte para touchpad (wheel events)
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY;
    let newRotation = rotation + (delta > 0 ? angleStep : -angleStep);
    
    while (newRotation < 0) newRotation += 360;
    while (newRotation >= 360) newRotation -= 360;
    
    setRotation(newRotation);
    
    const nearestIndex = Math.round(newRotation / angleStep) % optionsArray.length;
    const [key] = optionsArray[nearestIndex];
    if (key !== selected) {
      onSelect(key);
    }
  }, [rotation, angleStep, optionsArray, selected, onSelect]);

  const radius = size * 0.38;
  const centerSize = size * 0.4;

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Título con efecto neón */}
      <div className="relative">
        <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 text-sm font-black uppercase tracking-[0.3em] animate-pulse">
          ⚡ Navegación Premium
        </h2>
        <div className="absolute inset-0 blur-xl bg-gradient-to-r from-cyan-400/20 via-blue-500/20 to-purple-600/20" />
      </div>
      
      <div 
        className="relative" 
        style={{ width: `${size}px`, height: `${size}px` }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Anillos de fondo con efecto de profundidad */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl" />
        <div className="absolute inset-2 rounded-full border-2 border-cyan-500/10 bg-gradient-to-br from-cyan-950/10 to-purple-950/10" />
        <div className="absolute inset-4 rounded-full border border-cyan-500/5 bg-gradient-to-br from-slate-900/50 to-transparent backdrop-blur-sm" />
        
        {/* Partículas de fondo animadas */}
        {[...Array(12)].map((_, i) => {
          const angle = (i * 30) * (Math.PI / 180);
          const x = size / 2 + (size * 0.35) * Math.cos(angle);
          const y = size / 2 + (size * 0.35) * Math.sin(angle);
          return (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-cyan-400/30 animate-pulse"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: '2s'
              }}
            />
          );
        })}

        {/* Opciones en círculo */}
        <div className="absolute inset-0">
          {optionsArray.map(([key, cfg], idx) => {
            const angle = idx * angleStep - 90;
            const rad = (angle * Math.PI) / 180;
            const x = size / 2 + radius * Math.cos(rad);
            const y = size / 2 + radius * Math.sin(rad);
            const isSelected = key === selected;
            
            return (
              <div
                key={key}
                className="absolute transition-all duration-500 ease-out"
                style={{ 
                  left: `${x}px`, 
                  top: `${y}px`, 
                  transform: `translate(-50%, -50%) scale(${isSelected ? 1.15 : 1})`,
                  zIndex: isSelected ? 20 : 10
                }}
              >
                <button
                  onClick={() => onSelect(key)}
                  className={`group relative flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-300 ${
                    isSelected 
                      ? 'bg-gradient-to-br from-cyan-500/30 via-blue-500/30 to-purple-500/30 border-2 border-cyan-400 shadow-lg shadow-cyan-500/50' 
                      : 'bg-slate-900/60 border border-slate-700/50 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/20 backdrop-blur-sm'
                  }`}
                >
                  {/* Icono con efecto de brillo */}
                  <div className="relative">
                    <span className={`text-3xl transition-all duration-300 ${isSelected ? 'drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'group-hover:scale-110'}`}>
                      {cfg.icon}
                    </span>
                    {isSelected && (
                      <div className="absolute inset-0 blur-xl bg-cyan-400/40 animate-pulse" />
                    )}
                  </div>
                  
                  {/* Label con efecto neón */}
                  <span className={`text-[10px] font-bold whitespace-nowrap transition-all duration-300 ${
                    isSelected 
                      ? 'text-cyan-300 drop-shadow-[0_0_4px_rgba(6,182,212,0.8)]' 
                      : 'text-slate-400 group-hover:text-cyan-400'
                  }`}>
                    {cfg.label}
                  </span>
                  
                  {/* Indicador de selección */}
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400 shadow-lg shadow-cyan-500/50 animate-ping" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Perilla central ultra premium */}
        <div
          ref={centerRef}
          className={`absolute cursor-grab active:cursor-grabbing transition-transform duration-200 ${isDragging ? 'scale-95' : 'scale-100'}`}
          style={{
            left: '50%',
            top: '50%',
            width: `${centerSize}px`,
            height: `${centerSize}px`,
            transform: 'translate(-50%, -50%)'
          }}
          onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            handleStart(touch.clientX, touch.clientY);
          }}
          onWheel={handleWheel}
          style={{ touchAction: 'none' }}
        >
          {/* Anillo exterior giratorio */}
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-purple-500/20 border-4 border-cyan-500/50 shadow-2xl shadow-cyan-500/30 transition-all duration-300"
            style={{ 
              transform: `rotate(${rotation}deg)`,
              boxShadow: isHovering ? '0 0 40px rgba(6, 182, 212, 0.6)' : '0 0 20px rgba(6, 182, 212, 0.3)'
            }}
          >
            {/* Indicador de dirección con efecto neón */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-10 bg-gradient-to-b from-cyan-400 via-cyan-300 to-transparent rounded-full shadow-lg shadow-cyan-500/50" />
            
            {/* Marcas decorativas */}
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-0.5 h-3 bg-cyan-400/30"
                style={{
                  left: '50%',
                  top: '8px',
                  transform: `translateX(-50%) rotate(${i * 45}deg)`,
                  transformOrigin: `center ${centerSize / 2 - 8}px`
                }}
              />
            ))}
          </div>

          {/* Centro de la perilla con efecto holográfico */}
          <div className="absolute inset-3 rounded-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-cyan-500/30 flex items-center justify-center overflow-hidden">
            {/* Efecto holográfico de fondo */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 animate-pulse" />
            
            {/* Contenido central */}
            <div className="relative text-center z-10">
              <span className="text-4xl block drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">
                {options[selected]?.icon}
              </span>
              <span className="text-[9px] text-cyan-400 font-bold uppercase mt-2 block tracking-wider drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]">
                {options[selected]?.label}
              </span>
            </div>
            
            {/* Anillos decorativos animados */}
            <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping" style={{ animationDuration: '3s' }} />
            <div className="absolute inset-2 rounded-full border border-purple-500/20 animate-ping" style={{ animationDuration: '4s', animationDelay: '0.5s' }} />
          </div>

          {/* Efecto de brillo al hover */}
          {isHovering && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400/10 to-purple-400/10 animate-pulse" />
          )}
        </div>

        {/* Instrucciones con iconos */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-center">
          <div className="flex items-center gap-4 text-slate-500 text-[10px] font-medium">
            <span className="flex items-center gap-1">
              <span className="text-cyan-400">🖱️</span> Arrastra
            </span>
            <span className="flex items-center gap-1">
              <span className="text-purple-400">👆</span> Toca
            </span>
            <span className="flex items-center gap-1">
              <span className="text-blue-400">🔄</span> Touchpad
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
