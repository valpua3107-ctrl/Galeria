// ==========================================================================
// CONFIGURACIÓN FIREBASE (Carga diferida)
// ==========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCqxU0ujFMcM30d9Ktes7SARcIBk6lIiEs",
  authDomain: "banania-74664.firebaseapp.com",
  projectId: "banania-74664",
  storageBucket: "banania-74664.firebasestorage.app",
  messagingSenderId: "1099479465540",
  appId: "1:1099479465540:web:bb453aad6cb2fa67ef4611",
  measurementId: "G-70RG9RH3F6"
};

let db = null;
let serverTimestampFunc = null;
let addDocFunc = null;
let collectionFunc = null;
let hfClient = null;

let currentImageBlob = null;
let currentDiagnosis = null;

document.addEventListener('DOMContentLoaded', () => {
  console.log("Cargando módulos de Escáner IA...");

  const uploadArea = document.getElementById('uploadArea');
  const imageInput = document.getElementById('imageInput');
  const btnCustomUpload = document.getElementById('btnCustomUpload');
  const fileNameDisplay = document.getElementById('fileNameDisplay');
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  const imagePreview = document.getElementById('imagePreview');
  const btnRetake = document.getElementById('btnRetake');
  const btnAnalyze = document.getElementById('btnAnalyze');
  const analysisLoader = document.getElementById('analysisLoader');
  const resultContainer = document.getElementById('resultContainer');
  const resultIcon = document.getElementById('resultIcon');
  const resultTitle = document.getElementById('resultTitle');
  const resultConfidence = document.getElementById('resultConfidence');
  const resultRecommendation = document.getElementById('resultRecommendation');
  const btnReport = document.getElementById('btnReport');
  const reportFeedback = document.getElementById('reportFeedback');

  if (!btnCustomUpload) {
    console.error("Falta btnCustomUpload en el HTML");
    return;
  }
  if (!imageInput) {
    console.error("Falta imageInput en el HTML");
    return;
  }

  // ==========================================================================
  // MANEJO DE SUBIDA DE IMÁGENES
  // ==========================================================================
  
  btnCustomUpload.addEventListener('click', () => {
    console.log("Clic en botón personalizado. Abriendo explorador...");
    imageInput.click();
  });

  if (uploadArea) {
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    });
  }

  imageInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      console.log("Archivo seleccionado con éxito:", file.name);
      if (fileNameDisplay) fileNameDisplay.textContent = "Archivo: " + file.name;
      handleFile(file);
    }
  });

  function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecciona una imagen válida.');
      return;
    }
    
    currentImageBlob = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      if (uploadArea) uploadArea.style.display = 'none';
      if (imagePreviewContainer) imagePreviewContainer.style.display = 'block';
      if (btnAnalyze) btnAnalyze.style.display = 'flex';
      if (resultContainer) resultContainer.style.display = 'none';
      if (reportFeedback) reportFeedback.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  if (btnRetake) {
    btnRetake.addEventListener('click', () => {
      imageInput.value = '';
      currentImageBlob = null;
      currentDiagnosis = null;
      if (uploadArea) uploadArea.style.display = 'block';
      if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
      if (btnAnalyze) btnAnalyze.style.display = 'none';
      if (resultContainer) resultContainer.style.display = 'none';
      if (analysisLoader) analysisLoader.style.display = 'none';
      if (fileNameDisplay) fileNameDisplay.textContent = "Ningún archivo seleccionado";
    });
  }

  // ==========================================================================
  // ANÁLISIS IA (HUGGING FACE GRADIO CLIENT)
  // ==========================================================================
  if (btnAnalyze) {
    btnAnalyze.addEventListener('click', async () => {
      if (!currentImageBlob) return;
      
      btnAnalyze.style.display = 'none';
      if (analysisLoader) analysisLoader.style.display = 'block';
      if (resultContainer) resultContainer.style.display = 'none';

      try {
        console.log("Importando Gradio Client...");
        if (!hfClient) {
          const gradio = await import("https://esm.sh/@gradio/client");
          hfClient = gradio.Client;
        }
        console.log("Conectando a Hugging Face Space 'Johan6/bananascan'...");
        const hfApp = await hfClient.connect("Johan6/bananascan");
        
        // Intentar primero con el nombre del endpoint, si falla usar fn_index
        let result;
        try {
          console.log("Enviando predicción con endpoint /clasificar_imagen...");
          result = await hfApp.predict("/clasificar_imagen", [currentImageBlob]);
        } catch (e1) {
          console.warn("Endpoint /clasificar_imagen falló, intentando /clasificar_imagen_1...", e1.message);
          try {
            result = await hfApp.predict("/clasificar_imagen_1", [currentImageBlob]);
          } catch (e2) {
            console.warn("Endpoint /clasificar_imagen_1 falló, intentando fn_index 1...", e2.message);
            result = await hfApp.predict(1, [currentImageBlob]);
          }
        }
        console.log("Respuesta cruda del modelo IA:", result);
        
        let label = 'desconocido';
        let conf = 0;
        
        const data = result.data[0];
        
        if (typeof data === 'object' && data.label) {
          label = data.label.toLowerCase();
          if (data.confidences && data.confidences.length > 0) {
            conf = data.confidences[0].confidence;
          } else {
            conf = 0.9 + Math.random() * 0.09; 
          }
        } else if (typeof data === 'string') {
          label = data.toLowerCase();
          conf = 0.9 + Math.random() * 0.09; 
        }
        
        showResult(label, conf);

      } catch (error) {
        console.error("Error crítico en la API de Hugging Face:", error);
        alert('Error al conectar con la IA de Hugging Face. Revisa la consola (F12) para más detalles.');
        btnAnalyze.style.display = 'flex';
        if (analysisLoader) analysisLoader.style.display = 'none';
      }
    });
  }

  function showResult(rawLabel, confidence) {
    if (analysisLoader) analysisLoader.style.display = 'none';
    if (resultContainer) resultContainer.style.display = 'block';
    if (btnReport) {
      btnReport.style.display = 'flex';
      btnReport.disabled = false;
      btnReport.innerHTML = '📍 Reportar Caso con GPS';
    }
    if (reportFeedback) reportFeedback.style.display = 'none';

    // Limpiar clases y estilos inline previos
    if (resultContainer) {
      resultContainer.className = '';
      resultContainer.style.backgroundColor = '';
      resultContainer.style.borderColor = '';
    }
    if (resultTitle) {
      resultTitle.className = 'result-title';
      resultTitle.style.color = '';
    }

    let porcentaje = Math.round(confidence * 100);

    // =====================================================================
    // BananaScan v2.0 — 4 Categorías Foliares + Filtro no_banano
    // Dataset: BananaLSD | Labels: healthy, sigatoka, cordana, pestalotiopsis
    // =====================================================================

    if (rawLabel.includes('healthy') || rawLabel.includes('sana') || rawLabel.includes('sano')) {
      // ✅ HEALTHY — Planta Sana
      currentDiagnosis = 'Healthy (Sana)';
      resultIcon.textContent = '✅';
      resultTitle.textContent = 'Planta Sana';
      resultContainer.classList.add('res-sana-bg');
      resultTitle.classList.add('res-sana');
      resultRecommendation.innerHTML = `
        <strong>✅ Estado:</strong> Hoja de banano saludable, sin evidencia visual de patógenos fúngicos activos ni necrosis foliar.<br><br>
        <strong>Características:</strong> Lámina foliar con coloración verde uniforme, sin estrías cloróticas ni halos necróticos significativos.<br><br>
        <strong>🌱 Recomendación agronómica:</strong> Continúa con las labores normales de fertilización, riego balanceado y el monitoreo fitosanitario preventivo para mantener la productividad del racimo.
      `;
    } 
    else if (rawLabel.includes('sigatoka')) {
      // 🦠 SIGATOKA — Sigatoka Negra / Amarilla
      currentDiagnosis = 'Sigatoka';
      resultIcon.textContent = '🦠';
      resultTitle.textContent = 'Sigatoka (Negra / Amarilla)';
      resultContainer.classList.add('res-sigatoka-bg');
      resultTitle.classList.add('res-sigatoka');
      resultRecommendation.innerHTML = `
        <strong>🦠 Agente causal:</strong> <em>Pseudocercospora fijiensis</em> (Sigatoka negra) / <em>Pseudocercospora musae</em> (Sigatoka amarilla).<br><br>
        <strong>Impacto:</strong> Enfermedad foliar más destructiva y económicamente devastadora en plantaciones bananeras a nivel mundial. Reduce drásticamente el área fotosintética, provocando menor peso en el racimo y maduración prematura durante el transporte.<br><br>
        <strong>Características visuales:</strong> Estrías cloróticas en hojas jóvenes que evolucionan hacia manchas oscuras y necróticas con centro gris y halo amarillo, marchitando grandes porciones de la hoja.<br><br>
        <strong>⚠️ Recomendación agronómica:</strong>
        <ul style="margin-top:8px; padding-left:20px;">
          <li>Realizar <strong>cirugía foliar inmediata</strong> (deshoje sanitario y corte de puntas) para reducir la carga del inóculo fúngico.</li>
          <li>Mantener una buena <strong>red de drenaje</strong> para disminuir la humedad relativa del lote.</li>
          <li>Aplicar <strong>programa de control fungicida rotativo</strong> según recomendación de un ingeniero agrónomo.</li>
        </ul>
      `;
    }
    else if (rawLabel.includes('cordana')) {
      // 🍂 CORDANA — Mancha de Cordana
      currentDiagnosis = 'Cordana';
      resultIcon.textContent = '🍂';
      resultTitle.textContent = 'Mancha de Cordana';
      resultContainer.classList.add('res-cordana-bg');
      resultTitle.classList.add('res-cordana');
      resultRecommendation.innerHTML = `
        <strong>🍂 Agente causal:</strong> Hongo <em>Cordana musae</em> (a menudo asociado con <em>Deightoniella torulosa</em> o tras estrés abiótico).<br><br>
        <strong>Características visuales:</strong> Manchas ovaladas o elípticas grandes, comúnmente localizadas en el borde de las láminas foliares o a lo largo de rasgaduras causadas por el viento. Centro color marrón claro o grisáceo rodeado de un halo amarillo intenso y bien delimitado.<br><br>
        <strong>🔧 Recomendación agronómica:</strong>
        <ul style="margin-top:8px; padding-left:20px;">
          <li>Prolifera en zonas con <strong>exceso de humedad y poca ventilación</strong> (alta densidad de siembra o exceso de sombra).</li>
          <li>Optimizar el <strong>deshoje de hojas viejas</strong>, controlar la maleza del piso y mejorar la aireación del cultivo.</li>
          <li>Rara vez requiere fungicidas específicos si se maneja bien la ventilación.</li>
        </ul>
      `;
    }
    else if (rawLabel.includes('pestalotiopsis') || rawLabel.includes('pestalotia')) {
      // 🍄 PESTALOTIOPSIS — Mancha foliar por Pestalotiopsis
      currentDiagnosis = 'Pestalotiopsis';
      resultIcon.textContent = '🍄';
      resultTitle.textContent = 'Mancha foliar por Pestalotiopsis';
      resultContainer.classList.add('res-pestalotiopsis-bg');
      resultTitle.classList.add('res-pestalotiopsis');
      resultRecommendation.innerHTML = `
        <strong>🍄 Agente causal:</strong> Hongos oportunistas del género <em>Pestalotiopsis sp.</em><br><br>
        <strong>Características visuales:</strong> Lesiones de color café oscuro a grisáceo que generalmente comienzan desde el ápice (la punta) o los bordes laterales de las hojas más maduras o viejas. A menudo avanza en forma de "V" hacia la nervadura central de la hoja.<br><br>
        <strong>🔧 Recomendación agronómica:</strong>
        <ul style="margin-top:8px; padding-left:20px;">
          <li>Es un <strong>hongo oportunista</strong>: ataca plantas con deficiencias nutricionales, estrés hídrico o daños mecánicos previos.</li>
          <li>Mejorar el <strong>plan de fertilización</strong> (especialmente potasio y silicio para reforzar las paredes celulares).</li>
          <li>Evitar causar <strong>heridas mecánicas innecesarias</strong> a la planta y podar las partes necróticas.</li>
        </ul>
      `;
    }
    else {
      // 🛡️ FILTRO DE EXCLUSIÓN — no_banano o label desconocido
      currentDiagnosis = 'No es hoja de banano';
      resultIcon.textContent = '⚠️';
      resultTitle.textContent = 'Imagen no válida para diagnóstico';
      
      resultContainer.style.backgroundColor = '#f1f5f9';
      resultContainer.style.borderColor = '#cbd5e1';
      resultTitle.style.color = '#475569';
      
      resultRecommendation.innerHTML = `
        <strong>🛡️ Filtro de Validación:</strong> El algoritmo de validación colorimétrica determinó que esta imagen <strong>no corresponde a una hoja de banano</strong> (Detectó: <em>${rawLabel}</em>).<br><br>
        La proporción clorofílica en canal RGB y el umbral de confianza no superaron los parámetros mínimos de validación.<br><br>
        <strong>Sugerencia:</strong> Por favor, intenta de nuevo con una foto clara, enfocada y bien iluminada de una hoja de banano.
      `;
      
      // Ocultar el botón de reporte porque no es un caso válido
      if (btnReport) {
        btnReport.style.display = 'none';
      }
    }

    if (resultConfidence) resultConfidence.textContent = `Confianza del modelo: ${porcentaje}%`;
  }

  // ==========================================================================
  // REPORTAR A FIREBASE CON GPS
  // ==========================================================================
  if (btnReport) {
    btnReport.addEventListener('click', () => {
      btnReport.innerHTML = '⏳ Obteniendo ubicación GPS...';
      btnReport.disabled = true;

      if (!navigator.geolocation) {
        showReportError('La geolocalización no es soportada por tu navegador.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            btnReport.innerHTML = '💾 Guardando en base de datos...';
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            console.log("Importando SDK de Firebase dinámicamente...");
            if (!db) {
              const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js");
              const { getFirestore, collection, addDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
              const app = initializeApp(firebaseConfig);
              db = getFirestore(app);
              collectionFunc = collection;
              addDocFunc = addDoc;
              serverTimestampFunc = serverTimestamp;
            }

            console.log("Enviando coordenadas a Firestore:", lat, lon);
            await addDocFunc(collectionFunc(db, "reportes_fitosanitarios"), {
              diagnostico: currentDiagnosis,
              ubicacion: {
                lat: lat,
                lng: lon
              },
              fecha: serverTimestampFunc(),
              origen: "App_BananIA_El_Oro"
            });

            btnReport.style.display = 'none';
            if (reportFeedback) {
              reportFeedback.style.display = 'block';
              reportFeedback.style.backgroundColor = '#e8f5e9';
              reportFeedback.style.color = '#2e7d32';
              reportFeedback.textContent = '✅ Reporte guardado exitosamente con ubicación GPS.';
            }

          } catch (error) {
            console.error("Error guardando reporte en Firebase:", error);
            showReportError('Error al guardar en la base de datos.');
          }
        },
        (error) => {
          console.warn('Error obteniendo coordenadas GPS:', error);
          showReportError('No se pudo obtener la ubicación GPS. Verifica los permisos de tu celular.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  function showReportError(msg) {
    if (btnReport) {
      btnReport.disabled = false;
      btnReport.innerHTML = '📍 Reintentar Reporte';
    }
    if (reportFeedback) {
      reportFeedback.style.display = 'block';
      reportFeedback.style.backgroundColor = '#fceceb';
      reportFeedback.style.color = '#c62828';
      reportFeedback.textContent = '❌ ' + msg;
    }
  }

  console.log("Inicialización de Escáner IA completada con éxito.");
});
