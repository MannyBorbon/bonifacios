import { useState, useEffect } from 'react';

function MusicPreloader({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [audioLoaded, setAudioLoaded] = useState(false);

  useEffect(() => {
    // Precargar audio
    const audio = new Audio('/la-otra-realidad.m4a');
    
    audio.addEventListener('canplaythrough', () => {
      setAudioLoaded(true);
      audio.play().catch(err => console.log('Audio autoplay blocked:', err));
    });

    audio.load();

    // Animación de progreso
    const duration = 10000; // 10 segundos
    const interval = 50;
    const increment = (interval / duration) * 100;
    
    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            audio.pause();
            audio.currentTime = 0;
            onComplete();
          }, 500);
          return 100;
        }
        return next;
      });
    }, interval);

    return () => {
      clearInterval(timer);
      audio.pause();
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#0f0f14] via-[#1a1a1f] to-[#0a0a0f]">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D4AF37]/10 blur-[120px] animate-pulse" />
      </div>

      {/* Logo and loading */}
      <div className="relative text-center">
        <div className="mb-8 flex justify-center">
          <img 
            src="/logo-premium.svg" 
            alt="Bonifacio's" 
            className="h-32 w-auto opacity-90 animate-pulse"
          />
        </div>

        {/* Progress bar */}
        <div className="mx-auto w-64">
          <div className="h-1 overflow-hidden rounded-full bg-[#D4AF37]/20">
            <div 
              className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F4E4C1] transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-4 font-serif text-sm font-light tracking-widest text-[#D4AF37]/60">
            Cargando...
          </p>
        </div>

        {/* Musical note animation */}
        {audioLoaded && (
          <div className="mt-8 flex justify-center gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-8 w-1 rounded-full bg-[#D4AF37]/40"
                style={{
                  animation: `musicBar 0.8s ease-in-out infinite`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes musicBar {
          0%, 100% { transform: scaleY(0.3); opacity: 0.4; }
          50% { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default MusicPreloader;
