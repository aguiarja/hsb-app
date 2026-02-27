// ==================== MÓDULO DE PRODUCCIÓN — HSB APP ====================
// Lógica exclusiva del módulo de Producción (Planta de Hielo)
// No mezclar con mantenimiento.js

'use strict';

// ==================== CONSTANTES ====================
const CUBA_ROWS = 24;
const CUBA_COLS = ['A', 'B', 'C', 'D'];
const MOLDS_PER_MODULE = 6;
const COL_INDEX = { A: 1, B: 2, C: 3, D: 4 };

// ==================== VARIABLES GLOBALES ====================
let database, storage;
let currentUser = null;
let currentDate = '';
let productionRecord = null;  // Registro del día actual
let operators = {};           // Catálogo de operadores
let productionRecords = {};   // Todos los registros (para historial)

// Firebase refs
let productionRef, operatorsRef;

// ==================== UTILIDADES DE FECHA (LOCAL, NO UTC) ====================

function getLocalDateString(date) {
    const d = date || new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getOperationalDate() {
    const now = new Date();
    if (now.getHours() < 6) {
        now.setDate(now.getDate() - 1);
    }
    return getLocalDateString(now);
}

function getCurrentTimeString() {
    const now = new Date();
    return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
}

function formatDateDisplay(dateStr) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}

// ==================== CÁLCULOS DE PRODUCCIÓN ====================

/** Convierte coordenada (row, col) a índice lineal */
function coordToIndex(row, col) {
    return (row - 1) * 4 + COL_INDEX[col];
}

/** Calcula todos los KPIs a partir de datos de inicio y fin */
function calculateKPIs(startRow, startCol, endRow, endCol, startTime, endTime) {
    const startIndex = coordToIndex(startRow, startCol);
    const endIndex = coordToIndex(endRow, endCol);

    if (endIndex < startIndex) return null;

    const modulesProduced = endIndex - startIndex + 1;
    const moldsProduced = modulesProduced * MOLDS_PER_MODULE;
    const rowsProduced = endRow - startRow + 1;

    // Calcular tiempo
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const totalMinutes = (eh * 60 + em) - (sh * 60 + sm);

    if (totalMinutes <= 0) return null;

    const totalHours = parseFloat((totalMinutes / 60).toFixed(2));
    const rowsPerHour = parseFloat((rowsProduced / totalHours).toFixed(2));

    return {
        modulesProduced,
        moldsProduced,
        rowsProduced,
        totalMinutes,
        totalHours,
        rowsPerHour
    };
}

// ==================== FIREBASE INIT ====================

async function initProduccion() {
    // Verificar sesión
    const storedUser = localStorage.getItem('currentUser');
    if (!storedUser) {
        window.location.href = './index.html';
        return;
    }
    currentUser = JSON.parse(storedUser);
    currentDate = getOperationalDate();

    // Mostrar info de usuario
    document.getElementById('currentUserName').textContent = currentUser.fullName;
    document.getElementById('currentUserRole').textContent =
        currentUser.role === 'admin' ? 'Administrador' :
        currentUser.role === 'supervisor' ? 'Supervisor' : 'Operador';

    // Mostrar fecha operacional
    document.getElementById('currentDateDisplay').textContent = formatDateDisplay(currentDate);

    // Esperar Firebase
    try {
        await waitForFirebase();
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        storage = firebase.storage();

        productionRef = database.ref('production_records');
        operatorsRef = database.ref('operators');

        await loadData();
        setupRealtimeSync();
        showTab('produccion');
        startSystemClock();
        startDayCheck();

        document.getElementById('loadingOverlay').classList.remove('active');
        console.log('✅ Módulo Producción inicializado');
    } catch (err) {
        console.error('❌ Error inicializando producción:', err);
        document.getElementById('loadingOverlay').innerHTML =
            '<div style="color:white;text-align:center;"><h2>Error de conexión</h2><p>No se pudo conectar a Firebase</p><button onclick="location.reload()" style="margin-top:15px;padding:10px 20px;border:none;border-radius:8px;background:white;color:#1e3c72;cursor:pointer;">Reintentar</button></div>';
    }
}

function waitForFirebase() {
    return new Promise((resolve, reject) => {
        if (typeof firebase !== 'undefined') return resolve();
        let attempts = 0;
        const check = setInterval(() => {
            attempts++;
            if (typeof firebase !== 'undefined') { clearInterval(check); resolve(); }
            else if (attempts > 100) { clearInterval(check); reject(new Error('Firebase no cargó')); }
        }, 100);
    });
}

async function loadData() {
    const [prodSnap, opSnap] = await Promise.all([
        productionRef.once('value'),
        operatorsRef.once('value')
    ]);

    productionRecords = prodSnap.val() || {};
    operators = opSnap.val() || {};
    window.productionRecords = productionRecords;
    window.operators = operators;

    productionRecord = productionRecords[currentDate] || null;
}

function setupRealtimeSync() {
    productionRef.on('value', snap => {
        productionRecords = snap.val() || {};
        window.productionRecords = productionRecords;
        productionRecord = productionRecords[currentDate] || null;
        renderCurrentTab();
    });

    operatorsRef.on('value', snap => {
        operators = snap.val() || {};
        window.operators = operators;
    });
}

// ==================== UI — SYNC INDICATOR ====================

function showSyncIndicator(message, type) {
    const el = document.getElementById('syncIndicator');
    el.textContent = message;
    el.className = 'sync-indicator ' + type;
    if (type === 'synced' || type === 'error') {
        setTimeout(() => { el.className = 'sync-indicator'; }, 3000);
    }
}

// ==================== UI — TABS ====================

let currentTab = 'produccion';

function showTab(tabId) {
    currentTab = tabId;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    const btn = document.querySelector(`.tab[data-tab="${tabId}"]`);
    if (btn) btn.classList.add('active');

    const content = document.getElementById(`tab-${tabId}`);
    if (content) content.classList.add('active');

    renderCurrentTab();
}

function renderCurrentTab() {
    if (currentTab === 'produccion') renderProduccion();
    else if (currentTab === 'reporte') renderReporteProduccion();
    else if (currentTab === 'historial-prod') renderHistorialProduccion();
    else if (currentTab === 'config-operadores') renderOperadores();
}

// ==================== PANTALLA PRODUCCIÓN (ESTADOS A-D) ====================

function renderProduccion() {
    const container = document.getElementById('produccionContent');
    const rec = productionRecord;

    if (!rec) {
        // ESTADO A: No iniciada
        container.innerHTML = `
            <div class="report-summary" style="text-align:center; padding:40px;">
                <div style="font-size:80px; margin-bottom:20px;">🧊</div>
                <h2 style="color:#1e3c72; margin-bottom:10px;">Producción del Día</h2>
                <p style="color:#666; margin-bottom:5px;">${formatDateDisplay(currentDate)}</p>
                <p style="color:#999; margin-bottom:30px;">No se ha iniciado la producción de hoy</p>
                <button onclick="openStartModal()" class="btn" style="font-size:18px; padding:15px 40px;">
                    ▶️ Iniciar Producción
                </button>
            </div>`;
        return;
    }

    if (rec.confirmed) {
        // ESTADO D: Confirmada
        renderConfirmedState(container, rec);
        return;
    }

    if (rec.endTime) {
        // ESTADO C: Finalizada, pendiente confirmar
        renderPendingConfirmState(container, rec);
        return;
    }

    // ESTADO B: Iniciada
    renderStartedState(container, rec);
}

function renderStartedState(container, rec) {
    const opNames = getOperatorNames(rec.operatorIds || []);
    container.innerHTML = `
        <div class="report-summary" style="border-left:4px solid #ffc107;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 style="color:#1e3c72;">⏳ Producción en Curso</h3>
                <span style="background:#ffc107; color:#333; padding:6px 15px; border-radius:20px; font-size:13px; font-weight:bold;">En proceso</span>
            </div>
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-number">🕐 ${rec.startTime}</div><div class="stat-label">Hora Inicio</div></div>
                <div class="stat-card"><div class="stat-number">${rec.startTemp || '-'}°C</div><div class="stat-label">Temp. Inicio</div></div>
                <div class="stat-card"><div class="stat-number">${rec.startRow}${rec.startCol}</div><div class="stat-label">Fila Inicio</div></div>
                <div class="stat-card"><div class="stat-number">${opNames.length}</div><div class="stat-label">Operadores</div></div>
            </div>
            <p style="color:#666; margin-bottom:20px;">👷 Operadores: <strong>${opNames.join(', ') || 'N/A'}</strong></p>
            <div style="text-align:center;">
                <button onclick="openEndModal()" class="btn" style="background:linear-gradient(135deg,#dc3545,#c82333); font-size:16px; padding:14px 35px;">
                    ⏹️ Finalizar Producción
                </button>
            </div>
        </div>`;
}

function renderPendingConfirmState(container, rec) {
    const kpis = calculateKPIs(rec.startRow, rec.startCol, rec.endRow, rec.endCol, rec.startTime, rec.endTime);
    const opNames = getOperatorNames(rec.operatorIds || []);

    container.innerHTML = `
        <div class="report-summary" style="border-left:4px solid #667eea;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 style="color:#1e3c72;">📋 Resumen de Producción</h3>
                <span style="background:#667eea; color:white; padding:6px 15px; border-radius:20px; font-size:13px; font-weight:bold;">Pendiente confirmar</span>
            </div>
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-number">${kpis ? kpis.moldsProduced : 'N/A'}</div><div class="stat-label">Moldes Producidos</div></div>
                <div class="stat-card"><div class="stat-number">${kpis ? kpis.rowsProduced : 'N/A'}</div><div class="stat-label">Filas Producidas</div></div>
                <div class="stat-card"><div class="stat-number">${kpis ? kpis.totalHours + 'h' : 'N/A'}</div><div class="stat-label">Tiempo Total</div></div>
                <div class="stat-card"><div class="stat-number">${kpis ? kpis.rowsPerHour : 'N/A'}</div><div class="stat-label">Filas/Hora</div></div>
            </div>
            <div style="background:#f8f9fa; padding:15px; border-radius:8px; margin-bottom:20px;">
                <p><strong>Rango:</strong> ${rec.startRow}${rec.startCol} → ${rec.endRow}${rec.endCol}</p>
                <p><strong>Horario:</strong> ${rec.startTime} — ${rec.endTime}</p>
                <p><strong>Temperatura:</strong> ${rec.startTemp || '-'}°C → ${rec.endTemp || '-'}°C</p>
                <p><strong>Módulos:</strong> ${kpis ? kpis.modulesProduced : 'N/A'}</p>
                <p><strong>Operadores:</strong> ${opNames.join(', ') || 'N/A'}</p>
            </div>
            <div style="text-align:center; display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                <button onclick="openEditModal()" class="btn" style="background:#ffc107; color:#333;">✏️ Editar</button>
                <button onclick="confirmProduction()" class="btn btn-secondary" style="font-size:16px; padding:14px 35px;">✅ Confirmar Producción</button>
            </div>
        </div>`;
}

function renderConfirmedState(container, rec) {
    const kpis = calculateKPIs(rec.startRow, rec.startCol, rec.endRow, rec.endCol, rec.startTime, rec.endTime);
    const opNames = getOperatorNames(rec.operatorIds || []);

    container.innerHTML = `
        <div class="report-summary" style="border-left:4px solid #28a745;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 style="color:#1e3c72;">✅ Producción Confirmada</h3>
                <span style="background:#28a745; color:white; padding:6px 15px; border-radius:20px; font-size:13px; font-weight:bold;">Confirmada</span>
            </div>
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-number">${kpis ? kpis.moldsProduced : rec.moldsProduced || 'N/A'}</div><div class="stat-label">Moldes Producidos</div></div>
                <div class="stat-card"><div class="stat-number">${kpis ? kpis.rowsProduced : rec.rowsProduced || 'N/A'}</div><div class="stat-label">Filas Producidas</div></div>
                <div class="stat-card"><div class="stat-number">${kpis ? kpis.totalHours + 'h' : rec.totalHours + 'h' || 'N/A'}</div><div class="stat-label">Tiempo Total</div></div>
                <div class="stat-card"><div class="stat-number">${kpis ? kpis.rowsPerHour : rec.rowsPerHour || 'N/A'}</div><div class="stat-label">Filas/Hora</div></div>
            </div>
            <div style="background:#f1f8f4; padding:15px; border-radius:8px;">
                <p><strong>Rango:</strong> ${rec.startRow}${rec.startCol} → ${rec.endRow}${rec.endCol}</p>
                <p><strong>Horario:</strong> ${rec.startTime} — ${rec.endTime}</p>
                <p><strong>Temperatura:</strong> ${rec.startTemp || '-'}°C → ${rec.endTemp || '-'}°C</p>
                <p><strong>Operadores:</strong> ${opNames.join(', ') || 'N/A'}</p>
            </div>
            <p style="text-align:center; color:#28a745; margin-top:15px; font-size:13px;">🔒 Registro bloqueado — no editable</p>
        </div>`;
}

// ==================== HELPERS ====================

function getOperatorNames(ids) {
    if (!ids || ids.length === 0) return [];
    return ids.map(id => {
        const op = operators[id];
        return op ? op.name : 'Desconocido';
    });
}

function buildRowOptions(selected) {
    let html = '<option value="">--</option>';
    for (let i = 1; i <= CUBA_ROWS; i++) {
        html += `<option value="${i}" ${i == selected ? 'selected' : ''}>${i}</option>`;
    }
    return html;
}

function buildColOptions(selected) {
    return CUBA_COLS.map(c =>
        `<option value="${c}" ${c === selected ? 'selected' : ''}>${c}</option>`
    ).join('');
}

function buildOperatorCheckboxes(selectedIds) {
    const sel = selectedIds || [];
    const activeOps = Object.entries(operators).filter(([, op]) => op.isActive !== false);

    if (activeOps.length === 0) {
        return '<p style="color:#999;">No hay operadores configurados. Agrégalos en Configuración.</p>';
    }

    return activeOps.map(([id, op]) =>
        `<label style="display:flex; align-items:center; gap:8px; padding:6px 0; cursor:pointer;">
            <input type="checkbox" name="operatorCheck" value="${id}" ${sel.includes(id) ? 'checked' : ''} style="width:20px; height:20px;">
            <span>${op.name}</span>
        </label>`
    ).join('');
}

function getSelectedOperators() {
    return Array.from(document.querySelectorAll('input[name="operatorCheck"]:checked')).map(cb => cb.value);
}

// ==================== MODALES ====================

function openStartModal() {
    document.getElementById('startTime').value = getCurrentTimeString();
    document.getElementById('startTemp').value = '';
    document.getElementById('startRow').innerHTML = buildRowOptions(1);
    document.getElementById('startCol').innerHTML = buildColOptions('A');
    document.getElementById('startOperators').innerHTML = buildOperatorCheckboxes([]);
    document.getElementById('startModal').style.display = 'block';
}

function closeStartModal() {
    document.getElementById('startModal').style.display = 'none';
}

async function saveStart() {
    const startTime = document.getElementById('startTime').value;
    const startTemp = parseFloat(document.getElementById('startTemp').value);
    const startRow = parseInt(document.getElementById('startRow').value);
    const startCol = document.getElementById('startCol').value;
    const operatorIds = getSelectedOperators();

    // Validaciones
    if (!startTime) return alert('La hora de inicio es requerida');
    if (!startRow || !startCol) return alert('La fila de inicio es requerida');
    if (isNaN(startTemp)) return alert('La temperatura de inicio es requerida');
    if (operatorIds.length === 0) return alert('Selecciona al menos un operador');

    const record = {
        date: currentDate,
        startTime,
        startTemp,
        startRow,
        startCol,
        endTime: null,
        endTemp: null,
        endRow: null,
        endCol: null,
        operatorIds,
        operatorNamesSnapshot: getOperatorNames(operatorIds),
        confirmed: false,
        createdBy: currentUser.fullName,
        createdAt: new Date().toISOString()
    };

    try {
        showSyncIndicator('⚙️ Guardando inicio...', 'syncing');
        await productionRef.child(currentDate).set(record);
        productionRecord = record;
        closeStartModal();
        showSyncIndicator('✓ Producción iniciada', 'synced');
        renderProduccion();
    } catch (err) {
        console.error('Error guardando inicio:', err);
        showSyncIndicator('✗ Error al guardar', 'error');
    }
}

function openEndModal() {
    document.getElementById('endTime').value = getCurrentTimeString();
    document.getElementById('endTemp').value = '';
    document.getElementById('endRow').innerHTML = buildRowOptions('');
    document.getElementById('endCol').innerHTML = buildColOptions('D');
    document.getElementById('endModal').style.display = 'block';
}

function closeEndModal() {
    document.getElementById('endModal').style.display = 'none';
}

async function saveEnd() {
    const endTime = document.getElementById('endTime').value;
    const endTemp = parseFloat(document.getElementById('endTemp').value);
    const endRow = parseInt(document.getElementById('endRow').value);
    const endCol = document.getElementById('endCol').value;

    if (!endTime) return alert('La hora de fin es requerida');
    if (!endRow || !endCol) return alert('La fila de fin es requerida');
    if (isNaN(endTemp)) return alert('La temperatura de fin es requerida');

    // Validar que fin >= inicio
    const endIdx = coordToIndex(endRow, endCol);
    const startIdx = coordToIndex(productionRecord.startRow, productionRecord.startCol);
    if (endIdx < startIdx) return alert('La posición de fin debe ser posterior a la de inicio');

    // Validar hora
    const [sh, sm] = productionRecord.startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    if ((eh * 60 + em) <= (sh * 60 + sm)) return alert('La hora de fin debe ser posterior a la hora de inicio');

    try {
        showSyncIndicator('⚙️ Guardando fin...', 'syncing');
        await productionRef.child(currentDate).update({ endTime, endTemp, endRow, endCol });
        productionRecord.endTime = endTime;
        productionRecord.endTemp = endTemp;
        productionRecord.endRow = endRow;
        productionRecord.endCol = endCol;
        closeEndModal();
        showSyncIndicator('✓ Producción finalizada', 'synced');
        renderProduccion();
    } catch (err) {
        console.error('Error guardando fin:', err);
        showSyncIndicator('✗ Error al guardar', 'error');
    }
}

function openEditModal() {
    const rec = productionRecord;
    if (!rec) return;

    document.getElementById('editStartTime').value = rec.startTime;
    document.getElementById('editStartTemp').value = rec.startTemp || '';
    document.getElementById('editStartRow').innerHTML = buildRowOptions(rec.startRow);
    document.getElementById('editStartCol').innerHTML = buildColOptions(rec.startCol);
    document.getElementById('editEndTime').value = rec.endTime || '';
    document.getElementById('editEndTemp').value = rec.endTemp || '';
    document.getElementById('editEndRow').innerHTML = buildRowOptions(rec.endRow);
    document.getElementById('editEndCol').innerHTML = buildColOptions(rec.endCol);
    document.getElementById('editOperators').innerHTML = buildOperatorCheckboxes(rec.operatorIds);
    document.getElementById('editModal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

async function saveEdit() {
    const startTime = document.getElementById('editStartTime').value;
    const startTemp = parseFloat(document.getElementById('editStartTemp').value);
    const startRow = parseInt(document.getElementById('editStartRow').value);
    const startCol = document.getElementById('editStartCol').value;
    const endTime = document.getElementById('editEndTime').value;
    const endTemp = parseFloat(document.getElementById('editEndTemp').value);
    const endRow = parseInt(document.getElementById('editEndRow').value);
    const endCol = document.getElementById('editEndCol').value;
    const operatorIds = getSelectedOperators();

    if (!startTime || !startRow || !startCol) return alert('Datos de inicio incompletos');
    if (!endTime || !endRow || !endCol) return alert('Datos de fin incompletos');
    if (isNaN(startTemp)) return alert('Temperatura de inicio requerida');
    if (isNaN(endTemp)) return alert('Temperatura de fin requerida');
    if (operatorIds.length === 0) return alert('Selecciona al menos un operador');

    const endIdx = coordToIndex(endRow, endCol);
    const startIdx = coordToIndex(startRow, startCol);
    if (endIdx < startIdx) return alert('La posición de fin debe ser posterior a la de inicio');

    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    if ((eh * 60 + em) <= (sh * 60 + sm)) return alert('La hora de fin debe ser posterior a la hora de inicio');

    try {
        showSyncIndicator('⚙️ Guardando cambios...', 'syncing');
        await productionRef.child(currentDate).update({
            startTime, startTemp, startRow, startCol,
            endTime, endTemp, endRow, endCol,
            operatorIds,
            operatorNamesSnapshot: getOperatorNames(operatorIds)
        });
        closeEditModal();
        showSyncIndicator('✓ Cambios guardados', 'synced');
    } catch (err) {
        console.error('Error editando:', err);
        showSyncIndicator('✗ Error al guardar', 'error');
    }
}

async function confirmProduction() {
    const rec = productionRecord;
    if (!rec || !rec.endTime) return alert('Debe finalizar la producción primero');

    if (!confirm('¿Confirmar producción? Esta acción no se puede deshacer.')) return;

    const kpis = calculateKPIs(rec.startRow, rec.startCol, rec.endRow, rec.endCol, rec.startTime, rec.endTime);
    if (!kpis) return alert('Error en cálculo de KPIs. Verifique los datos.');

    try {
        showSyncIndicator('⚙️ Confirmando...', 'syncing');
        await productionRef.child(currentDate).update({
            confirmed: true,
            modulesProduced: kpis.modulesProduced,
            moldsProduced: kpis.moldsProduced,
            rowsProduced: kpis.rowsProduced,
            totalMinutes: kpis.totalMinutes,
            totalHours: kpis.totalHours,
            rowsPerHour: kpis.rowsPerHour,
            confirmedAt: new Date().toISOString(),
            confirmedBy: currentUser.fullName
        });
        showSyncIndicator('✅ Producción confirmada', 'synced');
    } catch (err) {
        console.error('Error confirmando:', err);
        showSyncIndicator('✗ Error al confirmar', 'error');
    }
}

// ==================== REPORTE DE PRODUCCIÓN ====================

function renderReporteProduccion() {
    const container = document.getElementById('reporteProdContent');
    const rec = productionRecord;

    if (!rec) {
        container.innerHTML = '<div class="report-summary"><p style="text-align:center; color:#999; padding:30px;">No hay producción registrada para hoy.</p></div>';
        return;
    }

    const kpis = (rec.endTime) ? calculateKPIs(rec.startRow, rec.startCol, rec.endRow, rec.endCol, rec.startTime, rec.endTime) : null;
    const opNames = getOperatorNames(rec.operatorIds || []);
    const statusLabel = rec.confirmed ? '✅ Confirmada' : (rec.endTime ? '⏳ Pendiente confirmar' : '🔄 En proceso');
    const statusColor = rec.confirmed ? '#28a745' : (rec.endTime ? '#667eea' : '#ffc107');

    let html = `
        <div class="report-summary" style="border-left:4px solid ${statusColor};">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 style="color:#1e3c72;">🧊 Reporte de Producción</h3>
                <span style="background:${statusColor}; color:white; padding:6px 15px; border-radius:20px; font-size:13px; font-weight:bold;">${statusLabel}</span>
            </div>
            <p style="color:#667eea; font-weight:bold; margin-bottom:15px;">${formatDateDisplay(currentDate)}</p>`;

    if (kpis) {
        html += `
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-number">${kpis.moldsProduced}</div><div class="stat-label">Moldes Producidos</div></div>
                <div class="stat-card"><div class="stat-number">${kpis.rowsProduced}</div><div class="stat-label">Filas Producidas</div></div>
                <div class="stat-card"><div class="stat-number">${kpis.totalHours}h</div><div class="stat-label">Duración</div></div>
                <div class="stat-card"><div class="stat-number">${kpis.rowsPerHour}</div><div class="stat-label">Filas/Hora</div></div>
            </div>
            <div style="background:#f8f9fa; padding:15px; border-radius:8px;">
                <p><strong>Rango producido:</strong> Desde ${rec.startRow}${rec.startCol} hasta ${rec.endRow}${rec.endCol}</p>
                <p><strong>Filas:</strong> De la fila ${rec.startRow} a la ${rec.endRow}</p>
                <p><strong>Módulos:</strong> ${kpis.modulesProduced} módulos × 6 = ${kpis.moldsProduced} moldes</p>
                <p><strong>Horario:</strong> ${rec.startTime} — ${rec.endTime} (${kpis.totalHours} horas)</p>
                <p><strong>Temperatura:</strong> ${rec.startTemp || '-'}°C → ${rec.endTemp || '-'}°C</p>
                <p><strong>Operadores:</strong> ${opNames.join(', ') || 'N/A'}</p>
            </div>`;
    } else {
        html += `
            <div style="background:#fff3e0; padding:15px; border-radius:8px;">
                <p><strong>Hora inicio:</strong> ${rec.startTime}</p>
                <p><strong>Posición inicio:</strong> ${rec.startRow}${rec.startCol}</p>
                <p><strong>Temperatura inicio:</strong> ${rec.startTemp || '-'}°C</p>
                <p><strong>Operadores:</strong> ${opNames.join(', ') || 'N/A'}</p>
                <p style="color:#ffc107; font-weight:bold; margin-top:10px;">⏳ Producción en curso — pendiente finalizar</p>
            </div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
}

// ==================== HISTORIAL DE PRODUCCIÓN ====================

function renderHistorialProduccion() {
    const container = document.getElementById('historialProdContent');
    const dates = Object.keys(productionRecords).sort().reverse();

    if (dates.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:40px; color:#999;">No hay registros de producción.</p>';
        return;
    }

    let html = '';
    dates.forEach(date => {
        const rec = productionRecords[date];
        const kpis = (rec.endTime && rec.startTime) ?
            calculateKPIs(rec.startRow, rec.startCol, rec.endRow, rec.endCol, rec.startTime, rec.endTime) : null;
        const opNames = rec.operatorNamesSnapshot || getOperatorNames(rec.operatorIds || []);
        const statusIcon = rec.confirmed ? '✅' : (rec.endTime ? '⏳' : '🔄');
        const borderColor = rec.confirmed ? '#28a745' : (rec.endTime ? '#667eea' : '#ffc107');

        html += `
            <div class="report-summary" style="margin-bottom:15px; border-left:4px solid ${borderColor};">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <h3 style="color:#1e3c72; font-size:16px;">📅 ${formatDateDisplay(date)}</h3>
                    <span style="font-size:14px;">${statusIcon}</span>
                </div>`;

        if (kpis) {
            html += `
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(120px, 1fr)); gap:10px; margin-bottom:10px;">
                    <div style="background:#f8f9fa; padding:8px; border-radius:6px; text-align:center;">
                        <strong style="color:#1e3c72; font-size:18px;">${kpis.moldsProduced}</strong><br>
                        <small style="color:#666;">Moldes</small>
                    </div>
                    <div style="background:#f8f9fa; padding:8px; border-radius:6px; text-align:center;">
                        <strong style="color:#1e3c72; font-size:18px;">${kpis.rowsProduced}</strong><br>
                        <small style="color:#666;">Filas</small>
                    </div>
                    <div style="background:#f8f9fa; padding:8px; border-radius:6px; text-align:center;">
                        <strong style="color:#1e3c72; font-size:18px;">${kpis.totalHours}h</strong><br>
                        <small style="color:#666;">Tiempo</small>
                    </div>
                    <div style="background:#f8f9fa; padding:8px; border-radius:6px; text-align:center;">
                        <strong style="color:#1e3c72; font-size:18px;">${kpis.rowsPerHour}</strong><br>
                        <small style="color:#666;">Filas/h</small>
                    </div>
                </div>
                <p style="color:#666; font-size:13px;">
                    <strong>Rango:</strong> ${rec.startRow}${rec.startCol} → ${rec.endRow}${rec.endCol} &nbsp;|&nbsp;
                    <strong>Horario:</strong> ${rec.startTime} — ${rec.endTime} &nbsp;|&nbsp;
                    <strong>Temp:</strong> ${rec.startTemp || '-'}°C → ${rec.endTemp || '-'}°C
                </p>`;
        } else {
            html += `<p style="color:#ffc107;">⏳ Producción en curso</p>`;
        }

        html += `<p style="color:#666; font-size:13px; margin-top:5px;">👷 ${Array.isArray(opNames) ? opNames.join(', ') : opNames}</p>`;
        html += `</div>`;
    });

    container.innerHTML = html;
}

// ==================== CONFIGURACIÓN — OPERADORES ====================

function renderOperadores() {
    const container = document.getElementById('operadoresContent');
    const opList = Object.entries(operators);

    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3 style="color:#1e3c72;">👷 Operadores</h3>
            <button onclick="openAddOperatorModal()" style="background:#28a745; color:white; border:none; padding:10px 20px; border-radius:8px; cursor:pointer; font-weight:bold;">
                ➕ Agregar Operador
            </button>
        </div>`;

    if (opList.length === 0) {
        html += '<p style="text-align:center; padding:30px; color:#999;">No hay operadores registrados.</p>';
    } else {
        opList.forEach(([id, op]) => {
            const statusBadge = op.isActive !== false
                ? '<span style="background:#28a745; color:white; padding:2px 8px; border-radius:10px; font-size:11px;">Activo</span>'
                : '<span style="background:#dc3545; color:white; padding:2px 8px; border-radius:10px; font-size:11px;">Inactivo</span>';

            html += `
                <div style="background:white; border:1px solid #e0e0e0; border-radius:8px; padding:15px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong style="font-size:16px;">${op.name}</strong> ${statusBadge}
                        ${op.identifier ? `<br><small style="color:#666;">ID: ${op.identifier}</small>` : ''}
                    </div>
                    <div style="display:flex; gap:6px;">
                        <button onclick="toggleOperator('${id}')" style="background:${op.isActive !== false ? '#ffc107' : '#28a745'}; color:white; border:none; padding:6px 12px; border-radius:5px; cursor:pointer; font-size:12px;">
                            ${op.isActive !== false ? '⏸ Desactivar' : '▶ Activar'}
                        </button>
                        <button onclick="editOperator('${id}')" style="background:#667eea; color:white; border:none; padding:6px 12px; border-radius:5px; cursor:pointer; font-size:12px;">
                            ✏️ Editar
                        </button>
                    </div>
                </div>`;
        });
    }

    container.innerHTML = html;
}

function openAddOperatorModal() {
    document.getElementById('operatorModalTitle').textContent = 'Agregar Operador';
    document.getElementById('operatorName').value = '';
    document.getElementById('operatorId').value = '';
    document.getElementById('operatorEditKey').value = '';
    document.getElementById('operatorModal').style.display = 'block';
}

function editOperator(key) {
    const op = operators[key];
    if (!op) return;
    document.getElementById('operatorModalTitle').textContent = 'Editar Operador';
    document.getElementById('operatorName').value = op.name;
    document.getElementById('operatorId').value = op.identifier || '';
    document.getElementById('operatorEditKey').value = key;
    document.getElementById('operatorModal').style.display = 'block';
}

function closeOperatorModal() {
    document.getElementById('operatorModal').style.display = 'none';
}

async function saveOperator() {
    const name = document.getElementById('operatorName').value.trim();
    const identifier = document.getElementById('operatorId').value.trim();
    const editKey = document.getElementById('operatorEditKey').value;

    if (!name) return alert('El nombre es requerido');

    try {
        showSyncIndicator('⚙️ Guardando operador...', 'syncing');
        if (editKey) {
            await operatorsRef.child(editKey).update({ name, identifier, updatedAt: new Date().toISOString() });
        } else {
            await operatorsRef.push({ name, identifier, isActive: true, createdAt: new Date().toISOString() });
        }
        closeOperatorModal();
        showSyncIndicator('✓ Operador guardado', 'synced');
        renderOperadores();
    } catch (err) {
        console.error('Error guardando operador:', err);
        showSyncIndicator('✗ Error', 'error');
    }
}

async function toggleOperator(key) {
    const op = operators[key];
    if (!op) return;
    const newStatus = op.isActive === false ? true : false;
    try {
        await operatorsRef.child(key).update({ isActive: newStatus, updatedAt: new Date().toISOString() });
        showSyncIndicator(newStatus ? '✓ Operador activado' : '✓ Operador desactivado', 'synced');
    } catch (err) {
        showSyncIndicator('✗ Error', 'error');
    }
}

// ==================== RELOJ Y CHEQUEO DE DÍA ====================

function startSystemClock() {
    function update() {
        const now = new Date();
        const clockEl = document.getElementById('clockTime');
        const dateEl = document.getElementById('clockDate');
        if (clockEl) clockEl.textContent = now.toLocaleTimeString('es-ES');
        if (dateEl) dateEl.textContent = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    }
    update();
    setInterval(update, 1000);
}

function startDayCheck() {
    setInterval(() => {
        const newDate = getOperationalDate();
        if (newDate !== currentDate) {
            console.log(`🔄 Cambio de día: ${currentDate} → ${newDate}`);
            currentDate = newDate;
            productionRecord = productionRecords[currentDate] || null;
            document.getElementById('currentDateDisplay').textContent = formatDateDisplay(currentDate);
            renderCurrentTab();
        }
    }, 5 * 60 * 1000);
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = './index.html';
}

// ==================== INIT ====================
window.addEventListener('load', initProduccion);
