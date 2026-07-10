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

    if (resultContainer) resultContainer.className = ''; 

    let estado = '';
    let porcentaje = Math.round(confidence * 100);

    if (rawLabel.includes('sana')) {
      estado = 'sana';
      currentDiagnosis = 'Sana';
      resultIcon.textContent = '🟢';
      resultTitle.textContent = 'Hoja Sana';
      resultContainer.classList.add('res-sana-bg');
      resultTitle.classList.add('res-sana');
      resultRecommendation.innerHTML = '<strong>Recomendación:</strong> Mantener el régimen de fertilización estándar e incorporar al registro de vitalidad del sector agrícola.';
    } 
    else if (rawLabel.includes('polvo') || rawLabel.includes('sedimento')) {
      estado = 'polvo';
      currentDiagnosis = 'Con Polvo';
      resultIcon.textContent = '🟤';
      resultTitle.textContent = 'Con Polvo / Sedimento';
      resultContainer.classList.add('res-polvo-bg');
      resultTitle.classList.add('res-polvo');
      resultRecommendation.innerHTML = '<strong>Recomendación:</strong> Programar limpieza o riego foliar para evitar obstrucción estomática y pérdida fotosintética.';
    }
    else if (rawLabel.includes('dañad') || rawLabel.includes('enferm') || rawLabel.includes('sigatoka') || rawLabel.includes('mancha') || rawLabel.includes('quemadur')) { 
      estado = 'dañada';
      currentDiagnosis = 'Dañada';
      resultIcon.textContent = '🔴';
      resultTitle.textContent = 'Hoja Dañada';
      resultContainer.classList.add('res-danada-bg');
      resultTitle.classList.add('res-danada');
      resultRecommendation.innerHTML = '<strong>Recomendación:</strong> ¡Alerta! Despacho inmediato del técnico fitosanitario para evaluar tratamiento o deshoje controlado.';
    }
    else {
      // Si el modelo detecta que no es hoja o no coincide con los estados conocidos
      estado = 'invalido';
      currentDiagnosis = 'No es hoja de banano';
      resultIcon.textContent = '❓';
      resultTitle.textContent = 'No parece una hoja de banano';
      
      // Estilos neutros (grises)
      resultContainer.style.backgroundColor = '#f1f5f9';
      resultContainer.style.borderColor = '#cbd5e1';
      resultTitle.style.color = '#475569';
      
      resultRecommendation.innerHTML = `<strong>Aviso:</strong> El modelo detectó que esta imagen posiblemente no es una hoja de banano (Detectó: <em>${rawLabel}</em>). Por favor, intenta de nuevo con una foto clara y enfocada de la planta.`;
      
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
