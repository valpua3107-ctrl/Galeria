// ==========================================================================
// CONFIGURACIÓN FIREBASE (misma que escaner.js)
// ==========================================================================
const mapaFirebaseConfig = {
  apiKey: "AIzaSyCqxU0ujFMcM30d9Ktes7SARcIBk6lIiEs",
  authDomain: "banania-74664.firebaseapp.com",
  projectId: "banania-74664",
  storageBucket: "banania-74664.firebasestorage.app",
  messagingSenderId: "1099479465540",
  appId: "1:1099479465540:web:bb453aad6cb2fa67ef4611",
  measurementId: "G-70RG9RH3F6"
};

document.addEventListener('DOMContentLoaded', () => {
  console.log("Inicializando Mapa de Reportes Fitosanitarios...");

  const mapLoader = document.getElementById('mapLoader');
  const statTotal = document.getElementById('statTotal');
  const statSana = document.getElementById('statSana');
  const statPolvo = document.getElementById('statPolvo');
  const statDanada = document.getElementById('statDanada');

  // ========================================================================
  // INICIALIZAR LEAFLET - Centrado en El Oro, Ecuador
  // ========================================================================
  const EL_ORO_CENTER = [-3.26, -79.96];
  const EL_ORO_ZOOM = 10;

  const map = L.map('map').setView(EL_ORO_CENTER, EL_ORO_ZOOM);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | BananIA',
    maxZoom: 18,
  }).addTo(map);

  // Almacenar marcadores para poder limpiarlos en tiempo real
  let markersLayer = L.layerGroup().addTo(map);

  // ========================================================================
  // CREAR MARCADOR CON COLOR SEGÚN DIAGNÓSTICO
  // ========================================================================
  function getMarkerColor(diagnostico) {
    const diag = (diagnostico || '').toLowerCase();
    if (diag.includes('sana')) return '#2e7d32';       // Verde
    if (diag.includes('polvo')) return '#f9a825';       // Amarillo
    if (diag.includes('dañada') || diag.includes('danada')) return '#c62828'; // Rojo
    return '#78909c'; // Gris para desconocidos
  }

  function getMarkerEmoji(diagnostico) {
    const diag = (diagnostico || '').toLowerCase();
    if (diag.includes('sana')) return '🟢';
    if (diag.includes('polvo')) return '🟡';
    if (diag.includes('dañada') || diag.includes('danada')) return '🔴';
    return '⚪';
  }

  function createCircleMarker(lat, lng, diagnostico, fecha, origen) {
    const color = getMarkerColor(diagnostico);
    const emoji = getMarkerEmoji(diagnostico);

    const marker = L.circleMarker([lat, lng], {
      radius: 10,
      fillColor: color,
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.85
    });

    // Formato de fecha legible
    let fechaStr = 'Sin fecha';
    if (fecha) {
      try {
        const d = fecha.toDate ? fecha.toDate() : new Date(fecha);
        fechaStr = d.toLocaleDateString('es-EC', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });
      } catch (e) {
        fechaStr = 'Sin fecha';
      }
    }

    marker.bindPopup(`
      <div class="popup-content">
        <strong>${emoji} ${diagnostico || 'Desconocido'}</strong>
        <span>📅 ${fechaStr}</span><br>
        <span>📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}</span><br>
        <span>🏷️ ${origen || 'BananIA'}</span>
      </div>
    `, { className: 'custom-popup' });

    return marker;
  }

  // ========================================================================
  // ACTUALIZAR ESTADÍSTICAS
  // ========================================================================
  function updateStats(reportes) {
    let sanas = 0, polvo = 0, danadas = 0;
    reportes.forEach(r => {
      const diag = (r.diagnostico || '').toLowerCase();
      if (diag.includes('sana')) sanas++;
      else if (diag.includes('polvo')) polvo++;
      else if (diag.includes('dañada') || diag.includes('danada')) danadas++;
    });
    statTotal.textContent = reportes.length;
    statSana.textContent = sanas;
    statPolvo.textContent = polvo;
    statDanada.textContent = danadas;
  }

  // ========================================================================
  // CARGAR DATOS DE FIREBASE EN TIEMPO REAL
  // ========================================================================
  async function inicializarFirebase() {
    try {
      const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js");
      const { getFirestore, collection, onSnapshot, orderBy, query } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");

      const app = initializeApp(mapaFirebaseConfig, "mapa-app");
      const db = getFirestore(app);

      console.log("Firebase conectado. Escuchando reportes en tiempo real...");

      // Query con orden por fecha descendente
      const reportesRef = collection(db, "reportes_fitosanitarios");
      const q = query(reportesRef, orderBy("fecha", "desc"));

      // Listener en tiempo real
      onSnapshot(q, (snapshot) => {
        console.log(`Recibidos ${snapshot.size} reportes de Firestore.`);

        // Limpiar marcadores anteriores
        markersLayer.clearLayers();

        const reportes = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.ubicacion && data.ubicacion.lat && data.ubicacion.lng) {
            const marker = createCircleMarker(
              data.ubicacion.lat,
              data.ubicacion.lng,
              data.diagnostico,
              data.fecha,
              data.origen
            );
            markersLayer.addLayer(marker);
            reportes.push(data);
          }
        });

        updateStats(reportes);

        // Ocultar loader
        if (mapLoader) mapLoader.style.display = 'none';

        // Si hay marcadores, ajustar la vista para mostrarlos todos
        if (reportes.length > 0 && markersLayer.getLayers().length > 0) {
          const group = L.featureGroup(markersLayer.getLayers());
          map.fitBounds(group.getBounds().pad(0.2));
        }

      }, (error) => {
        console.error("Error escuchando Firestore:", error);
        if (mapLoader) {
          mapLoader.innerHTML = '<span style="color: #c62828;">❌ Error al conectar con Firebase. Revisa la consola.</span>';
        }
      });

    } catch (error) {
      console.error("Error inicializando Firebase para el mapa:", error);
      if (mapLoader) {
        mapLoader.innerHTML = '<span style="color: #c62828;">❌ Error al cargar Firebase. Revisa la consola.</span>';
      }
    }
  }

  inicializarFirebase();

  console.log("Mapa de Reportes inicializado correctamente.");
});
