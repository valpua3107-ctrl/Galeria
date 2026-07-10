// ==========================================================================
// CONFIGURACIÓN - URL VERIFICADA DE GOOGLE DRIVE (APPS SCRIPT)
// ==========================================================================
const URL_SCRIPT_EJECUTABLE = "https://script.google.com/macros/s/AKfycbwBpt96Qh6_Oz_j1LyonSuo-BfzkNbUwN3ZgJPL5HAjnn2FXejI1Y_4CcDmJ7xoQKYMiw/exec";
// ==========================================================================
// REFERENCIAS AL DOM
// ==========================================================================
const tabsContainer = document.getElementById('tabsContainer');
const galeriaContainer = document.getElementById('galeria');
const loaderContainer = document.getElementById('loader');
const estadoMensajeContainer = document.getElementById('estadoMensaje');
const contadorImagenes = document.getElementById('contadorImagenes');
const carpetaInfo = document.getElementById('carpetaInfo');
const carpetaTitulo = document.getElementById('carpetaTitulo');
const carpetaDescripcion = document.getElementById('carpetaDescripcion');
// Elementos de la barra de navegación y pie de página
const navbar = document.getElementById('navbar');
const navbarToggle = document.getElementById('navbarToggle');
const navbarMenu = document.getElementById('navbarMenu');
const footerYear = document.getElementById('footerYear');
// ==========================================================================
// ESTADO GLOBAL
// ==========================================================================
let datosGlobal = null;
let carpetaActiva = 'galeria1';
// ==========================================================================
// INTERACCIONES Y COMPORTAMIENTO VISUAL
// ==========================================================================
// Menú Móvil Hamburguesa
if (navbarToggle && navbarMenu) {
  navbarToggle.addEventListener('click', () => {
    const isExpanded = navbarToggle.getAttribute('aria-expanded') === 'true';
    navbarToggle.classList.toggle('active');
    navbarMenu.classList.toggle('active');
    navbarToggle.setAttribute('aria-expanded', !isExpanded);
  });
}
// Efecto Scroll de la Barra de Navegación
window.addEventListener('scroll', () => {
  if (window.scrollY > 20) {
    navbar.classList.add('navbar-scrolled');
  } else {
    navbar.classList.remove('navbar-scrolled');
  }
});
// Año dinámico para el Footer
if (footerYear) {
  footerYear.textContent = new Date().getFullYear();
}
// Cierre automático del menú móvil al hacer clic en un enlace
document.querySelectorAll('.navbar-link').forEach(link => {
  link.addEventListener('click', () => {
    if (navbarMenu.classList.contains('active')) {
      navbarToggle.classList.remove('active');
      navbarMenu.classList.remove('active');
      navbarToggle.setAttribute('aria-expanded', 'false');
    }
  });
});
// ==========================================================================
// CARGA Y PROCESAMIENTO DE DATOS (GOOGLE DRIVE API)
// ==========================================================================
async function cargarImagenes() {
  if (!galeriaContainer || !tabsContainer) return;
  try {
    mostrarLoader();
    // Petición fetch a la URL del Apps Script
    const respuesta = await fetch(URL_SCRIPT_EJECUTABLE);
    if (!respuesta.ok) {
      throw new Error(`Error HTTP: ${respuesta.status}`);
    }
    const datos = await respuesta.json();
    if (datos.estado !== 'éxito') {
      throw new Error(datos.mensaje || "Error desconocido en el servidor");
    }
    // Almacenar los datos de respuesta
    datosGlobal = datos;
    // Crear pestañas de navegación dinámicas
    crearPestanas(datos.carpetas);
    // Cargar la primera colección por defecto
    mostrarCarpeta('galeria1');
    ocultarLoader();
  } catch (error) {
    console.error('Error al cargar imágenes:', error);
    mostrarMensajeError(error.message);
    ocultarLoader();
  }
}
// Crear Pestañas dinámicamente según la respuesta del Script
function crearPestanas(carpetas) {
  tabsContainer.innerHTML = '';

  Object.keys(carpetas).forEach(clave => {
    const config = carpetas[clave];

    const boton = document.createElement('button');
    boton.className = 'tab-button';
    if (clave === carpetaActiva) boton.classList.add('active');
    boton.dataset.carpeta = clave;

    boton.innerHTML = `
      <span class="tab-name">${config.nombre}</span>
      <span class="tab-count">${config.cantidad} imágenes</span>
    `;

    boton.addEventListener('click', () => mostrarCarpeta(clave));

    tabsContainer.appendChild(boton);
  });
}
// Cargar y mostrar la colección de una carpeta específica
function mostrarCarpeta(clave) {
  if (!datosGlobal) return;
  // Actualizar indicador activo en los botones de pestañas
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });

  const botonActivo = document.querySelector(`[data-carpeta="${clave}"]`);
  if (botonActivo) {
    botonActivo.classList.add('active');
  }
  carpetaActiva = clave;
  const config = datosGlobal.carpetas[clave];
  // Actualizar cabecera de información de la colección
  carpetaTitulo.textContent = config.nombre;
  carpetaDescripcion.textContent = config.descripcion || 'Colección de imágenes del proyecto';
  carpetaInfo.style.display = 'block';
  // Validar si la carpeta tiene contenido
  if (!config.imagenes || config.imagenes.length === 0) {
    mostrarMensajeEstado(
      '📁',
      'Colección vacía',
      'No se encontraron fotografías disponibles en esta carpeta de Google Drive.'
    );
    actualizarContador();
    return;
  }
  // Dibujar las tarjetas de imágenes
  renderizarImagenes(config.imagenes);
  actualizarContador();
}
// Renderizar tarjetas de imágenes en la rejilla
function renderizarImagenes(imagenes) {
  galeriaContainer.innerHTML = '';
  imagenes.forEach((imagen, index) => {
    // Tarjeta contenedora
    const card = document.createElement('div');
    card.className = 'imagen-card';
    card.style.setProperty('--index', index);
    // Etiqueta de la imagen (Carga diferida)
    const img = document.createElement('img');
    img.src = imagen.url;
    img.alt = imagen.nombre;
    img.loading = 'lazy';
    // Capa de información en hover (Overlay)
    const overlay = document.createElement('div');
    overlay.className = 'imagen-overlay';
    const infoWrapper = document.createElement('div');
    infoWrapper.className = 'imagen-info-wrapper';
    const nombre = document.createElement('div');
    nombre.className = 'imagen-nombre';
    nombre.textContent = imagen.nombre;
    const verOriginal = document.createElement('span');
    verOriginal.className = 'imagen-ver';
    verOriginal.textContent = 'Ver original';
    infoWrapper.appendChild(nombre);
    infoWrapper.appendChild(verOriginal);
    overlay.appendChild(infoWrapper);
    // Estructurar la tarjeta
    card.appendChild(img);
    card.appendChild(overlay);
    // Añadir al grid
    galeriaContainer.appendChild(card);
    // Evento de clic para abrir en tamaño completo
    card.addEventListener('click', () => {
      window.open(imagen.url, '_blank');
    });
  });
  // Ocultar cualquier pantalla de error/vacío activa
  estadoMensajeContainer.classList.remove('active');
}
// Actualizar Contador Total del Footer
function actualizarContador() {
  let total = 0;
  if (datosGlobal) {
    Object.values(datosGlobal.carpetas).forEach(carpeta => {
      total += carpeta.cantidad || 0;
    });
  }
  contadorImagenes.textContent = total;
}
// ==========================================================================
// CONTROL DE ESTADOS DE LA INTERFAZ
// ==========================================================================
function mostrarLoader() {
  loaderContainer.classList.add('active');
  galeriaContainer.innerHTML = '';
  estadoMensajeContainer.classList.remove('active');
  carpetaInfo.style.display = 'none';
}
function ocultarLoader() {
  loaderContainer.classList.remove('active');
}
function mostrarMensajeEstado(icono, titulo, texto) {
  document.getElementById('estadoIcono').textContent = icono;
  document.getElementById('estadoTitulo').textContent = titulo;
  document.getElementById('estadoTexto').textContent = texto;
  estadoMensajeContainer.classList.add('active');
  galeriaContainer.innerHTML = '';
}
function mostrarMensajeError(mensaje) {
  mostrarMensajeEstado(
    '🍃',
    'Conexión interrumpida',
    mensaje || 'No fue posible conectar con la base de datos de Google Drive. Por favor, intente de nuevo en unos momentos.'
  );
}
// Iniciar carga tras cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  cargarImagenes();
  initBananIASimulator();
  initContactForm();
});
// Permitir recarga manual programática
window.recargarGaleria = cargarImagenes;

// ==========================================================================
// SIMULADOR INTERACTIVO BANANIA (DEMOSTRACIÓN DE IA)
// ==========================================================================
function initBananIASimulator() {
  const scanButtons = document.querySelectorAll('.scan-btn');
  const resultTitle = document.getElementById('scanResultTitle');
  const resultBadge = document.getElementById('scanResultBadge');
  const leafSvgPath = document.getElementById('leafSvgPath');
  const leafPreview = document.getElementById('leafPreview');

  if (!scanButtons.length || !resultBadge) return;

  const demoStates = {
    sana: {
      titulo: 'Diagnóstico IA completado en 0.4s (Confianza: 98.2%)',
      badgeText: '🟢 HOJA SANA',
      badgeBg: '#e8f5e9',
      badgeColor: '#2e7d32',
      leafColor: '#4caf50',
      bgGrad: 'radial-gradient(circle at center, #2e4d28 0%, #152414 100%)'
    },
    polvo: {
      titulo: 'Diagnóstico IA completado en 0.5s (Confianza: 94.7%)',
      badgeText: '🟤 CON POLVO / SEDIMENTO',
      badgeBg: '#efebe9',
      badgeColor: '#5d4037',
      leafColor: '#8d6e63',
      bgGrad: 'radial-gradient(circle at center, #4e3d34 0%, #211915 100%)'
    },
    danada: {
      titulo: 'Diagnóstico IA completado en 0.3s (Confianza: 96.8%)',
      badgeText: '🔴 DAÑADA (ALERTA FITOSANITARIA)',
      badgeBg: '#fceceb',
      badgeColor: '#c62828',
      leafColor: '#ef5350',
      bgGrad: 'radial-gradient(circle at center, #572928 0%, #261211 100%)'
    }
  };

  scanButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      scanButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const mode = btn.dataset.mode;
      const state = demoStates[mode];
      if (!state) return;

      if (resultTitle) resultTitle.textContent = 'Analizando red neuronal con visión artificial...';
      resultBadge.textContent = 'ESCANEANDO...';
      resultBadge.style.backgroundColor = '#fff8e1';
      resultBadge.style.color = '#f57f17';

      setTimeout(() => {
        if (resultTitle) resultTitle.textContent = state.titulo;
        resultBadge.textContent = state.badgeText;
        resultBadge.style.backgroundColor = state.badgeBg;
        resultBadge.style.color = state.badgeColor;
        if (leafSvgPath) leafSvgPath.setAttribute('fill', state.leafColor);
        if (leafPreview) leafPreview.style.background = state.bgGrad;
      }, 600);
    });
  });
}

// ==========================================================================
// MANEJO DE FORMULARIO DE CONTACTO
// ==========================================================================
function initContactForm() {
  const contactForm = document.getElementById('contactForm');
  const formFeedback = document.getElementById('formFeedback');

  if (!contactForm) return;

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (formFeedback) {
      formFeedback.style.display = 'block';
      formFeedback.textContent = '¡Gracias por tu interés en BananIA! Nuestro equipo de agrotecnología se pondrá en contacto contigo en menos de 24 horas.';
      contactForm.reset();
    }
  });
}

