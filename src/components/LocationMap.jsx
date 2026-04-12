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
};

function createIcon(color = 'blue') {
  const hex = COLORS[color] || color;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="${hex}" stroke="#fff" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="6" fill="#fff"/>
  </svg>`;
  return L.icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(svg),
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -40],
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

    // Offset overlapping markers so they don't stack
    const seen = {};
    validMarkers.forEach(m => {
      const key = `${m.lat.toFixed(4)},${m.lng.toFixed(4)}`;
      const count = seen[key] || 0;
      seen[key] = count + 1;
      const offsetLat = count * 0.0008;
      const offsetLng = count * 0.0012;
      const marker = L.marker([m.lat + offsetLat, m.lng + offsetLng], { icon: createIcon(m.color || 'blue') });
      if (m.popup) marker.bindPopup(m.popup);
      if (m.label) marker.bindTooltip(m.label, { permanent: false });
      markersLayer.current.addLayer(marker);
    });

    if (validMarkers.length > 0) {
      const bounds = L.latLngBounds(validMarkers.map(m => [m.lat, m.lng]));
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
