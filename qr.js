// ═══════════════════════════════════════
//  qr.js — QR code generation
//  PyMIB Attendance System
// ═══════════════════════════════════════

const QR_EXPIRY_SECONDS = 300; // 5 minutes

let qrTimerInterval = null;
let qrExpiresAt     = null;
let qrData          = null;

/**
 * Generate a short random token
 */
function generateToken() {
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a new QR code
 */
function generateQR() {
  const supervisor = document.getElementById('sup-name').value.trim();
  const proyecto   = document.getElementById('sup-project').value.trim();

  if (!supervisor) {
    showToast('⚠ Ingresa el nombre del supervisor', 'warning');
    document.getElementById('sup-name').focus();
    return;
  }
  if (!proyecto) {
    showToast('⚠ Ingresa el proyecto/obra', 'warning');
    document.getElementById('sup-project').focus();
    return;
  }

  // Build QR payload
  const now  = Date.now();
  qrExpiresAt = now + QR_EXPIRY_SECONDS * 1000;

  qrData = {
    supervisor,
    proyecto,
    token:     generateToken(),
    timestamp: now,
    expires:   qrExpiresAt
  };

  const payload = JSON.stringify(qrData);

  // Show container
  const container = document.getElementById('qr-container');
  container.classList.remove('hidden');

  // Meta info
  document.getElementById('qr-meta').innerHTML =
    `<div>SUPERVISOR: <span>${supervisor}</span></div>
     <div>PROYECTO: <span>${proyecto}</span></div>
     <div>GENERADO: <span>${new Date().toLocaleTimeString('es-MX')}</span></div>`;

  // Render QR
  const canvas = document.getElementById('qr-canvas');
  QRCode.toCanvas(canvas, payload, {
    width:            220,
    margin:           1,
    color: {
      dark:  '#0a0c0f',
      light: '#ffffff'
    },
    errorCorrectionLevel: 'M'
  }, (err) => {
    if (err) console.error('[PyMIB QR] Error al generar QR:', err);
    else console.log('[PyMIB QR] QR generado ✓');
  });

  // Start countdown
  startQRTimer();
  showToast('✓ QR generado exitosamente', 'success');
}

/**
 * Start the countdown timer
 */
function startQRTimer() {
  if (qrTimerInterval) clearInterval(qrTimerInterval);

  const timerEl = document.getElementById('qr-timer');
  const barEl   = document.getElementById('timer-bar');

  function tick() {
    const remaining = Math.max(0, qrExpiresAt - Date.now());
    const secs      = Math.floor(remaining / 1000);
    const mins      = Math.floor(secs / 60);
    const s         = secs % 60;
    const pct       = (remaining / (QR_EXPIRY_SECONDS * 1000)) * 100;

    timerEl.textContent = `${mins}:${String(s).padStart(2, '0')}`;
    barEl.style.width   = `${pct}%`;

    // Color states
    timerEl.classList.remove('urgent', 'critical');
    barEl.classList.remove('urgent', 'critical');

    if (secs <= 30) {
      timerEl.classList.add('critical');
      barEl.classList.add('critical');
    } else if (secs <= 90) {
      timerEl.classList.add('urgent');
      barEl.classList.add('urgent');
    }

    // Auto-regenerate when expired
    if (remaining <= 0) {
      clearInterval(qrTimerInterval);
      showToast('⚡ QR expirado — regenerando automáticamente', 'info');
      setTimeout(() => generateQR(), 800);
    }
  }

  tick();
  qrTimerInterval = setInterval(tick, 1000);
}

/**
 * Validate a scanned QR payload string
 * Returns parsed data or null if invalid/expired
 */
function validateQRPayload(raw) {
  try {
    const data = JSON.parse(raw);
    if (!data.supervisor || !data.proyecto || !data.token || !data.expires) return null;
    if (Date.now() > data.expires) return null;  // expired
    return data;
  } catch {
    return null;
  }
}
