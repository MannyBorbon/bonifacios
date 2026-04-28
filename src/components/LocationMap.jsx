import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons for Leaflet in bundled apps
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const COLORS = {
  blue: '#3b82f6',
  red: '#ef4444',
  green: '#22c55e',
  amber: '#D4AF37',
  purple: '#a855f7',
  cyan: '#06b6d4',
  pink: '#ec4899',
  orange: '#f97316',
};

function createIcon(color = 'blue', avatar = '') {
  const hex = COLORS[color] || color;
  const safeAvatar = String(avatar || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const avatarHtml = safeAvatar
    ? `<div style="position:relative;width:28px;height:28px;">
         <img src="${safeAvatar}" style="width:28px;height:28px;border-radius:9999px;object-fit:cover;display:block;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
         <div style="width:28px;height:28px;border-radius:9999px;background:#0b1120;color:#fff;font-size:10px;font-weight:700;display:none;align-items:center;justify-content:center;position:absolute;inset:0;">EMP</div>
       </div>`
    : `<div style="width:28px;height:28px;border-radius:9999px;background:#0b1120;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;">EMP</div>`;

  const html = `
    <div style="position:relative;width:36px;height:50px;">
      <div style="position:absolute;left:50%;top:2px;transform:translateX(-50%);width:32px;height:32px;border-radius:9999px;border:2px solid ${hex};background:#0b1120;display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.4);">
        ${avatarHtml}
      </div>
      <div style="position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:14px solid ${hex};"></div>
    </div>`;

  return L.divIcon({
    className: 'employee-avatar-marker',
    html,
    iconSize: [36, 50],
    iconAnchor: [18, 50],
    popupAnchor: [0, -44],
  });
}

/**
 * LocationMap component
 * @param {Array} markers - Array of { lat, lng, label, color, popup }
 * @param {number} height - Map height in px
 * @param {number} zoom - Default zoom level
 * @param {string} className - Additional classes
 */
function LocationMap({ markers = [], height = 300, zoom = 12, className = '' }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersLayer = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        scrollWheelZoom: false,
        attributionControl: true,
      }).setView([31.3, -110.95], zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 18,
      }).addTo(mapInstance.current);

      markersLayer.current = L.layerGroup().addTo(mapInstance.current);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markersLayer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !markersLayer.current) return;

    markersLayer.current.clearLayers();

    const validMarkers = markers.filter(m => m.lat && m.lng && !isNaN(m.lat) && !isNaN(m.lng));

    // Distribute overlapping markers in a circular pattern (instead of a diagonal line)
    const groups = {};
    validMarkers.forEach((m) => {
      const key = `${m.lat.toFixed(4)},${m.lng.toFixed(4)}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });

    const plottedPoints = [];
    Object.entries(groups).forEach(([key, group]) => {
      const [baseLat, baseLng] = key.split(',').map(Number);
      const groupSize = group.length;
      const baseAngle = Math.abs(key.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)) % 360;

      group.forEach((m, idx) => {
        let plotLat = baseLat;
        let plotLng = baseLng;

        if (groupSize > 1) {
          // Ring layout in meters -> converted to degrees
          const ringIndex = Math.floor((idx + 1) / 6);
          const radiusMeters = 35 + (ringIndex * 18);
          const angleDeg = baseAngle + ((idx * 360) / groupSize);
          const angleRad = (angleDeg * Math.PI) / 180;
          const latRad = (baseLat * Math.PI) / 180;
          const metersPerDegLat = 111320;
          const metersPerDegLng = Math.max(111320 * Math.cos(latRad), 1);
          plotLat = baseLat + ((radiusMeters * Math.sin(angleRad)) / metersPerDegLat);
          plotLng = baseLng + ((radiusMeters * Math.cos(angleRad)) / metersPerDegLng);
        }

        const marker = L.marker([plotLat, plotLng], { icon: createIcon(m.color || 'blue', m.avatar || '') });
        plottedPoints.push([plotLat, plotLng]);
        if (m.popup) marker.bindPopup(m.popup);
        if (m.label) marker.bindTooltip(m.label, { permanent: false });
        markersLayer.current.addLayer(marker);
      });
    });

    if (validMarkers.length > 0) {
      const bounds = L.latLngBounds((plottedPoints.length ? plottedPoints : validMarkers.map(m => [m.lat, m.lng])));
      mapInstance.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [markers]);

  return (
    <div
      ref={mapRef}
      className={`rounded-xl border border-[#D4AF37]/20 overflow-hidden ${className}`}
      style={{ height, width: '100%', background: '#1a1a1f' }}
    />
  );
}

export default LocationMap;
