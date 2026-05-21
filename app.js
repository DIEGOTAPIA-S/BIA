// Core Lógica: BIA Interactive Suite - Colmédica / Aliansalud
// 100% JavaScript Nativo, sin dependencias.

// Estado global de la aplicación
let baseDatos = null;
let vistaActiva = 'dashboard';
let idProcesoActivo = '';
let transicionGuardadoPendiente = null; // Almacena el callback de guardado antes de pedir justificación

function getNivelesImpacto() {
  const niveles = baseDatos?.configuracion?.nivelesImpacto || [];
  return niveles.slice().sort((a, b) => a.orden - b.orden);
}

function getNivelImpactoMap() {
  const map = {};
  getNivelesImpacto().forEach(n => { map[n.id] = n; });
  return map;
}

// Tiempos de interrupción (columnas)
const COLUMNAS_TIEMPOS = [
  { clave: 0, etiqueta: "1 día" },
  { clave: 1, etiqueta: "3 días" },
  { clave: 2, etiqueta: "1 semana" },
  { clave: 3, etiqueta: "1 mes" }
];

// Categorías de Impacto (Filas)
const FILAS_IMPACTOS = [
  { clave: "financiero", etiqueta: "Financieros" },
  { clave: "operacional", etiqueta: "Operacionales" },
  { clave: "legal", etiqueta: "Legales/Normativos" },
  { clave: "reputacional", etiqueta: "A la reputación" }
];

// Al cargar el documento, inicializar la aplicación
document.addEventListener("DOMContentLoaded", () => {
  // Cargar datos
  baseDatos = obtenerDatosBIA();
  
  // Cargar / solicitar nombre de usuario
  const nombreUsuario = obtenerNombreUsuario();
  actualizarNombreEnUI(nombreUsuario);
  
  // Establecer primer proceso como activo por defecto
  if (baseDatos.procesos.length > 0) {
    idProcesoActivo = baseDatos.procesos[0].id;
  }
  
  // Renderizar vistas e inicializar UI
  inicializarUI();
  switchView('dashboard');
  
  // Registrar evento para confirmación de justificación de auditoría
  document.getElementById("btn-confirm-justification").addEventListener("click", confirmarGuardadoConJustificacion);
});

// Actualizar elementos de UI con el nombre del usuario
function actualizarNombreEnUI(nombre) {
  const el = document.getElementById("sidebar-user-name");
  if (el) el.textContent = nombre;
  const av = document.getElementById("sidebar-user-avatar");
  if (av) av.textContent = nombre.split(" ").map(w => w[0]).join("").toUpperCase().substring(0, 2);
}

// Cambiar nombre de usuario
function cambiarNombreUsuario() {
  const actual = localStorage.getItem("bia_usuario_nombre") || "Equipo de Continuidad";
  const nuevo = prompt(`Nombre actual: ${actual}\n\nIngrese su nuevo nombre para el registro de auditoría:`);
  if (nuevo && nuevo.trim()) {
    localStorage.setItem("bia_usuario_nombre", nuevo.trim());
    actualizarNombreEnUI(nuevo.trim());
  }
}

// Inicializar elementos de UI dinámicos
function inicializarUI() {
  cargarSelectoresProceso();
  renderizarDashboard();
  renderizarTablasAplicativosYProveedores();
  renderizarHistorialTimeline();
}

// Cargar selectores de procesos en las distintas vistas
function cargarSelectoresProceso() {
  const selector = document.getElementById("bia-process-selector");
  if (!selector) return;
  
  selector.innerHTML = "";
  
  baseDatos.procesos.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.nombreProceso} - ${p.nombreSubproceso}`;
    selector.appendChild(opt);
  });
  
  // Fijar el seleccionado
  if (idProcesoActivo) {
    selector.value = idProcesoActivo;
    cargarDetalleProceso(idProcesoActivo);
  }
}

// Controlador de pestañas (Navegación SPA)
function switchView(viewId) {
  vistaActiva = viewId;
  
  // Quitar activo de todos los menús
  document.querySelectorAll(".menu-item").forEach(el => el.classList.remove("active"));
  // Activar actual
  const menuEl = document.getElementById(`menu-${viewId}`);
  if (menuEl) menuEl.classList.add("active");
  
  // Ocultar todas las secciones
  document.querySelectorAll(".content-section").forEach(el => el.classList.remove("active"));
  // Mostrar sección activa
  const sectEl = document.getElementById(`section-${viewId}`);
  if (sectEl) sectEl.classList.add("active");
  
  // Actualizar Títulos de Cabecera
  const viewTitle = document.getElementById("view-title");
  const viewSubtitle = document.getElementById("view-subtitle");
  const btnAddPrimary = document.getElementById("btn-add-primary");
  
  if (viewTitle && viewSubtitle) {
    switch(viewId) {
      case 'dashboard':
        viewTitle.textContent = "Dashboard General";
        viewSubtitle.textContent = "Resumen ejecutivo del estado del SGCN y criticidades.";
        btnAddPrimary.style.display = "flex";
        btnAddPrimary.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 4v16m8-8H4" stroke="currentColor" stroke-width="2" fill="none"/></svg> Nuevo Proceso BIA`;
        btnAddPrimary.onclick = () => abrirCreadorProceso();
        renderizarDashboard();
        break;
      case 'bia':
        viewTitle.textContent = "Matriz de Impacto BIA";
        viewSubtitle.textContent = "Análisis de impacto al negocio detallado por proceso y entidad.";
        btnAddPrimary.style.display = "flex";
        btnAddPrimary.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 4v16m8-8H4" stroke="currentColor" stroke-width="2" fill="none"/></svg> Nuevo Proceso BIA`;
        btnAddPrimary.onclick = () => abrirCreadorProceso();
        if (idProcesoActivo) {
          cargarDetalleProceso(idProcesoActivo);
        }
        break;
      case 'apps':
        viewTitle.textContent = "Riesgo de Aplicativos & TI";
        viewSubtitle.textContent = "Control de continuidad de sistemas de información, RTO y estrategias de TI.";
        btnAddPrimary.style.display = "flex";
        btnAddPrimary.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 4v16m8-8H4" stroke="currentColor" stroke-width="2" fill="none"/></svg> Nuevo Aplicativo`;
        btnAddPrimary.onclick = () => abrirEditorAplicativo();
        renderizarTablasAplicativosYProveedores();
        break;
      case 'suppliers':
        viewTitle.textContent = "Proveedores Críticos";
        viewSubtitle.textContent = "Matriz de dependencia de proveedores externos, SLAs y contactos de emergencia.";
        btnAddPrimary.style.display = "flex";
        btnAddPrimary.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 4v16m8-8H4" stroke="currentColor" stroke-width="2" fill="none"/></svg> Nuevo Proveedor`;
        btnAddPrimary.onclick = () => abrirEditorProveedor();
        renderizarTablasAplicativosYProveedores();
        break;
      case 'history':
        viewTitle.textContent = "Trazabilidad Histórica";
        viewSubtitle.textContent = "Registro inalterable de auditoría sobre actualizaciones del BIA corporativo.";
        btnAddPrimary.style.display = "flex";
        btnAddPrimary.style.background = "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)";
        btnAddPrimary.style.boxShadow = "0 4px 10px rgba(124,58,237,0.25)";
        btnAddPrimary.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> Instantánea Anual`;
        btnAddPrimary.onclick = () => tomarInstantaneaAnual();
        renderizarHistorialTimeline();
        break;
    }
  }
}

// ----------------------------------------------------
// 📊 RENDERIZACIÓN DE GRÁFICOS SVG NATIVOS (DASHBOARD)
// ----------------------------------------------------

function renderizarDashboard() {
  // 1. Calcular métricas resumidas
  const totalProcesos = baseDatos.procesos.length;
  
  // Procesos críticos son aquellos que tienen un RTO en Colmédica o Aliansalud <= 24 horas
  const procesosCriticos = baseDatos.procesos.filter(p => {
    const rtoCol = parseInt(p.impactoColmedica.rto) || 999;
    const rtoAli = parseInt(p.impactoAliansalud.rto) || 999;
    return rtoCol <= 24 || rtoAli <= 24;
  }).length;
  
  const totalApps = baseDatos.aplicativos.length;
  const totalProveedores = baseDatos.proveedores.length;
  
  document.getElementById("stat-total-processes").textContent = totalProcesos;
  document.getElementById("stat-critical-processes").textContent = procesosCriticos;
  document.getElementById("stat-total-apps").textContent = totalApps;
  document.getElementById("stat-total-suppliers").textContent = totalProveedores;
  
  // 2. Renderizar Tabla General de Resumen
  const tbody = document.getElementById("dashboard-process-tbody");
  tbody.innerHTML = "";
  
  baseDatos.procesos.forEach(p => {
    const tr = document.createElement("tr");
    tr.style.cursor = "pointer";
    tr.onclick = () => {
      idProcesoActivo = p.id;
      switchView('bia');
    };
    
    tr.innerHTML = `
      <td><strong>${p.nombreProceso}</strong></td>
      <td>${p.nombreSubproceso}</td>
      <td><span class="colmedica-badge">${p.impactoColmedica.rto}</span></td>
      <td><span class="aliansalud-badge">${p.impactoAliansalud.rto}</span></td>
      <td>${p.impactoColmedica.mtpd}</td>
      <td>${p.impactoAliansalud.mtpd}</td>
      <td>${p.fechaActualizacion}</td>
    `;
    tbody.appendChild(tr);
  });
  
  // 3. Renderizar Gráfico de RTOs (Barras SVG Nativas)
  renderizarGraficoRTOs();
  
  // 4. Renderizar Gráfico de Criticidades (Donut SVG Nativo)
  renderizarGraficoCriticidad();
}

function renderizarGraficoRTOs() {
  const container = document.getElementById("rto-chart-container");
  if (!container) return;
  
  // Contar cuántos procesos caen en cada nivel de RTO (ej. 2 horas, 24 horas, etc.)
  const conteoRTO = {};
  baseDatos.procesos.forEach(p => {
    const rto = p.impactoColmedica.rto || "No definido";
    conteoRTO[rto] = (conteoRTO[rto] || 0) + 1;
  });
  
  const etiquetas = Object.keys(conteoRTO);
  const valores = Object.values(conteoRTO);
  
  if (valores.length === 0) {
    container.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted);">No hay suficientes datos de RTO.</p>`;
    return;
  }
  
  const maxVal = Math.max(...valores, 1);
  const chartHeight = 200;
  const barWidth = 45;
  const gap = 20;
  const paddingLeft = 40;
  const paddingTop = 20;
  const chartWidth = etiquetas.length * (barWidth + gap) + paddingLeft + 20;
  
  let barsHTML = "";
  let axesHTML = "";
  
  // Eje Y y líneas de fondo
  for (let i = 0; i <= maxVal; i++) {
    const y = chartHeight - (i / maxVal) * (chartHeight - paddingTop);
    axesHTML += `
      <line x1="${paddingLeft}" y1="${y}" x2="${chartWidth}" y2="${y}" stroke="var(--border-color)" stroke-width="1" stroke-dasharray="3,3" />
      <text x="${paddingLeft - 10}" y="${y + 4}" font-size="10" font-family="Plus Jakarta Sans" fill="var(--text-muted)" text-anchor="end">${i}</text>
    `;
  }
  
  // Eje X y Barras
  etiquetas.forEach((lbl, index) => {
    const x = paddingLeft + index * (barWidth + gap) + 10;
    const val = conteoRTO[lbl];
    const bHeight = (val / maxVal) * (chartHeight - paddingTop);
    const y = chartHeight - bHeight;
    
    barsHTML += `
      <g class="tooltip">
        <rect class="svg-bar" x="${x}" y="${y}" width="${barWidth}" height="${bHeight}" fill="var(--colmedica-blue)" rx="4">
          <title>${lbl}: ${val} proceso(s)</title>
        </rect>
        <text x="${x + barWidth/2}" y="${y - 8}" font-size="11" font-weight="700" font-family="Plus Jakarta Sans" fill="var(--text-main)" text-anchor="middle">${val}</text>
        <text x="${x + barWidth/2}" y="${chartHeight + 18}" font-size="10" font-family="Plus Jakarta Sans" fill="var(--text-muted)" text-anchor="middle">${lbl}</text>
      </g>
    `;
  });
  
  container.innerHTML = `
    <svg viewBox="0 0 ${chartWidth} ${chartHeight + 35}" style="width:100%; height:100%; max-height:230px;">
      ${axesHTML}
      ${barsHTML}
      <line x1="${paddingLeft}" y1="${chartHeight}" x2="${chartWidth}" y2="${chartHeight}" stroke="var(--text-muted)" stroke-width="1.5" />
    </svg>
  `;
}

function renderizarGraficoCriticidad() {
  const container = document.getElementById("criticality-donut-container");
  if (!container) return;
  
  // Agrupar criticidades. Un proceso es:
  // - "Extrema" si tiene algún impacto "catastrofico" en 1 día o 3 días.
  // - "Alta" si tiene impacto "significativo" en 1 día o 3 días.
  // - "Media" si su impacto máximo es "moderado".
  // - "Baja" si su impacto máximo es "minimo".
  
  let extrema = 0;
  let alta = 0;
  let media = 0;
  let baja = 0;
  
  baseDatos.procesos.forEach(p => {
    const colImps = Object.values(p.impactoColmedica).slice(0, 4).flat();
    const aliImps = Object.values(p.impactoAliansalud).slice(0, 4).flat();
    const imps = [...colImps, ...aliImps];
    
    if (imps.includes("catastrofico")) {
      extrema++;
    } else if (imps.includes("significativo")) {
      alta++;
    } else if (imps.includes("moderado")) {
      media++;
    } else {
      baja++;
    }
  });
  
  const total = extrema + alta + media + baja;
  
  if (total === 0) {
    container.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted);">No hay datos suficientes.</p>`;
    return;
  }
  
  // Calcular porcentajes
  const pExtrema = (extrema / total) * 100;
  const pAlta = (alta / total) * 100;
  const pMedia = (media / total) * 100;
  const pBaja = (baja / total) * 100;
  
  // Radios de Donut SVG
  const r = 50;
  const circ = 2 * Math.PI * r; // 314.15
  
  // Arcos
  const offsetExt = 0;
  const strokeExt = (pExtrema / 100) * circ;
  
  const offsetAlt = strokeExt;
  const strokeAlt = (pAlta / 100) * circ;
  
  const offsetMed = strokeExt + strokeAlt;
  const strokeMed = (pMedia / 100) * circ;
  
  const offsetBaj = strokeExt + strokeAlt + strokeMed;
  const strokeBaj = (pBaja / 100) * circ;
  
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%;">
      <div style="position:relative; width:140px; height:140px;">
        <svg viewBox="0 0 120 120" style="transform: rotate(-90deg); width:140px; height:140px;">
          <!-- Fondo base -->
          <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--bg-input)" stroke-width="12" />
          
          <!-- Segmento Extrema (Rojo) -->
          ${pExtrema > 0 ? `<circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--impact-catastrofico)" stroke-width="12" stroke-dasharray="${strokeExt} ${circ}" stroke-dashoffset="-${offsetExt}" />` : ''}
          
          <!-- Segmento Alta (Naranja) -->
          ${pAlta > 0 ? `<circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--impact-significativo)" stroke-width="12" stroke-dasharray="${strokeAlt} ${circ}" stroke-dashoffset="-${offsetAlt}" />` : ''}
          
          <!-- Segmento Media (Amarillo) -->
          ${pMedia > 0 ? `<circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--impact-moderado)" stroke-width="12" stroke-dasharray="${strokeMed} ${circ}" stroke-dashoffset="-${offsetMed}" />` : ''}
          
          <!-- Segmento Baja (Verde) -->
          ${pBaja > 0 ? `<circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--impact-minimo)" stroke-width="12" stroke-dasharray="${strokeBaj} ${circ}" stroke-dashoffset="-${offsetBaj}" />` : ''}
        </svg>
        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); text-align:center;">
          <span style="font-family:var(--font-title); font-size:1.5rem; font-weight:800; color:var(--text-main);">${total}</span>
          <p style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Procesos</p>
        </div>
      </div>
      
      <!-- Leyendas -->
      <div style="display:flex; justify-content:center; gap:12px; margin-top:16px; flex-wrap:wrap; font-size:0.75rem;">
        <span style="display:flex; align-items:center; gap:4px;"><span style="width:10px; height:10px; border-radius:50%; background-color:var(--impact-catastrofico);"></span> Extrema (${extrema})</span>
        <span style="display:flex; align-items:center; gap:4px;"><span style="width:10px; height:10px; border-radius:50%; background-color:var(--impact-significativo);"></span> Alta (${alta})</span>
        <span style="display:flex; align-items:center; gap:4px;"><span style="width:10px; height:10px; border-radius:50%; background-color:var(--impact-moderado);"></span> Media (${media})</span>
        <span style="display:flex; align-items:center; gap:4px;"><span style="width:10px; height:10px; border-radius:50%; background-color:var(--impact-minimo);"></span> Baja (${baja})</span>
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// 📋 MATRIZ DETALLE BIA (FICHA DE PROCESO & IMPACTO)
// ----------------------------------------------------

function cargarDetalleProceso(idProc) {
  idProcesoActivo = idProc;
  const p = baseDatos.procesos.find(proc => proc.id === idProc);
  if (!p) return;
  
  // 1. Versión y Meta
  document.getElementById("badge-version-proceso").textContent = `Versión ${p.version || 1}`;
  
  // 2. Cargar Generalidades
  const containerGen = document.getElementById("process-general-container");
  containerGen.innerHTML = `
    <div class="general-item">
      <h5>Nombre del Proceso</h5>
      <p>${p.nombreProceso}</p>
    </div>
    <div class="general-item green-accent">
      <h5>Subproceso</h5>
      <p>${p.nombreSubproceso}</p>
    </div>
    <div class="general-item full-width" style="grid-column: 1 / -1;">
      <h5>Descripción del Proceso</h5>
      <p>${p.descripcion}</p>
    </div>
    <div class="general-item">
      <h5>Horario de Funcionamiento</h5>
      <p>${p.horario}</p>
    </div>
    <div class="general-item">
      <h5>Personal (Sede / Teletrabajo)</h5>
      <p>${p.trabajadores}</p>
    </div>
    <div class="general-item">
      <h5>Ubicaciones de Ejecución</h5>
      <p>${p.ubicacion}</p>
    </div>
    <div class="general-item">
      <h5>Períodos de Actividad Máxima</h5>
      <p>${p.periodosActividad}</p>
    </div>
    <div class="general-item full-width" style="grid-column: 1 / -1; border-left-color: #f59e0b;">
      <h5>Proveedores de Apoyo</h5>
      <p>${p.proveedoresApoyo || "Ninguno registrado en la ficha básica."}</p>
    </div>
  `;
  
  // 3. Renderizar Diagrama de Flujo
  renderizarDiagramaFlujo(p);
  
  // 4. Renderizar matrices comparativas Colmédica vs Aliansalud
  renderizarMatrizImpacto('colmedica', p.impactoColmedica);
  renderizarMatrizImpacto('aliansalud', p.impactoAliansalud);
}

function renderizarDiagramaFlujo(proceso) {
  const container = document.getElementById("process-flow-container");
  if (!container) return;
  
  if (!proceso.flujo || proceso.flujo.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:16px;">
        <p style="font-size:0.85rem; color:var(--text-muted);">No se ha diagramado el flujo de interdependencia. Haz clic en "Editar Ficha de Proceso" para agregarlo.</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = "";
  
  proceso.flujo.forEach(f => {
    const row = document.createElement("div");
    row.className = "flow-step-row";
    row.innerHTML = `
      <!-- Entrada -->
      <div class="flow-box">
        <h6>Quien entrega la entrada</h6>
        <p>${f.quienDaEntrada}</p>
        <div class="flow-ti"><strong>Input:</strong> ${f.entrada}</div>
        <div style="font-size:0.7rem; color:var(--text-muted); margin-top:6px; font-weight:600;">(${f.medioEntrada})</div>
      </div>
      
      <div class="flow-connector">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
      </div>
      
      <!-- Actividad / Trámite -->
      <div class="flow-box" style="border-color:var(--colmedica-blue); background-color:var(--colmedica-blue-light);">
        <h6>Trámite / Actividad del Proceso</h6>
        <p style="color:var(--colmedica-blue);">${f.actividad}</p>
        <div class="flow-ti" style="background-color:var(--bg-card);">Medio: ${f.medioRequerido}</div>
      </div>
      
      <div class="flow-connector">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
      </div>
      
      <!-- Salida -->
      <div class="flow-box">
        <h6>Resultado / Salida</h6>
        <p>${f.salida}</p>
        <div style="font-size:0.7rem; color:var(--text-muted); margin-top:6px; font-weight:600;">Medio: ${f.medioSalida}</div>
      </div>
      
      <div class="flow-connector">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
      </div>
      
      <!-- Destinatario -->
      <div class="flow-box" style="border-color:var(--aliansalud-green); background-color:var(--aliansalud-green-light);">
        <h6>A quién se dirige la salida</h6>
        <p style="color:var(--aliansalud-green);">${f.aQuienSeDirige}</p>
      </div>
    `;
    container.appendChild(row);
  });
}

// Renderizar Matriz de Impacto con edición de métricas
function renderizarMatrizImpacto(tipo, impactosObj) {
  const tbody = document.getElementById(`matrix-${tipo}-tbody`);
  if (!tbody) return;
  
  tbody.innerHTML = "";
  
  FILAS_IMPACTOS.forEach(fila => {
    const tr = document.createElement("tr");
    // Label de la fila
    let rowHTML = `<td class="row-label">${fila.etiqueta}</td>`;
    // 4 Columnas de tiempo
    COLUMNAS_TIEMPOS.forEach((col, idx) => {
      const nivel = impactosObj[fila.clave][idx] || "minimo";
      const config = getNivelImpactoMap()[nivel] || { label: nivel, color: "#94a3b8" };
      
      rowHTML += `
        <td>
          <div class="matrix-cell" style="--impact-color: ${config.color};" onclick="ciclarImpacto('${tipo}', '${fila.clave}', ${idx})" title="Calificar Impacto. Clic para cambiar.">
            ${config.label}
          </div>
        </td>
      `;
    });
    
    tr.innerHTML = rowHTML;
    tbody.appendChild(tr);
  });
  
  // Función helper para abrir editor de métricas
  const abrirEditorMetrica = (campo) => {
    const valorActual = impactosObj[campo] || "";
    const nuevoValor = prompt(`Ingrese el nuevo valor para ${campo.toUpperCase()} (actual: ${valorActual})`);
    if (nuevoValor === null) return; // usuario canceló
    // Guardar cambio pendiente con justificación
    const aplicarCambio = () => {
      impactosObj[campo] = nuevoValor.trim() || "";
      // Recalcular sugerencias si se cambia RTO
      if (campo === 'rto' || campo === 'mtpd') sugerirRTODinamico(tipo, impactosObj);
      guardarDatosBIA(baseDatos);
      const procesoActual = baseDatos.procesos.find(proc => proc.id === idProcesoActivo);
      const nombreProceso = procesoActual ? procesoActual.nombreProceso : '';
      registrarAuditoria(`Modificación de ${campo.toUpperCase()}`, `${tipo.toUpperCase()} - Proceso ${nombreProceso}`, `Nuevo valor: ${nuevoValor}`);
      cargarDetalleProceso(idProcesoActivo);
      renderizarDashboard();
    };
    transicionGuardadoPendiente = aplicarCambio;
    abrirModalJustificacion();
  };
  
  // Asignar click handlers a métricas
  const rtoEl = document.getElementById(`metric-${tipo}-rto`);
  if (rtoEl) rtoEl.style.cursor = 'pointer';
  const rpoEl = document.getElementById(`metric-${tipo}-rpo`);
  if (rpoEl) rpoEl.style.cursor = 'pointer';
  const mtpdEl = document.getElementById(`metric-${tipo}-mtpd`);
  if (mtpdEl) mtpdEl.style.cursor = 'pointer';
  
  // Añadir listeners (solo una vez)
  if (rtoEl && !rtoEl.onclick) rtoEl.onclick = () => abrirEditorMetrica('rto');
  if (rpoEl && !rpoEl.onclick) rpoEl.onclick = () => abrirEditorMetrica('rpo');
  if (mtpdEl && !mtpdEl.onclick) mtpdEl.onclick = () => abrirEditorMetrica('mtpd');
  
  // Mostrar valores actuales
  document.getElementById(`metric-${tipo}-rto`).textContent = impactosObj.rto || "No definido";
  document.getElementById(`metric-${tipo}-rpo`).textContent = impactosObj.rpo || "N/A";
  document.getElementById(`metric-${tipo}-mtpd`).textContent = impactosObj.mtpd || "No definido";
}
// Ciclar el nivel de impacto de una celda al hacer clic directamente en la matriz (Experto interactivo)
function ciclarImpacto(tipo, categoriaKey, colIdx) {
  const p = baseDatos.procesos.find(proc => proc.id === idProcesoActivo);
  if (!p) return;
  
  const impactos = tipo === 'colmedica' ? p.impactoColmedica : p.impactoAliansalud;
  const nivelActual = impactos[categoriaKey][colIdx];
  
  const ordenNiveles = getNivelesImpacto().map(n => n.id);
  const idxActual = ordenNiveles.indexOf(nivelActual);
  const siguienteNivel = ordenNiveles[(idxActual + 1) % ordenNiveles.length] || ordenNiveles[0];
  
  // Aplicar cambio
  impactos[categoriaKey][colIdx] = siguienteNivel;
  
  // Recalcular el RTO sugerido automáticamente basado en las reglas del BIA
  sugerirRTODinamico(tipo, impactos);
  
  // Configurar el guardado para cuando se ingrese la justificación
  transicionGuardadoPendiente = () => {
    guardarDatosBIA(baseDatos);
    registrarAuditoria(`Modificación de impacto (${(getNivelImpactoMap()[siguienteNivel]?.label || siguienteNivel)}) en ${tipo.toUpperCase()} - Categoría: ${categoriaKey} - Col: ${COLUMNAS_TIEMPOS[colIdx].etiqueta}`, p.nombreProceso);
    cargarDetalleProceso(idProcesoActivo);
    renderizarDashboard();
  };
  
  // Lanzar modal de justificación
  abrirModalJustificacion();
}

function abrirModalNivelesImpacto() {
  renderizarTablaNivelesImpacto();
  abrirModal("modal-impact-levels");
}

function renderizarTablaNivelesImpacto() {
  const tbody = document.getElementById("impact-levels-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  getNivelesImpacto().forEach((nivel, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${nivel.id}</td><td>${nivel.label}</td><td><input type="color" value="${nivel.color}" onchange="editarColorNivel('${nivel.id}', this.value)"></td><td>${nivel.orden}</td><td style="display:flex;gap:6px;"><button class="btn-icon" onclick="moverNivel('${nivel.id}', -1)" ${idx===0?'disabled':''}>↑</button><button class="btn-icon" onclick="moverNivel('${nivel.id}', 1)" ${idx===getNivelesImpacto().length-1?'disabled':''}>↓</button><button class="btn-icon" onclick="eliminarNivelImpacto('${nivel.id}')">🗑️</button></td>`;
    tbody.appendChild(tr);
  });
}

function registrarCambioCatalogoNiveles(antes, despues, accion) {
  registrarAuditoria(`Catálogo niveles de impacto: ${accion}`, "Configuración", `Antes: ${JSON.stringify(antes)} | Después: ${JSON.stringify(despues)}`);
}

function agregarNivelImpacto() {
  const id = prompt("ID técnico del nivel (sin espacios):");
  if (!id) return;
  const label = prompt("Etiqueta del nivel:");
  if (!label) return;
  const color = prompt("Color HEX (#RRGGBB):", "#64748b") || "#64748b";
  const antes = JSON.parse(JSON.stringify(baseDatos.configuracion.nivelesImpacto));
  baseDatos.configuracion.nivelesImpacto.push({ id: id.trim(), label: label.trim(), color: color.trim(), orden: getNivelesImpacto().length + 1 });
  guardarDatosBIA(baseDatos);
  registrarCambioCatalogoNiveles(antes, baseDatos.configuracion.nivelesImpacto, "alta");
  renderizarTablaNivelesImpacto();
}
function editarColorNivel(id, color) {
  const antes = JSON.parse(JSON.stringify(baseDatos.configuracion.nivelesImpacto));
  const nivel = baseDatos.configuracion.nivelesImpacto.find(n => n.id === id);
  if (!nivel) return;
  nivel.color = color;
  guardarDatosBIA(baseDatos);
  registrarCambioCatalogoNiveles(antes, baseDatos.configuracion.nivelesImpacto, `edición color ${id}`);
  cargarDetalleProceso(idProcesoActivo);
}
function eliminarNivelImpacto(id) {
  if (getNivelesImpacto().length <= 2) return alert("Debe mantener al menos dos niveles.");
  const antes = JSON.parse(JSON.stringify(baseDatos.configuracion.nivelesImpacto));
  baseDatos.configuracion.nivelesImpacto = baseDatos.configuracion.nivelesImpacto.filter(n => n.id !== id).map((n,i)=>({...n, orden:i+1}));
  migrarNivelesEnProcesos();
  guardarDatosBIA(baseDatos);
  registrarCambioCatalogoNiveles(antes, baseDatos.configuracion.nivelesImpacto, `baja ${id}`);
  renderizarTablaNivelesImpacto();
  cargarDetalleProceso(idProcesoActivo);
}
function moverNivel(id, delta) {
  const arr = getNivelesImpacto();
  const idx = arr.findIndex(n=>n.id===id);
  const dest = idx + delta;
  if (idx < 0 || dest < 0 || dest >= arr.length) return;
  const antes = JSON.parse(JSON.stringify(baseDatos.configuracion.nivelesImpacto));
  [arr[idx], arr[dest]] = [arr[dest], arr[idx]];
  arr.forEach((n,i)=>n.orden=i+1);
  baseDatos.configuracion.nivelesImpacto = arr;
  guardarDatosBIA(baseDatos);
  registrarCambioCatalogoNiveles(antes, baseDatos.configuracion.nivelesImpacto, `reordenamiento ${id}`);
  renderizarTablaNivelesImpacto();
}
function migrarNivelesEnProcesos() {
  const ids = new Set(getNivelesImpacto().map(n=>n.id));
  const fallback = getNivelesImpacto()[0]?.id;
  baseDatos.procesos.forEach(p => ["impactoColmedica","impactoAliansalud"].forEach(cl => {
    ["financiero","operacional","legal","reputacional"].forEach(cat => {
      p[cl][cat] = (p[cl][cat] || []).map(v => ids.has(v) ? v : fallback);
    });
  }));
}

// Sugerencia inteligente de RTO según mejores prácticas ISO 22301
function sugerirRTODinamico(tipo, impactosObj) {
  // Regla de ejemplo:
  // Si hay algún "Catastrófico" en 1 día -> RTO sugerido = "24 horas" o "4 horas"
  // Si hay algún "Significativo" en 1 día -> RTO sugerido = "24 horas"
  // Si hay algún "Catastrófico" en 3 días -> RTO sugerido = "72 horas"
  
  const financieros = impactosObj.financiero;
  const operacionales = impactosObj.operacional;
  const legales = impactosObj.legal;
  const reputacionales = impactosObj.reputacional;
  
  let rtoSugerido = impactosObj.rto;
  let mtpdSugerido = impactosObj.mtpd;
  
  // Analizar columna 1 (1 día de interrupción)
  const imps1Dia = [financieros[0], operacionales[0], legales[0], reputacionales[0]];
  // Analizar columna 2 (3 días de interrupción)
  const imps3Dias = [financieros[1], operacionales[1], legales[1], reputacionales[1]];
  
  if (imps1Dia.includes("catastrofico")) {
    rtoSugerido = "4 horas";
    mtpdSugerido = "24 horas";
  } else if (imps1Dia.includes("significativo")) {
    rtoSugerido = "24 horas";
    mtpdSugerido = "48 horas";
  } else if (imps3Dias.includes("catastrofico")) {
    rtoSugerido = "24 horas";
    mtpdSugerido = "72 horas";
  } else if (imps3Dias.includes("significativo")) {
    rtoSugerido = "72 horas";
    mtpdSugerido = "1 semana";
  }
  
  impactosObj.rto = rtoSugerido;
  impactosObj.mtpd = mtpdSugerido;
}

// ----------------------------------------------------
// 🖥️ RIESGO DE APLICATIVOS & PROVEEDORES (TABLAS CRUD)
// ----------------------------------------------------

function renderizarTablasAplicativosYProveedores() {
  // 1. Renderizar Aplicativos (TI)
  const tbodyApps = document.getElementById("apps-tbody");
  if (tbodyApps) {
    tbodyApps.innerHTML = "";
    baseDatos.aplicativos.forEach(app => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${app.nombreProceso}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${app.nombreSubproceso}</span></td>
        <td><span class="colmedica-badge" style="background-color:rgba(0,123,164,0.1); border:1px solid var(--colmedica-blue);">${app.aplicacion}</span></td>
        <td>${app.frecuencia}</td>
        <td><strong style="color:var(--impact-catastrofico);">${app.rtoMaxApp}</strong></td>
        <td>${app.dependenciasClave}</td>
        <td>${app.tipoEstrategia.join(", ")}</td>
        <td>
          <button class="btn-icon" onclick="abrirEditorAplicativo('${app.id}')" title="Editar Aplicativo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
        </td>
      `;
      tbodyApps.appendChild(tr);
    });
  }
  
  // 2. Renderizar Proveedores
  const tbodyProv = document.getElementById("suppliers-tbody");
  if (tbodyProv) {
    tbodyProv.innerHTML = "";
    baseDatos.proveedores.forEach(prov => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${prov.nombreProceso}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${prov.nombreSubproceso}</span></td>
        <td><span class="aliansalud-badge" style="background-color:rgba(75,131,38,0.1); border:1px solid var(--aliansalud-green);">${prov.proveedor}</span></td>
        <td>${prov.servicioPrestado}</td>
        <td>${prov.representanteProveedorName || 'N/A'}<br><span style="font-size:0.75rem; color:var(--text-muted);">Suplente: ${prov.representanteSuplenteName || 'N/A'}</span></td>
        <td>${prov.impactoNoDisponible || 'N/A'}<br><span style="font-size:0.75rem; color:var(--colmedica-blue);">${prov.estrategiasRecuperacion || 'N/A'}</span></td>
        <td><strong style="color:var(--impact-significativo);">${prov.rtoOfrecida || 'N/A'}</strong></td>
        <td>
          <button class="btn-icon" onclick="abrirEditorProveedor('${prov.id}')" title="Editar Proveedor">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
        </td>
      `;
      tbodyProv.appendChild(tr);
    });
  }
}

// ----------------------------------------------------
// 🕒 TIMELINE DE AUDITORÍA (HISTORIAL DE CAMBIOS)
// ----------------------------------------------------

function renderizarHistorialTimeline() {
  const container = document.getElementById("history-timeline-container");
  if (!container) return;
  
  container.innerHTML = "";
  
  // Añadir sección de snapshots encima del timeline
  renderizarComparacionSnapshots(container);
  
  // Título del log
  const tituloLog = document.createElement("h4");
  tituloLog.style.cssText = "font-family:var(--font-title); font-size:0.9rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:20px; margin-top:8px;";
  tituloLog.textContent = "Registro de Cambios";
  container.appendChild(tituloLog);
  
  // Ordenar historial del más reciente al más antiguo
  const histOrdenado = [...baseDatos.historial].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  
  if (histOrdenado.length === 0) {
    const vacio = document.createElement("p");
    vacio.style.cssText = "color:var(--text-muted); font-size:0.85rem; text-align:center; padding:24px;";
    vacio.textContent = "No hay cambios registrados aún.";
    container.appendChild(vacio);
    return;
  }
  
  histOrdenado.forEach(h => {
    const dateFormatted = new Date(h.fecha).toLocaleString();
    const esSnapshot = h.tipo === "Instantánea Anual";
    const item = document.createElement("div");
    item.className = "timeline-item";
    item.innerHTML = `
      <div class="timeline-dot" style="${esSnapshot ? 'border-color:#7c3aed; background:rgba(124,58,237,0.15);' : ''}"></div>
      <div class="timeline-card">
        <div class="timeline-header-meta">
          <span class="timeline-user">${h.usuario}</span>
          <span class="timeline-date">${dateFormatted}</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="timeline-badge" style="${esSnapshot ? 'background:rgba(124,58,237,0.1);color:#7c3aed;' : ''}">${h.tipo}</span>
          <strong style="font-size:0.85rem; color:var(--text-main);">${h.referencia}</strong>
        </div>
        <p class="timeline-comment">"${h.comentario}"</p>
      </div>
    `;
    container.appendChild(item);
  });
}

function registrarAuditoria(tipoAccion, referenciaItem, comentarioJustificacion) {
  const auditoria = {
    id: "hist-" + Date.now(),
    fecha: new Date().toISOString(),
    usuario: obtenerNombreUsuario(),
    tipo: tipoAccion,
    referencia: referenciaItem,
    comentario: comentarioJustificacion || "Modificación sin comentarios adicionales."
  };
  baseDatos.historial.push(auditoria);
  guardarDatosBIA(baseDatos);
  renderizarHistorialTimeline();
}

// ----------------------------------------------------
// 📸 INSTANTÁNEAS ANUALES (Comparación Histórica BIA)
// ----------------------------------------------------

function tomarInstantaneaAnual() {
  const anio = prompt(
    "Ingrese el año o período de esta instantánea:\n" +
    "Ejemplo: 2025, 'BIA Q1 2026', 'Revisión Mayo 2026'\n\n" +
    "Instantáneas existentes: " +
    (baseDatos.snapshots.length > 0
      ? baseDatos.snapshots.map(s => s.periodo).join(", ")
      : "(ninguna aún)")
  );
  if (!anio || !anio.trim()) return;

  const yaExiste = baseDatos.snapshots.find(s => s.periodo === anio.trim());
  if (yaExiste) {
    if (!confirm(`Ya existe una instantánea llamada "${anio.trim()}".\n¿Desea sobreescribirla?`)) return;
    baseDatos.snapshots = baseDatos.snapshots.filter(s => s.periodo !== anio.trim());
  }

  // Guardar copia profunda del estado actual de procesos
  const snapshot = {
    id: "snap-" + Date.now(),
    periodo: anio.trim(),
    fecha: new Date().toISOString(),
    creadoPor: obtenerNombreUsuario(),
    procesos: JSON.parse(JSON.stringify(baseDatos.procesos))
  };

  baseDatos.snapshots.push(snapshot);
  guardarDatosBIA(baseDatos);
  registrarAuditoria("Instantánea Anual", `BIA ${anio.trim()}`, `Se tomó una instantánea del estado actual de ${baseDatos.procesos.length} proceso(s) para el período: ${anio.trim()}.`);
  renderizarHistorialTimeline();
  alert(`✅ Instantánea "${anio.trim()}" guardada correctamente con ${baseDatos.procesos.length} proceso(s).`);
}

// Renderizar sección de comparación entre snapshots en la vista de historial
function renderizarComparacionSnapshots(container) {
  if (!baseDatos.snapshots || baseDatos.snapshots.length === 0) return;

  const section = document.createElement("div");
  section.style.cssText = "margin-bottom: 32px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 24px;";
  section.innerHTML = `
    <h3 style="font-family:var(--font-title); font-size:1.05rem; font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:8px; border-bottom:1px solid var(--border-color); padding-bottom:12px; margin-bottom:16px;">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#7c3aed" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
      Instantáneas Anuales Guardadas
      <span style="font-size:0.7rem; background:#7c3aed; color:white; padding:2px 8px; border-radius:4px; font-weight:700;">${baseDatos.snapshots.length} guardada(s)</span>
    </h3>
    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:16px;">
      ${baseDatos.snapshots.map(snap => {
        const fecha = new Date(snap.fecha).toLocaleDateString();
        return `
          <div style="background:var(--bg-input); border-radius:var(--radius-sm); padding:16px; border:1px solid rgba(124,58,237,0.2); position:relative;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <span style="font-family:var(--font-title); font-size:1.5rem; font-weight:800; color:#7c3aed;">${snap.periodo}</span>
                <p style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">${fecha} · ${snap.creadoPor}</p>
              </div>
              <span style="background:rgba(124,58,237,0.1); color:#7c3aed; font-size:0.7rem; font-weight:700; padding:3px 8px; border-radius:4px;">${snap.procesos.length} procesos</span>
            </div>
            <hr style="border:none; border-top:1px solid var(--border-color); margin:12px 0;">
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              ${snap.procesos.map(p => `<span style="font-size:0.7rem; background:var(--bg-card); padding:2px 8px; border-radius:4px; color:var(--text-muted); border:1px solid var(--border-color);">${p.nombreSubproceso || p.nombreProceso}</span>`).join("")}
            </div>
            <button onclick="verDetalleSnapshot('${snap.id}')" style="margin-top:12px; width:100%; background:linear-gradient(135deg,#7c3aed,#4c1d95); color:white; border:none; padding:8px; border-radius:6px; font-size:0.8rem; font-weight:600; cursor:pointer;">Ver Calificaciones de este Período →</button>
          </div>
        `;
      }).join("")}
    </div>
  `;
  container.prepend(section);
}

function verDetalleSnapshot(snapId) {
  const snap = baseDatos.snapshots.find(s => s.id === snapId);
  if (!snap) return;

  // Construir tabla comparativa de impactos para todos los procesos del snapshot
  const filas = snap.procesos.map(p => {
    const nivelesCol = [
      p.impactoColmedica.financiero,
      p.impactoColmedica.operacional,
      p.impactoColmedica.legal,
      p.impactoColmedica.reputacional
    ];

    return `
      <tr>
        <td><strong>${p.nombreProceso}</strong><br><span style="font-size:0.72rem;color:var(--text-muted)">${p.nombreSubproceso}</span></td>
        <td><span class="colmedica-badge">${p.impactoColmedica.rto}</span></td>
        <td><span class="aliansalud-badge">${p.impactoAliansalud.rto}</span></td>
        ${nivelesCol.map(arr => arr.map(n => `<td><div class="matrix-cell" style="--impact-color:${getNivelImpactoMap()[n]?.color || "#64748b"};pointer-events:none;height:36px;font-size:0.7rem;">${getNivelImpactoMap()[n]?.label || n}</div></td>`).join("")).join("")}
      </tr>`;
  }).join("");

  const ventana = window.open("", "_blank", "width=1000,height=700");
  ventana.document.write(`
    <!DOCTYPE html><html lang="es">
    <head><meta charset="UTF-8"><title>Instantánea BIA ${snap.periodo}</title>
    <link rel="stylesheet" href="styles.css"></head>
    <body style="padding:32px; font-family:Plus Jakarta Sans,sans-serif;">
      <h1 style="font-family:Outfit,sans-serif; color:#7c3aed;">📸 Instantánea BIA: ${snap.periodo}</h1>
      <p style="color:#64748b;">Generada el ${new Date(snap.fecha).toLocaleString()} por ${snap.creadoPor}</p>
      <hr style="margin:16px 0;">
      <table class="custom-table" style="width:100%;">
        <thead>
          <tr>
            <th>Proceso / Subproceso</th>
            <th>RTO Colmédica</th>
            <th>RTO Aliansalud</th>
            <th colspan="4">Financiero (1d/3d/1s/1m)</th>
            <th colspan="4">Operacional (1d/3d/1s/1m)</th>
            <th colspan="4">Legal (1d/3d/1s/1m)</th>
            <th colspan="4">Reputacional (1d/3d/1s/1m)</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </body></html>
  `);
  ventana.document.close();
}

// ----------------------------------------------------
// ⚙️ MODALES Y CONTROLADORES DE APERTURA / EDICIÓN
// ----------------------------------------------------

function abrirModal(id) {
  document.getElementById(id).classList.add("active");
}

function cerrarModal(id) {
  document.getElementById(id).classList.remove("active");
}

// Lanzar creador de registros basado en la sección activa
function abrirCreadorDinamico() {
  if (vistaActiva === 'dashboard' || vistaActiva === 'bia') {
    abrirCreadorProceso();
  } else if (vistaActiva === 'apps') {
    abrirEditorAplicativo();
  } else if (vistaActiva === 'suppliers') {
    abrirEditorProveedor();
  }
}

// CREADOR / EDITOR DE PROCESOS BIA
function abrirCreadorProceso() {
  document.getElementById("process-modal-title").textContent = "Registrar Nuevo Proceso BIA";
  document.getElementById("form-proc-id").value = "";
  document.getElementById("form-process").reset();
  abrirModal("modal-process-editor");
}

function abrirEditorBiaActual() {
  const p = baseDatos.procesos.find(proc => proc.id === idProcesoActivo);
  if (!p) return;
  
  document.getElementById("process-modal-title").textContent = "Editar Ficha de Proceso BIA";
  document.getElementById("form-proc-id").value = p.id;
  
  // Generalidades
  document.getElementById("form-proc-name").value = p.nombreProceso;
  document.getElementById("form-proc-subname").value = p.nombreSubproceso;
  document.getElementById("form-proc-desc").value = p.descripcion;
  document.getElementById("form-proc-schedule").value = p.horario;
  document.getElementById("form-proc-workers").value = p.trabajadores;
  document.getElementById("form-proc-location").value = p.ubicacion;
  document.getElementById("form-proc-peaks").value = p.periodosActividad;
  document.getElementById("form-proc-suppliers").value = p.proveedoresApoyo;
  
  // Tiempos
  document.getElementById("form-proc-rto-col").value = p.impactoColmedica.rto;
  document.getElementById("form-proc-mtpd-col").value = p.impactoColmedica.mtpd;
  document.getElementById("form-proc-rto-ali").value = p.impactoAliansalud.rto;
  document.getElementById("form-proc-mtpd-ali").value = p.impactoAliansalud.mtpd;
  
  // Flujo (Si tiene alguno)
  if (p.flujo && p.flujo.length > 0) {
    const f = p.flujo[0];
    document.getElementById("form-flow-quien-da").value = f.quienDaEntrada;
    document.getElementById("form-flow-entrada").value = f.entrada;
    document.getElementById("form-flow-medio-entrada").value = f.medioEntrada;
    document.getElementById("form-flow-actividad").value = f.actividad;
    document.getElementById("form-flow-medio-req").value = f.medioRequerido;
    document.getElementById("form-flow-salida").value = f.salida;
    document.getElementById("form-flow-medio-salida").value = f.medioSalida;
    document.getElementById("form-flow-a-quien").value = f.aQuienSeDirige;
  } else {
    document.getElementById("form-flow-quien-da").value = "";
    document.getElementById("form-flow-entrada").value = "";
    document.getElementById("form-flow-medio-entrada").value = "";
    document.getElementById("form-flow-actividad").value = "";
    document.getElementById("form-flow-medio-req").value = "";
    document.getElementById("form-flow-salida").value = "";
    document.getElementById("form-flow-medio-salida").value = "";
    document.getElementById("form-flow-a-quien").value = "";
  }
  
  abrirModal("modal-process-editor");
}

function guardarBiaProcess() {
  const form = document.getElementById("form-process");
  if (!form.reportValidity()) return;
  
  const id = document.getElementById("form-proc-id").value;
  
  // Flujo único estructurado
  const flujoObj = {
    id: id ? (baseDatos.procesos.find(x => x.id === id).flujo[0]?.id || "flujo-" + Date.now()) : "flujo-" + Date.now(),
    quienDaEntrada: document.getElementById("form-flow-quien-da").value || "N/D",
    entrada: document.getElementById("form-flow-entrada").value || "N/D",
    medioEntrada: document.getElementById("form-flow-medio-entrada").value || "N/D",
    actividad: document.getElementById("form-flow-actividad").value || "N/D",
    medioRequerido: document.getElementById("form-flow-medio-req").value || "N/D",
    salida: document.getElementById("form-flow-salida").value || "N/D",
    medioSalida: document.getElementById("form-flow-medio-salida").value || "N/D",
    aQuienSeDirige: document.getElementById("form-flow-a-quien").value || "N/D"
  };
  
  transicionGuardadoPendiente = () => {
    if (id) {
      // EDITAR
      const idx = baseDatos.procesos.findIndex(p => p.id === id);
      const p = baseDatos.procesos[idx];
      
      p.nombreProceso = document.getElementById("form-proc-name").value;
      p.nombreSubproceso = document.getElementById("form-proc-subname").value;
      p.descripcion = document.getElementById("form-proc-desc").value;
      p.horario = document.getElementById("form-proc-schedule").value;
      p.trabajadores = document.getElementById("form-proc-workers").value;
      p.ubicacion = document.getElementById("form-proc-location").value;
      p.periodosActividad = document.getElementById("form-proc-peaks").value;
      p.proveedoresApoyo = document.getElementById("form-proc-suppliers").value;
      p.version = (p.version || 1) + 1;
      
      p.impactoColmedica.rto = document.getElementById("form-proc-rto-col").value;
      p.impactoColmedica.mtpd = document.getElementById("form-proc-mtpd-col").value;
      p.impactoAliansalud.rto = document.getElementById("form-proc-rto-ali").value;
      p.impactoAliansalud.mtpd = document.getElementById("form-proc-mtpd-ali").value;
      p.flujo = [flujoObj];
      p.fechaActualizacion = new Date().toISOString().split('T')[0];
      
      registrarAuditoria("Ficha editada", p.nombreProceso);
    } else {
      // CREAR NUEVO
      const nuevoId = "proc-" + Date.now();
      const nuevoProceso = {
        id: nuevoId,
        nombreProceso: document.getElementById("form-proc-name").value,
        nombreSubproceso: document.getElementById("form-proc-subname").value,
        descripcion: document.getElementById("form-proc-desc").value,
        horario: document.getElementById("form-proc-schedule").value,
        trabajadores: document.getElementById("form-proc-workers").value,
        ubicacion: document.getElementById("form-proc-location").value,
        periodosActividad: document.getElementById("form-proc-peaks").value,
        proveedoresApoyo: document.getElementById("form-proc-suppliers").value,
        flujo: [flujoObj],
        
        impactoColmedica: {
          financiero: ["minimo", "minimo", "minimo", "minimo"],
          operacional: ["minimo", "minimo", "minimo", "minimo"],
          legal: ["minimo", "minimo", "minimo", "minimo"],
          reputacional: ["minimo", "minimo", "minimo", "minimo"],
          rto: document.getElementById("form-proc-rto-col").value,
          rpo: "N/A",
          mtpd: document.getElementById("form-proc-mtpd-col").value
        },
        impactoAliansalud: {
          financiero: ["minimo", "minimo", "minimo", "minimo"],
          operacional: ["minimo", "minimo", "minimo", "minimo"],
          legal: ["minimo", "minimo", "minimo", "minimo"],
          reputacional: ["minimo", "minimo", "minimo", "minimo"],
          rto: document.getElementById("form-proc-rto-ali").value,
          rpo: "N/A",
          mtpd: document.getElementById("form-proc-mtpd-ali").value
        },
        fechaActualizacion: new Date().toISOString().split('T')[0],
        version: 1
      };
      
      baseDatos.procesos.push(nuevoProceso);
      idProcesoActivo = nuevoId;
      registrarAuditoria("Proceso Creado", nuevoProceso.nombreProceso);
    }
    
    guardarDatosBIA(baseDatos);
    cerrarModal("modal-process-editor");
    cargarSelectoresProceso();
    renderizarDashboard();
    if (idProcesoActivo) cargarDetalleProceso(idProcesoActivo);
  };
  
  abrirModalJustificacion();
}

function duplicarBiaActual() {
  const p = baseDatos.procesos.find(proc => proc.id === idProcesoActivo);
  if (!p) return;
  
  transicionGuardadoPendiente = () => {
    const nuevoId = "proc-" + Date.now();
    const clon = JSON.parse(JSON.stringify(p));
    clon.id = nuevoId;
    clon.nombreProceso = clon.nombreProceso + " (Copia)";
    clon.version = 1;
    clon.fechaActualizacion = new Date().toISOString().split('T')[0];
    
    baseDatos.procesos.push(clon);
    idProcesoActivo = nuevoId;
    
    registrarAuditoria("Proceso Duplicado", clon.nombreProceso, "Clonación del proceso " + p.nombreProceso);
    guardarDatosBIA(baseDatos);
    cargarSelectoresProceso();
    renderizarDashboard();
    cargarDetalleProceso(idProcesoActivo);
  };
  
  abrirModalJustificacion();
}

// CREADOR / EDITOR DE APLICATIVOS (TI)
function abrirEditorAplicativo(appId = "") {
  const form = document.getElementById("form-app");
  form.reset();
  
  const checkboxes = document.getElementsByName("app-impact");
  checkboxes.forEach(c => c.checked = false);
  
  if (appId) {
    const app = baseDatos.aplicativos.find(a => a.id === appId);
    if (!app) return;
    
    document.getElementById("app-modal-title").textContent = "Editar Aplicativo & TI";
    document.getElementById("form-app-id").value = app.id;
    document.getElementById("form-app-proc").value = app.nombreProceso;
    document.getElementById("form-app-subproc").value = app.nombreSubproceso;
    document.getElementById("form-app-name").value = app.aplicacion;
    document.getElementById("form-app-frequency").value = app.frecuencia;
    document.getElementById("form-app-rto").value = app.rtoMaxApp;
    document.getElementById("form-app-deps").value = app.dependenciasClave;
    document.getElementById("form-app-impact-desc").value = app.explicacionImpacto;
    document.getElementById("form-app-strategy-desc").value = app.explicacionEstrategia;
    document.getElementById("form-app-strategy-used").value = app.estrategiasUsadasAntes;
    document.getElementById("form-app-reanudacion-time").value = app.cuandoReanudara;
    document.getElementById("form-app-max-time").value = app.tiempoMantenerOperacion;
    
    document.getElementById("form-app-interrupted-percent").value = app.porcentajeTrabajoInterrumpido || "";
    document.getElementById("form-app-manual-percent").value = app.porcentajeTrabajoManual || "";
    document.getElementById("form-app-alt-percent").value = app.porcentajeTrabajoAlternativos || "";
    
    // Checkboxes de impactos
    checkboxes.forEach(cb => {
      if (app.impactosInterrupcion.includes(cb.value)) {
        cb.checked = true;
      }
    });
  } else {
    document.getElementById("app-modal-title").textContent = "Registrar Riesgo de Aplicativo";
    document.getElementById("form-app-id").value = "";
  }
  
  abrirModal("modal-app-editor");
}

function guardarAplicativo() {
  const form = document.getElementById("form-app");
  if (!form.reportValidity()) return;
  
  const id = document.getElementById("form-app-id").value;
  
  // Recoger checkboxes
  const impsSeleccionados = [];
  const checkboxes = document.getElementsByName("app-impact");
  checkboxes.forEach(cb => {
    if (cb.checked) impsSeleccionados.push(cb.value);
  });
  
  transicionGuardadoPendiente = () => {
    if (id) {
      const app = baseDatos.aplicativos.find(a => a.id === id);
      app.nombreProceso = document.getElementById("form-app-proc").value;
      app.nombreSubproceso = document.getElementById("form-app-subproc").value;
      app.aplicacion = document.getElementById("form-app-name").value;
      app.frecuencia = document.getElementById("form-app-frequency").value;
      app.rtoMaxApp = document.getElementById("form-app-rto").value;
      app.dependenciasClave = document.getElementById("form-app-deps").value;
      app.impactosInterrupcion = impsSeleccionados;
      app.explicacionImpacto = document.getElementById("form-app-impact-desc").value;
      app.explicacionEstrategia = document.getElementById("form-app-strategy-desc").value;
      app.estrategiasUsadasAntes = document.getElementById("form-app-strategy-used").value;
      app.cuandoReanudara = document.getElementById("form-app-reanudacion-time").value;
      app.tiempoMantenerOperacion = document.getElementById("form-app-max-time").value;
      app.porcentajeTrabajoInterrumpido = document.getElementById("form-app-interrupted-percent").value;
      app.porcentajeTrabajoManual = document.getElementById("form-app-manual-percent").value;
      app.porcentajeTrabajoAlternativos = document.getElementById("form-app-alt-percent").value;
      app.version = (app.version || 1) + 1;
      app.fechaActualizacion = new Date().toISOString().split('T')[0];
      
      registrarAuditoria("Editar Aplicativo", app.aplicacion);
    } else {
      const nuevoId = "app-" + Date.now();
      const nuevaApp = {
        id: nuevoId,
        nombreProceso: document.getElementById("form-app-proc").value,
        nombreSubproceso: document.getElementById("form-app-subproc").value,
        aplicacion: document.getElementById("form-app-name").value,
        frecuencia: document.getElementById("form-app-frequency").value,
        rtoMaxApp: document.getElementById("form-app-rto").value,
        dependenciasClave: document.getElementById("form-app-deps").value,
        impactosInterrupcion: impsSeleccionados,
        explicacionImpacto: document.getElementById("form-app-impact-desc").value,
        explicacionEstrategia: document.getElementById("form-app-strategy-desc").value,
        estrategiasUsadasAntes: document.getElementById("form-app-strategy-used").value,
        cuandoReanudara: document.getElementById("form-app-reanudacion-time").value,
        tiempoMantenerOperacion: document.getElementById("form-app-max-time").value,
        porcentajeTrabajoInterrumpido: document.getElementById("form-app-interrupted-percent").value,
        porcentajeTrabajoManual: document.getElementById("form-app-manual-percent").value,
        porcentajeTrabajoAlternativos: document.getElementById("form-app-alt-percent").value,
        fechaActualizacion: new Date().toISOString().split('T')[0],
        version: 1
      };
      
      baseDatos.aplicativos.push(nuevaApp);
      registrarAuditoria("Registrar Aplicativo", nuevaApp.aplicacion);
    }
    
    guardarDatosBIA(baseDatos);
    cerrarModal("modal-app-editor");
    renderizarTablasAplicativosYProveedores();
    renderizarDashboard();
  };
  
  abrirModalJustificacion();
}

// CREADOR / EDITOR DE PROVEEDORES
function abrirEditorProveedor(provId = "") {
  const form = document.getElementById("form-supplier");
  form.reset();
  
  if (provId) {
    const prov = baseDatos.proveedores.find(p => p.id === provId);
    if (!prov) return;
    
    document.getElementById("supplier-modal-title").textContent = "Editar Proveedor Crítico";
    document.getElementById("form-supplier-id").value = prov.id;
    document.getElementById("form-supplier-proc").value = prov.nombreProceso;
    document.getElementById("form-supplier-subproc").value = prov.nombreSubproceso;
    document.getElementById("form-supplier-name").value = prov.proveedor;
    document.getElementById("form-supplier-service").value = prov.servicioPrestado;
    document.getElementById("form-supplier-schedule").value = prov.horario;
    document.getElementById("form-supplier-address").value = prov.direccion || "";
    
    document.getElementById("form-supplier-contact-name").value = prov.puntoContactoName || "";
    document.getElementById("form-supplier-contact-email").value = prov.puntoContactoEmail || "";
    document.getElementById("form-supplier-alt-name").value = prov.suplenteContactoName || "";
    document.getElementById("form-supplier-alt-email").value = prov.suplenteContactoEmail || "";
    document.getElementById("form-supplier-rep-name").value = prov.representanteProveedorName || "";
    document.getElementById("form-supplier-rep-email").value = prov.representanteProveedorEmail || "";
    document.getElementById("form-supplier-rep-suplente-name").value = prov.representanteSuplenteName || "";
    document.getElementById("form-supplier-rep-suplente-email").value = prov.representanteSuplenteEmail || "";
    
    document.getElementById("form-supplier-impact").value = prov.impactoNoDisponible || "";
    document.getElementById("form-supplier-recovery").value = prov.estrategiasRecuperacion || "";
    document.getElementById("form-supplier-recovery-details").value = prov.detallesEstrategia || "";
    document.getElementById("form-supplier-rto").value = prov.rtoOfrecida || "";
    document.getElementById("form-supplier-work-percent").value = prov.porcentajeTrabajo || "";
    document.getElementById("form-supplier-impl-time").value = prov.periodoImplementacion || "";
    document.getElementById("form-supplier-maintain-time").value = prov.periodoMantener || "";
    document.getElementById("form-supplier-comm-tools").value = prov.herramientasComunicacion || "";
  } else {
    document.getElementById("supplier-modal-title").textContent = "Registrar Proveedor Crítico";
    document.getElementById("form-supplier-id").value = "";
  }
  
  abrirModal("modal-supplier-editor");
}

function guardarProveedor() {
  const form = document.getElementById("form-supplier");
  if (!form.reportValidity()) return;
  
  const id = document.getElementById("form-supplier-id").value;
  
  transicionGuardadoPendiente = () => {
    if (id) {
      const prov = baseDatos.proveedores.find(p => p.id === id);
      prov.nombreProceso = document.getElementById("form-supplier-proc").value;
      prov.nombreSubproceso = document.getElementById("form-supplier-subproc").value;
      prov.proveedor = document.getElementById("form-supplier-name").value;
      prov.servicioPrestado = document.getElementById("form-supplier-service").value;
      prov.horario = document.getElementById("form-supplier-schedule").value;
      prov.direccion = document.getElementById("form-supplier-address").value;
      
      prov.puntoContactoName = document.getElementById("form-supplier-contact-name").value;
      prov.puntoContactoEmail = document.getElementById("form-supplier-contact-email").value;
      prov.suplenteContactoName = document.getElementById("form-supplier-alt-name").value;
      prov.suplenteContactoEmail = document.getElementById("form-supplier-alt-email").value;
      prov.representanteProveedorName = document.getElementById("form-supplier-rep-name").value;
      prov.representanteProveedorEmail = document.getElementById("form-supplier-rep-email").value;
      prov.representanteSuplenteName = document.getElementById("form-supplier-rep-suplente-name").value;
      prov.representanteSuplenteEmail = document.getElementById("form-supplier-rep-suplente-email").value;
      
      prov.impactoNoDisponible = document.getElementById("form-supplier-impact").value;
      prov.estrategiasRecuperacion = document.getElementById("form-supplier-recovery").value;
      prov.detallesEstrategia = document.getElementById("form-supplier-recovery-details").value;
      prov.rtoOfrecida = document.getElementById("form-supplier-rto").value;
      prov.porcentajeTrabajo = document.getElementById("form-supplier-work-percent").value;
      prov.periodoImplementacion = document.getElementById("form-supplier-impl-time").value;
      prov.periodoMantener = document.getElementById("form-supplier-maintain-time").value;
      prov.herramientasComunicacion = document.getElementById("form-supplier-comm-tools").value;
      
      prov.version = (prov.version || 1) + 1;
      prov.fechaActualizacion = new Date().toISOString().split('T')[0];
      
      registrarAuditoria("Editar Proveedor", prov.proveedor);
    } else {
      const nuevoId = "prov-" + Date.now();
      const nuevoProv = {
        id: nuevoId,
        nombreProceso: document.getElementById("form-supplier-proc").value,
        nombreSubproceso: document.getElementById("form-supplier-subproc").value,
        proveedor: document.getElementById("form-supplier-name").value,
        servicioPrestado: document.getElementById("form-supplier-service").value,
        horario: document.getElementById("form-supplier-schedule").value,
        direccion: document.getElementById("form-supplier-address").value,
        
        puntoContactoName: document.getElementById("form-supplier-contact-name").value,
        puntoContactoEmail: document.getElementById("form-supplier-contact-email").value,
        suplenteContactoName: document.getElementById("form-supplier-alt-name").value,
        suplenteContactoEmail: document.getElementById("form-supplier-alt-email").value,
        representanteProveedorName: document.getElementById("form-supplier-rep-name").value,
        representanteProveedorEmail: document.getElementById("form-supplier-rep-email").value,
        
        representanteSuplenteName: document.getElementById("form-supplier-rep-suplente-name").value,
        representanteSuplenteEmail: document.getElementById("form-supplier-rep-suplente-email").value,
        impactoNoDisponible: document.getElementById("form-supplier-impact").value,
        estrategiasRecuperacion: document.getElementById("form-supplier-recovery").value,
        detallesEstrategia: document.getElementById("form-supplier-recovery-details").value,
        rtoOfrecida: document.getElementById("form-supplier-rto").value,
        porcentajeTrabajo: document.getElementById("form-supplier-work-percent").value,
        periodoImplementacion: document.getElementById("form-supplier-impl-time").value,
        periodoMantener: document.getElementById("form-supplier-maintain-time").value,
        herramientasComunicacion: document.getElementById("form-supplier-comm-tools").value,
        
        fechaActualizacion: new Date().toISOString().split('T')[0],
        version: 1
      };
      
      baseDatos.proveedores.push(nuevoProv);
      registrarAuditoria("Registrar Proveedor", nuevoProv.proveedor);
    }
    
    guardarDatosBIA(baseDatos);
    cerrarModal("modal-supplier-editor");
    renderizarTablasAplicativosYProveedores();
    renderizarDashboard();
  };
  
  abrirModalJustificacion();
}

// ----------------------------------------------------
// 🔐 MODAL DE JUSTIFICACIÓN DE AUDITORÍA
// ----------------------------------------------------

function abrirModalJustificacion() {
  document.getElementById("form-justification-comment").value = "";
  abrirModal("modal-justification");
}

function confirmarGuardadoConJustificacion() {
  const comentario = document.getElementById("form-justification-comment").value.trim();
  if (!comentario) {
    alert("Por favor, ingrese una justificación válida para continuar. Exigido por auditoría ISO 22301.");
    return;
  }
  
  cerrarModal("modal-justification");
  
  if (typeof transicionGuardadoPendiente === "function") {
    // Al ejecutar la transición, le pasamos el comentario de la justificación
    const callbackOriginal = transicionGuardadoPendiente;
    transicionGuardadoPendiente = null;
    
    // Interceptar la auditoría interna para inyectarle el comentario del usuario
    const backupAuditoria = registrarAuditoria;
    registrarAuditoria = (tipo, ref) => {
      backupAuditoria(tipo, ref, comentario);
    };
    
    callbackOriginal();
    
    // Restaurar función original
    registrarAuditoria = backupAuditoria;
  }
}

// ----------------------------------------------------
// 🌓 TOGGLE DE TEMA (CLARO / OSCURO)
// ----------------------------------------------------

function toggleTheme() {
  const html = document.documentElement;
  const actualTheme = html.getAttribute("data-theme");
  const nuevoTheme = actualTheme === "light" ? "dark" : "light";
  
  html.setAttribute("data-theme", nuevoTheme);
  
  // Cambiar icono SVG
  const themeIcon = document.getElementById("theme-icon");
  if (nuevoTheme === "dark") {
    themeIcon.innerHTML = `<path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 7a5 5 0 100 10 5 5 0 000-10z" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="5" fill="currentColor"/>`;
  } else {
    themeIcon.innerHTML = `<path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 7a5 5 0 100 10 5 5 0 000-10z"/>`;
  }
}

// ----------------------------------------------------
// 📤 EXPORTACIÓN E IMPORTACIÓN DE BASE DE DATOS (JSON)
// ----------------------------------------------------

function exportarBaseDatos() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(baseDatos, null, 2));
  const dlAnchorElem = document.createElement('a');
  dlAnchorElem.setAttribute("href", dataStr);
  
  const fecha = new Date().toISOString().split('T')[0];
  dlAnchorElem.setAttribute("download", `BIA_Consolidado_Colmedica_${fecha}.json`);
  dlAnchorElem.click();
}

function importarBaseDatos(event) {
  const input = event.target;
  const reader = new FileReader();
  
  reader.onload = function() {
    try {
      const datosImportados = JSON.parse(reader.result);
      
      // Validar estructura básica
      if (datosImportados.procesos && datosImportados.aplicativos && datosImportados.proveedores && datosImportados.historial) {
        baseDatos = datosImportados;
        guardarDatosBIA(baseDatos);
        
        // Colocar primer proceso disponible como seleccionado
        if (baseDatos.procesos.length > 0) {
          idProcesoActivo = baseDatos.procesos[0].id;
        }
        
        // Registrar en log
        registrarAuditoria("Importación de BD", "Consolidado Completo", "Carga e importación completa de base de datos desde archivo externo.");
        
        // Refrescar UI completa
        inicializarUI();
        alert("¡Base de datos del BIA importada y sincronizada correctamente!");
      } else {
        alert("El archivo JSON no tiene la estructura válida del BIA de Colmédica.");
      }
    } catch (e) {
      alert("Error al leer el archivo JSON. Asegúrese de que esté bien formado.");
      console.error(e);
    }
  };
  
  if (input.files && input.files[0]) {
    reader.readAsText(input.files[0]);
  }
}
