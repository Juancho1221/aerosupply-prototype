// Catálogo simulado en memoria
const PART_CATALOG = {
  "C156-2": "BOOT PITCH BEARING",
  "MS24693S273": "MACHINE SCREW",
  "NAS1329A06K75": "RIVET NUT",
  "S3432-A": "NUTPLATE",
  "C253001-0101": "LOCK ASSY - DOOR L/H",
  "MT106-3": "TUBE FUEL SAMPLE, GL5",
  "A4138": "RACE CONE BEARING"
};

let rowCount = 1;

// Control dinámico de Reason for Request
function handleReasonChange() {
  const reasonSelect = document.getElementById("reqReason");
  const otherWrapper = document.getElementById("otherReasonWrapper");
  const otherInput = document.getElementById("reqOtherReasonDetail");

  if (reasonSelect.value === "Other") {
    otherWrapper.style.display = "flex";
    otherInput.focus();
  } else {
    otherWrapper.style.display = "none";
    otherInput.value = "";
  }
}

// Estilos del toggle de Urgency
function toggleUrgencyStyle() {
  const urgency = document.querySelector('input[name="urgencyRadio"]:checked').value;
  const lblRoutine = document.getElementById("lblRoutine");
  const lblAOG = document.getElementById("lblAOG");

  if (urgency === "AOG") {
    lblAOG.className = "toggle-option active aog";
    lblRoutine.className = "toggle-option";
  } else {
    lblRoutine.className = "toggle-option active";
    lblAOG.className = "toggle-option";
  }
}

// Auto-completar descripción al escribir P/N
function lookupPartDescription(inputElement, rowId) {
  const pn = inputElement.value.trim().toUpperCase();
  const descInput = document.querySelector(`.input-desc[data-row="${rowId}"]`);

  if (PART_CATALOG[pn] && descInput) {
    descInput.value = PART_CATALOG[pn];
  }
}

// Agregar nueva línea de parte con su campo de notas horizontal
function addPartRow() {
  rowCount++;
  const tbody = document.getElementById("partsTableBody");

  const tr = document.createElement("tr");
  tr.id = `row-${rowCount}`;
  tr.className = "part-main-row";
  tr.innerHTML = `
    <td class="col-index">${rowCount}</td>
    <td>
      <input type="text" placeholder="e.g. MS24693S273" class="form-control mono uppercase input-pn" data-row="${rowCount}" onblur="lookupPartDescription(this, ${rowCount})">
    </td>
    <td>
      <input type="text" placeholder="Description or part name" class="form-control input-desc" data-row="${rowCount}">
    </td>
    <td>
      <input type="number" min="1" value="1" class="form-control mono text-center input-qty" data-row="${rowCount}">
    </td>
    <td>
      <input type="text" placeholder="Optional links, AMM ref, vendor..." class="form-control input-part-note" data-row="${rowCount}">
    </td>
    <td class="text-center">
      <button type="button" class="btn-icon btn-delete" onclick="handleRemoveRow(${rowCount})">
        <i class="fa-regular fa-trash-can"></i>
      </button>
    </td>
  `;

  tbody.appendChild(tr);
}

// Eliminar fila
function handleRemoveRow(rowId) {
  const rows = document.querySelectorAll(".part-main-row");
  if (rows.length <= 1) {
    alert("At least one part line is required.");
    return;
  }
  const row = document.getElementById(`row-${rowId}`);
  if (row) row.remove();
}

// Reset básico
function resetForm() {
  location.reload();
}

// ==========================================================
// VALIDACIÓN DE DUPLICADOS Y SUBMIT (HU-001)
// ==========================================================
function validateAndSubmitRequest() {
  // 1. Obtener los elementos del formulario de forma segura
  const destSelect = document.getElementById("reqDestination");
  const reasonSelect = document.getElementById("reqReason");
  const otherInput = document.getElementById("reqOtherReasonDetail");

  const rawDestination = destSelect ? destSelect.value : "";
  const reason = reasonSelect ? reasonSelect.value : "";
  const otherDetail = otherInput ? otherInput.value.trim() : "";

  // 2. Validar detalle obligatorio si el motivo es "Other"
  if (reason === "Other" && !otherDetail) {
    alert("Please provide the specific reason for this request.");
    if (otherInput) otherInput.focus();
    return;
  }

  // 3. Obtener la fila de la parte que se está registrando
  const firstRow = document.querySelector(".part-main-row");
  if (!firstRow) return;

  const pnInput = firstRow.querySelector(".input-pn");
  const descInput = firstRow.querySelector(".input-desc");
  const qtyInput = firstRow.querySelector(".input-qty");

  const pn = pnInput ? pnInput.value.trim().toUpperCase() : "";
  const desc = descInput ? descInput.value.trim() : "";
  const qty = qtyInput ? parseInt(qtyInput.value, 10) : 0;

  if (!pn || !desc || isNaN(qty) || qty <= 0) {
    alert("Please enter a valid Part Number, Description, and Quantity (>0).");
    return;
  }

  // 4. Normalizar el destino para evitar fallos de coincidencia
  // Si dice algo como "Aircraft: C-GYBF (C172S)" extrae "C-GYBF"
  let targetTail = "C-GYBF";
  if (rawDestination.includes("STOCK")) {
    targetTail = "STOCK";
  } else if (rawDestination.includes("C-GYBF")) {
    targetTail = "C-GYBF";
  } else if (rawDestination) {
    targetTail = rawDestination;
  }

  // 5. Base de datos precargada de solicitudes abiertas
  let activeList = [
    { partNumber: "C253001-0101", tail: "C-GYBF", id: "REQ-2026-0839", status: "In Transit", date: "2026-10-14 14:20" },
    { partNumber: "AN507-1032R10", tail: "STOCK", id: "REQ-2026-0835", status: "Pending", date: "2026-10-15 09:12" },
    { partNumber: "S3432-A", tail: "C-GYBF", id: "REQ-2026-0810", status: "In Stock", location: "Bay 2 - Shelf B", date: "2026-10-04 11:30" }
  ];

  // 6. Leer dinámicamente todo lo que ya esté en la tabla de My Requisitions
  const tableRows = document.querySelectorAll("#requisitionsTableBody tr");
  tableRows.forEach(tr => {
    const cells = tr.querySelectorAll("td");
    if (cells.length >= 8) {
      const rowId = cells[0].innerText.trim();
      const rowDate = cells[1].innerText.trim();
      const rowTail = cells[2].innerText.trim();
      const rowPn = cells[3].innerText.trim().toUpperCase();
      const rowStatus = tr.getAttribute("data-status") || cells[7].innerText.trim();

      activeList.push({
        partNumber: rowPn,
        tail: rowTail,
        id: rowId,
        status: rowStatus,
        date: rowDate
      });
    }
  });

  // 7. Buscar si la pieza ya existe para el mismo avión o para stock
  const match = activeList.find(item => 
    item.partNumber === pn && (item.tail === targetTail || (targetTail === "STOCK" && item.tail === "STOCK"))
  );

  // 8. Manejo de alertas y bloqueos
  if (match) {
    if (match.status === "In Stock") {
      // Alerta preventiva: parte en almacén
      const warnMsg = document.getElementById("stockWarningMsg");
      const warnLoc = document.getElementById("warnLoc");
      const warnDate = document.getElementById("warnDate");

      if (warnMsg) warnMsg.innerHTML = `Part <strong>${pn}</strong> is already available at the hangar warehouse. Please verify before requesting.`;
      if (warnLoc) warnLoc.innerText = match.location || "Bay 2 - Shelf B";
      if (warnDate) warnDate.innerText = (match.date || "") + " UTC";

      openModal("modalStockWarning");
      return;
    } else {
      // Bloqueo estricto: requerimiento activo ya existente
      const blkMsg = document.getElementById("blockedActiveMsg");
      const blkId = document.getElementById("blkReqId");
      const blkTail = document.getElementById("blkTail");
      const blkStatus = document.getElementById("blkStatus");
      const blkDate = document.getElementById("blkDate");

      if (blkMsg) blkMsg.innerHTML = `An active request for part <strong>${pn}</strong> already exists for <strong>${targetTail}</strong> in status <strong>${match.status}</strong>.`;
      if (blkId) blkId.innerText = match.id;
      if (blkTail) blkTail.innerText = match.tail;
      if (blkStatus) blkStatus.innerText = match.status;
      if (blkDate) blkDate.innerText = (match.date || "") + " UTC";

      openModal("modalBlockedActive");
      return;
    }
  }

  // 9. Si pasa todas las validaciones, registrar con éxito
  triggerSuccessModal();
}
// ==========================================
// 2. MODAL DE ÉXITO Y ALERTA AOG (HU-001)
// ==========================================
function triggerSuccessModal() {
  const generatedId = "REQ-2026-" + Math.floor(1000 + Math.random() * 9000);
  const codeEl = document.getElementById("successReqId");
  if (codeEl) codeEl.innerText = generatedId;

  // Comprobar si la urgencia seleccionada es AOG
  const urgencyEl = document.querySelector('input[name="urgencyRadio"]:checked');
  const urgency = urgencyEl ? urgencyEl.value : "Routine";
  const aogBanner = document.getElementById("successAogAlert");

  if (aogBanner) {
    if (urgency === "AOG") {
      aogBanner.classList.remove("hidden");
    } else {
      aogBanner.classList.add("hidden");
    }
  }

  openModal("modalSuccess");
}

// Cierre de sesión simulado
function handleSignOut() {
  if (confirm("Are you sure you want to end your current session?")) {
    alert("Session closed successfully. Returning to login...");
    location.reload();
  }
}

// ==========================================
// CAMBIO DE VISTAS (PESTAÑAS)
// ==========================================
const navCreateBtn = document.getElementById("navCreateBtn");
const navVendorsBtn = document.getElementById("navVendorsBtn");
const navWarehouseBtn = document.getElementById("navWarehouseBtn");
const navQABtn = document.getElementById("navQABtn");
const navAuditBtn = document.getElementById("navAuditBtn");
const viewVendors = document.getElementById("viewVendors");
const viewWarehouse = document.getElementById("viewWarehouse");
const viewQA = document.getElementById("viewQA");
const viewAudit = document.getElementById("viewAudit");
const navMyReqsBtn = document.getElementById("navMyReqsBtn");
const navProcurementBtn = document.getElementById("navProcurementBtn");
const viewProcurement = document.getElementById("viewProcurement");
const viewCreate = document.getElementById("viewCreate");
const viewRequisitions = document.getElementById("viewRequisitions");
const viewTitle = document.getElementById("viewTitle");

function switchView(viewName) {
  [viewCreate, viewRequisitions, viewProcurement, viewVendors, viewWarehouse, viewQA, viewAudit].forEach(v => {
    if (v) v.classList.add("hidden");
  });
  [navCreateBtn, navMyReqsBtn, navProcurementBtn, navVendorsBtn, navWarehouseBtn, navQABtn, navAuditBtn].forEach(btn => {
    if (btn) btn.classList.remove("active");
  });

  if (viewName === "create") {
    if (viewCreate) viewCreate.classList.remove("hidden");
    if (navCreateBtn) navCreateBtn.classList.add("active");
    if (viewTitle) viewTitle.innerText = "Create Request";
  } else if (viewName === "requisitions") {
    if (viewRequisitions) viewRequisitions.classList.remove("hidden");
    if (navMyReqsBtn) navMyReqsBtn.classList.add("active");
    if (viewTitle) viewTitle.innerText = "My Requisitions";
  } else if (viewName === "procurement") {
    if (viewProcurement) viewProcurement.classList.remove("hidden");
    if (navProcurementBtn) navProcurementBtn.classList.add("active");
    if (viewTitle) viewTitle.innerText = "Procurement & Quotes";
  } else if (viewName === "vendors") {
    if (viewVendors) viewVendors.classList.remove("hidden");
    if (navVendorsBtn) navVendorsBtn.classList.add("active");
    if (viewTitle) viewTitle.innerText = "Vendor Directory";
  } else if (viewName === "warehouse") {
    if (viewWarehouse) viewWarehouse.classList.remove("hidden");
    if (navWarehouseBtn) navWarehouseBtn.classList.add("active");
    if (viewTitle) viewTitle.innerText = "Warehouse Receiving";
    if (typeof refreshWarehouseReceivingTable === "function") refreshWarehouseReceivingTable();
  } else if (viewName === "qa") {
    if (viewQA) viewQA.classList.remove("hidden");
    if (navQABtn) navQABtn.classList.add("active");
    if (viewTitle) viewTitle.innerText = "Quality Assurance";
    if (typeof refreshQATable === "function") refreshQATable();
  } else if (viewName === "audit") {
    if (viewAudit) viewAudit.classList.remove("hidden");
    if (navAuditBtn) navAuditBtn.classList.add("active");
    if (viewTitle) viewTitle.innerText = "Audit & Traceability";
  }
}

if (navCreateBtn) navCreateBtn.addEventListener("click", () => switchView("create"));
if (navMyReqsBtn) navMyReqsBtn.addEventListener("click", () => switchView("requisitions"));
if (navProcurementBtn) navProcurementBtn.addEventListener("click", () => switchView("procurement"));
if (navVendorsBtn) navVendorsBtn.addEventListener("click", () => switchView("vendors"));
if (navWarehouseBtn) navWarehouseBtn.addEventListener("click", () => switchView("warehouse"));
if (navQABtn) navQABtn.addEventListener("click", () => switchView("qa"));
if (navAuditBtn) navAuditBtn.addEventListener("click", () => switchView("audit"));

/* Legacy nav listeners disabled */
if (false) navCreateBtn.addEventListener("click", () => {
  viewCreate.classList.remove("hidden");
  viewRequisitions.classList.add("hidden");
  navCreateBtn.classList.add("active");
  navMyReqsBtn.classList.remove("active");
  if (viewProcurement) viewProcurement.classList.add("hidden");
  if (navProcurementBtn) navProcurementBtn.classList.remove("active");
  viewTitle.innerText = "Create Request";
});

if (false) navMyReqsBtn.addEventListener("click", () => {
  if (viewProcurement) viewProcurement.classList.add("hidden");
  if (navProcurementBtn) navProcurementBtn.classList.remove("active");
  viewCreate.classList.add("hidden");
  if (viewProcurement) viewProcurement.classList.add("hidden");
  if (navProcurementBtn) navProcurementBtn.classList.remove("active");
  viewRequisitions.classList.remove("hidden");
  navMyReqsBtn.classList.add("active");
  navCreateBtn.classList.remove("active");
  viewTitle.innerText = "My Requisitions";
});

// ==========================================
if (false && navProcurementBtn) {
  navProcurementBtn.addEventListener("click", () => {
    if (viewCreate) viewCreate.classList.add("hidden");
    if (viewRequisitions) viewRequisitions.classList.add("hidden");
    if (viewProcurement) viewProcurement.classList.remove("hidden");
    if (navCreateBtn) navCreateBtn.classList.remove("active");
    if (navMyReqsBtn) navMyReqsBtn.classList.remove("active");
    navProcurementBtn.classList.add("active");
    if (viewTitle) viewTitle.innerText = "Procurement & Quotes";
  });
}

// DRAWER LATERAL DE DETALLES (HU-002)
// ==========================================
function openDetailsDrawer(button) {
  const row = button.closest("tr");
  const id = row.getAttribute("data-id");
  const status = row.getAttribute("data-status");
  const carrier = row.getAttribute("data-carrier");
  const awb = row.getAttribute("data-awb");
  const eta = row.getAttribute("data-eta");
  const location = row.getAttribute("data-location");

  const cells = row.querySelectorAll("td");
  const dest = cells[2].innerText;
  const pn = cells[3].innerText;
  const desc = cells[4].innerText;

  // Cargar datos en el panel
  document.getElementById("drwId").innerText = id;
  document.getElementById("drwDest").innerText = dest;
  document.getElementById("drwPn").innerText = pn;
  document.getElementById("drwDesc").innerText = desc;
  document.getElementById("drwStatus").innerText = status;

  const transitCard = document.getElementById("drwTransitCard");
  const stockCard = document.getElementById("drwStockCard");

  // Mostrar tarjeta correspondiente según el estado
  if (status === "In Transit") {
    transitCard.classList.remove("hidden");
    stockCard.classList.add("hidden");
    document.getElementById("drwCarrier").innerText = carrier;
    document.getElementById("drwAwb").innerText = awb;
    document.getElementById("drwEta").innerText = eta;
  } else if (status === "In Stock") {
    transitCard.classList.add("hidden");
    stockCard.classList.remove("hidden");
    document.getElementById("drwLoc").innerText = location || "Main Hangar Bay";
  } else {
    transitCard.classList.add("hidden");
    stockCard.classList.add("hidden");
  }

  // Abrir panel
  document.getElementById("detailsDrawer").classList.remove("hidden");
}

function closeDetailsDrawer() {
  document.getElementById("detailsDrawer").classList.add("hidden");
}

// Filtrar por texto en tiempo real
function filterRequisitionsTable() {
  const query = document.getElementById("tableSearch").value.toLowerCase();
  const rows = document.querySelectorAll("#requisitionsTableBody tr");

  rows.forEach(r => {
    r.style.display = r.innerText.toLowerCase().includes(query) ? "" : "none";
  });
}

// Filtrar por botones de estado
function filterByStatus(status, button) {
  document.querySelectorAll(".btn-filter").forEach(b => b.classList.remove("active"));
  button.classList.add("active");

  const rows = document.querySelectorAll("#requisitionsTableBody tr");
  rows.forEach(r => {
    if (status === "ALL" || r.getAttribute("data-status") === status) {
      r.style.display = "";
    } else {
      r.style.display = "none";
    }
  });
}

// ==========================================================
// VALIDACIÓN REACTIVA DEL BOTÓN DE GUARDADO (CRITERIO 1 HU-001)
// ==========================================================
function checkFormValidity() {
  const submitBtn = document.getElementById("btnSubmitRequest");
  if (!submitBtn) return;

  const reason = document.getElementById("reqReason").value;
  const otherDetail = document.getElementById("reqOtherReasonDetail").value.trim();

  // Si eligió "Other", el detalle es obligatorio
  if (reason === "Other" && !otherDetail) {
    submitBtn.disabled = true;
    return;
  }

  const rows = document.querySelectorAll(".part-main-row");
  if (rows.length === 0) {
    submitBtn.disabled = true;
    return;
  }

  let allValid = true;

  rows.forEach(r => {
    const pn = r.querySelector(".input-pn") ? r.querySelector(".input-pn").value.trim() : "";
    const desc = r.querySelector(".input-desc") ? r.querySelector(".input-desc").value.trim() : "";
    const qtyInput = r.querySelector(".input-qty");
    const qty = qtyInput ? parseInt(qtyInput.value, 10) : 0;

    // Part Number, Description obligatorios y Qty entero mayor que cero
    if (!pn || !desc || isNaN(qty) || qty <= 0) {
      allValid = false;
    }
  });

  submitBtn.disabled = !allValid;
}

// Escuchar cambios en todo el formulario en tiempo real
document.getElementById("viewCreate").addEventListener("input", checkFormValidity);
document.getElementById("viewCreate").addEventListener("change", checkFormValidity);

// ==========================================================
// CONTROL DE MODALES Y ÉXITO CON ALERTA AOG (CRITERIO 5 HU-001)
// ==========================================================
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("hidden");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("hidden");
}

function triggerSuccessModal() {
  const generatedId = "REQ-2026-" + Math.floor(1000 + Math.random() * 9000);
  const successReqIdEl = document.getElementById("successReqId");
  if (successReqIdEl) successReqIdEl.innerText = generatedId;

  // Evaluar si la urgencia es AOG (Criterio 5)
  const urgencySelected = document.querySelector('input[name="urgencyRadio"]:checked').value;
  const aogAlertBanner = document.getElementById("successAogAlert");

  if (urgencySelected === "AOG") {
    aogAlertBanner.classList.remove("hidden");
  } else {
    aogAlertBanner.classList.add("hidden");
  }

  openModal("modalSuccess");
}

// ==========================================================
// TRANSICIÓN A MY REQUISITIONS E INSERCIÓN DINÁMICA (UTC)
// ==========================================================
function handleGoToRequisitions() {
  // 1. Cerrar la modal de confirmación
  closeModal("modalSuccess");

  // 2. Extraer los datos registrados en el formulario
  const generatedId = document.getElementById("successReqId").innerText;
  const destination = document.getElementById("reqDestination").value;
  const urgency = document.querySelector('input[name="urgencyRadio"]:checked').value;

  const firstRow = document.querySelector(".part-main-row");
  const pn = firstRow.querySelector(".input-pn").value.trim().toUpperCase();
  const desc = firstRow.querySelector(".input-desc").value.trim();
  const qty = firstRow.querySelector(".input-qty").value;

  // 3. Generar la marca temporal en formato UTC
  const now = new Date();
  const utcDate = now.toISOString().slice(0, 16).replace("T", " ");

  // 4. Crear e insertar la fila en la tabla de My Requisitions
  const tbody = document.getElementById("requisitionsTableBody");
  const tr = document.createElement("tr");
  tr.setAttribute("data-id", generatedId);
  tr.setAttribute("data-status", "Pending");
  tr.setAttribute("data-carrier", "N/A");
  tr.setAttribute("data-awb", "N/A");
  tr.setAttribute("data-eta", "Pending PO");

  tr.innerHTML = `
    <td class="col-id">${generatedId}</td>
    <td class="col-date">${utcDate}</td>
    <td class="col-target">${destination}</td>
    <td class="col-pn">${pn}</td>
    <td class="col-desc">${desc}</td>
    <td class="col-qty">${qty}</td>
    <td class="text-center"><span class="badge-urgency ${urgency === 'AOG' ? 'aog' : 'routine'}">${urgency}</span></td>
    <td class="text-center"><span class="badge-status pending">Pending</span></td>
    <td class="text-center">
      <button type="button" class="btn-table-action" onclick="openDetailsDrawer(this)">Details</button>
    </td>
  `;

  // Se añade al inicio de la tabla
  tbody.insertBefore(tr, tbody.firstChild);

  // 5. Cambiar a la vista de My Requisitions en la interfaz
  viewCreate.classList.add("hidden");
  if (viewProcurement) viewProcurement.classList.add("hidden");
  if (navProcurementBtn) navProcurementBtn.classList.remove("active");
  viewRequisitions.classList.remove("hidden");
  navMyReqsBtn.classList.add("active");
  navCreateBtn.classList.remove("active");
  viewTitle.innerText = "My Requisitions";
}

// ==========================================================
// TRANSICIÓN A MY REQUISITIONS, INSERCIÓN DINÁMICA Y RESET
// ==========================================================
function clearCreateForm() {
  // 1. Restablecer selector de destino y motivo
  document.getElementById("reqDestination").selectedIndex = 0;
  
  const reqReason = document.getElementById("reqReason");
  reqReason.selectedIndex = 0;
  handleReasonChange(); // Oculta el campo condicional de detalle

  // 2. Restablecer Urgencia a Routine
  const routineRadio = document.querySelector('input[name="urgencyRadio"][value="Routine"]');
  if (routineRadio) {
    routineRadio.checked = true;
    toggleUrgencyStyle();
  }

  // 3. Dejar la tabla de partes con una sola fila limpia
  const tbody = document.getElementById("partsTableBody");
  rowCount = 1;
  tbody.innerHTML = `
    <tr id="row-1" class="part-main-row">
      <td class="col-index">1</td>
      <td>
        <input type="text" placeholder="e.g. C156-2" class="form-control mono uppercase input-pn" data-row="1" onblur="lookupPartDescription(this, 1)">
      </td>
      <td>
        <input type="text" placeholder="Description or part name" class="form-control input-desc" data-row="1">
      </td>
      <td>
        <input type="number" min="1" value="1" class="form-control mono text-center input-qty" data-row="1">
      </td>
      <td>
        <input type="text" placeholder="Optional links, AMM ref, vendor..." class="form-control input-part-note" data-row="1">
      </td>
      <td class="text-center">
        <button type="button" class="btn-icon btn-delete" onclick="handleRemoveRow(1)">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </td>
    </tr>
  `;

  // 4. Volver a evaluar la validez para que el botón Submit quede deshabilitado
  checkFormValidity();
}

// Variable global para recordar qué fila se está editando o eliminando
let currentTargetRow = null;

// ==========================================================
// TRANSICIÓN A MY REQUISITIONS CON BOTONES DE ACCIÓN (HU-002)
// ==========================================================
function handleGoToRequisitions() {
  closeModal("modalSuccess");

  const generatedId = document.getElementById("successReqId").innerText;
  const destination = document.getElementById("reqDestination").value;
  const urgency = document.querySelector('input[name="urgencyRadio"]:checked').value;

  const firstRow = document.querySelector(".part-main-row");
  const pn = firstRow.querySelector(".input-pn").value.trim().toUpperCase();
  const desc = firstRow.querySelector(".input-desc").value.trim();
  const qty = firstRow.querySelector(".input-qty").value;

  const now = new Date();
  const utcDate = now.toISOString().slice(0, 16).replace("T", " ");

  const tbody = document.getElementById("requisitionsTableBody");
  const tr = document.createElement("tr");
  tr.setAttribute("data-id", generatedId);
  tr.setAttribute("data-status", "Pending");
  tr.setAttribute("data-carrier", "N/A");
  tr.setAttribute("data-awb", "N/A");
  tr.setAttribute("data-eta", "Pending PO");

  // Al nacer en estado "Pending", incluye los botones de Details, Edit y Cancel
  tr.innerHTML = `
    <td class="col-id">${generatedId}</td>
    <td class="col-date">${utcDate}</td>
    <td class="col-target">${destination}</td>
    <td class="col-pn">${pn}</td>
    <td class="col-desc">${desc}</td>
    <td class="col-qty">${qty}</td>
    <td class="text-center"><span class="badge-urgency ${urgency === 'AOG' ? 'aog' : 'routine'}">${urgency}</span></td>
    <td class="text-center"><span class="badge-status pending">Pending</span></td>
    <td class="text-center">
      <div class="table-actions-cell">
        <button type="button" class="btn-table-action" onclick="openDetailsDrawer(this)" title="View Details">Details</button>
        <button type="button" class="btn-icon-action btn-edit-action" onclick="openEditModal(this)" title="Edit Request">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
        <button type="button" class="btn-icon-action btn-delete-action" onclick="openDeleteModal(this)" title="Cancel Request">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </div>
    </td>
  `;

  tbody.insertBefore(tr, tbody.firstChild);

  // Limpiar formulario y cambiar vista
  clearCreateForm();
  switchView("requisitions");
  return;

  viewCreate.classList.add("hidden");
  if (viewProcurement) viewProcurement.classList.add("hidden");
  if (navProcurementBtn) navProcurementBtn.classList.remove("active");
  viewRequisitions.classList.remove("hidden");
  navMyReqsBtn.classList.add("active");
  navCreateBtn.classList.remove("active");
  viewTitle.innerText = "My Requisitions";
}

// ==========================================================
// ACCIÓN: EDITAR REQUERIMIENTO (QUANTITY Y URGENCY)
// ==========================================================
function openEditModal(button) {
  currentTargetRow = button.closest("tr");
  const cells = currentTargetRow.querySelectorAll("td");

  const reqId = cells[0].innerText.trim();
  const pn = cells[3].innerText.trim();
  const currentQty = parseInt(cells[5].innerText.trim(), 10);
  const currentUrgency = cells[6].innerText.trim();

  document.getElementById("editReqId").innerText = reqId;
  document.getElementById("editPn").innerText = pn;
  document.getElementById("editQtyInput").value = currentQty;

  if (currentUrgency === "AOG") {
    document.getElementById("editUrgAog").checked = true;
  } else {
    document.getElementById("editUrgRoutine").checked = true;
  }

  openModal("modalEditReq");
}

function confirmSaveEdit() {
  if (!currentTargetRow) return;

  const newQty = parseInt(document.getElementById("editQtyInput").value, 10);
  if (isNaN(newQty) || newQty <= 0) {
    alert("Quantity must be a valid number greater than zero.");
    return;
  }

  const newUrgency = document.querySelector('input[name="editUrgencyRadio"]:checked').value;
  const cells = currentTargetRow.querySelectorAll("td");

  // Actualizar Quantity en la celda
  cells[5].innerText = newQty;

  // Actualizar Urgency Badge en la celda
  cells[6].innerHTML = `<span class="badge-urgency ${newUrgency === 'AOG' ? 'aog' : 'routine'}">${newUrgency}</span>`;

  closeModal("modalEditReq");
}

// ==========================================================
// ACCIÓN: ELIMINAR / CANCELAR CON MOTIVO OBLIGATORIO
// ==========================================================
function openDeleteModal(button) {
  currentTargetRow = button.closest("tr");
  const cells = currentTargetRow.querySelectorAll("td");

  const reqId = cells[0].innerText.trim();
  const target = cells[2].innerText.trim();

  document.getElementById("deleteReqId").innerText = reqId;
  document.getElementById("deleteTarget").innerText = target;
  document.getElementById("deleteReasonInput").value = "";

  openModal("modalDeleteReq");
}

function confirmDeleteRequisition() {
  if (!currentTargetRow) return;

  const reason = document.getElementById("deleteReasonInput").value.trim();
  if (!reason) {
    alert("Please provide the formal technical or operational reason for cancelling this requisition.");
    document.getElementById("deleteReasonInput").focus();
    return;
  }

  // Eliminar la fila de la vista
  currentTargetRow.remove();
  currentTargetRow = null;

  closeModal("modalDeleteReq");
}


// =============================================================================
// MÓDULO: PROCUREMENT & QUOTES (HU-004, HU-005, HU-006)
// =============================================================================

// Catálogo de cotizaciones dummy de proveedores certificados
const QUOTES_DATA = [
  {
    id: 0,
    vendor: "Boeing Distribution Inc.",
    unitPrice: 1680.00,
    freight: 120.00,
    leadTime: "1 Day (AOG)",
    currency: "USD",
    sub: "FAA-AC 00-56B • Stock: Miami (MIA)"
  },
  {
    id: 1,
    vendor: "Aviall Services",
    unitPrice: 1420.00,
    freight: 85.00,
    leadTime: "3 Days",
    currency: "USD",
    sub: "EASA.145.0210 • Stock: Dallas (DFW)"
  },
  {
    id: 2,
    vendor: "AeroPrecision Supplies",
    unitPrice: 1850.00,
    freight: 65.00,
    leadTime: "2 Days",
    currency: "USD",
    sub: "OEM Factory Direct • Toronto (YYZ)"
  },
  {
    id: 3,
    vendor: "Dallas Airmotive Parts",
    unitPrice: 1290.00,
    freight: 95.00,
    leadTime: "5 Days",
    currency: "USD",
    sub: "ISO 9001:2015 • Atlanta (ATL)"
  }
];

// Estado centralizado del flujo de compras
const procurementState = {
  urgency: "AOG",
  selectedQuote: null,
  approvalStatus: null,
  rejectionReason: "",
  poGenerated: false,
  poNumber: ""
};

// =============================================================================
// HU-004: SELECCIONAR COTIZACIÓN (QUOTES COMPARISON)
// =============================================================================
function selectQuote(quoteIndex) {
  const quote = QUOTES_DATA[quoteIndex];
  if (!quote) return;

  procurementState.selectedQuote = quote;
  procurementState.approvalStatus = null;
  procurementState.rejectionReason = "";
  procurementState.poGenerated = false;

  // 1. Resaltar fila seleccionada en la tabla
  document.querySelectorAll("#quotesTableBody tr").forEach(row => {
    row.classList.remove("quote-row-selected");
    const btn = row.querySelector(".btn-select-quote");
    if (btn) {
      btn.innerHTML = `<i class="fa-regular fa-circle-check"></i> Select Quote`;
    }
  });

  const selectedRow = document.getElementById(`quote-row-${quoteIndex}`);
  if (selectedRow) {
    selectedRow.classList.add("quote-row-selected");
    const btn = selectedRow.querySelector(".btn-select-quote");
    if (btn) {
      btn.innerHTML = `<i class="fa-solid fa-check"></i> Selected`;
    }
  }

  // 2. Poblar resumen de cotización en la sección de aprobación
  const totalCost = quote.unitPrice + quote.freight;
  const vendorEl = document.getElementById("summaryVendorName");
  const unitPriceEl = document.getElementById("summaryUnitPrice");
  const freightEl = document.getElementById("summaryFreight");
  const leadTimeEl = document.getElementById("summaryLeadTime");
  const totalCostEl = document.getElementById("summaryTotalCost");

  if (vendorEl) vendorEl.innerText = quote.vendor;
  if (unitPriceEl) unitPriceEl.innerText = `$${quote.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${quote.currency}`;
  if (freightEl) freightEl.innerText = `$${quote.freight.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${quote.currency}`;
  if (leadTimeEl) leadTimeEl.innerText = quote.leadTime;
  if (totalCostEl) totalCostEl.innerText = `$${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${quote.currency}`;

  // 3. Evaluar Reglas de Negocio (HU-005): Costo > $1500 USD O Urgencia "AOG"
  evaluateApprovalPolicy(totalCost);

  // 4. Revelar sección de Aprobación de Gerencia
  const approvalSection = document.getElementById("cardManagerApproval");
  if (approvalSection) approvalSection.classList.remove("hidden");

  // Ocultar sección de PO hasta nueva aprobación
  const poSection = document.getElementById("cardPurchaseOrder");
  if (poSection) poSection.classList.add("hidden");

  // Limpiar feedback de rechazo previo y restaurar botones
  const feedbackCard = document.getElementById("rejectionFeedbackCard");
  const actionsToolbar = document.getElementById("approvalActionsToolbar");
  if (feedbackCard) feedbackCard.classList.add("hidden");
  if (actionsToolbar) actionsToolbar.classList.remove("hidden");

  const btnApprove = document.getElementById("btnApproveQuote");
  const btnReject = document.getElementById("btnRejectQuote");
  if (btnApprove) {
    btnApprove.disabled = false;
    btnApprove.innerHTML = `<i class="fa-solid fa-check"></i> Approve`;
  }
  if (btnReject) btnReject.disabled = false;

  // Desplazamiento suave hacia la sección de aprobación
  if (approvalSection) {
    approvalSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

// =============================================================================
// HU-005: EVALUACIÓN DE GOBERNANZA Y POLÍTICA DE APROBACIÓN
// =============================================================================
function evaluateApprovalPolicy(totalCost) {
  // Criterio: Total Cost > $1500 USD OR Urgency == "AOG"
  const isOverThreshold = totalCost > 1500;
  const isAOG = procurementState.urgency === "AOG";
  const requiresManagerApproval = isOverThreshold || isAOG;

  const badgeContainer = document.getElementById("approvalStatusBadgeContainer");
  const workflowBadge = document.getElementById("procWorkflowBadge");
  const alertTitle = document.getElementById("alertPolicyTitle");
  const alertReason = document.getElementById("alertPolicyReason");
  const alertBanner = document.getElementById("approvalPolicyAlert");

  if (requiresManagerApproval) {
    procurementState.approvalStatus = "Pending Manager Approval";

    if (badgeContainer) {
      badgeContainer.innerHTML = `
        <span class="badge-status pending" id="approvalStatusBadge">
          <i class="fa-solid fa-clock"></i> Pending Manager Approval
        </span>
      `;
    }

    if (workflowBadge) {
      workflowBadge.className = "badge-status-lg status-step-approval";
      workflowBadge.innerHTML = `<i class="fa-solid fa-clock"></i> Pending Manager Approval`;
    }

    if (alertBanner) alertBanner.classList.remove("hidden");
    if (alertTitle) alertTitle.innerText = "Manager Approval Mandatory";

    if (alertReason) {
      if (isOverThreshold && isAOG) {
        alertReason.innerText = `Policy Trigger: Total landed cost ($${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD) exceeds the $1,500.00 threshold AND maintenance urgency is flagged as critical AOG.`;
      } else if (isOverThreshold) {
        alertReason.innerText = `Financial Limit Policy: Total landed cost ($${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD) exceeds the delegation threshold of $1,500.00 USD.`;
      } else {
        alertReason.innerText = `Urgency Governance Policy: Operational status is set to AOG (Aircraft On Ground), which mandates formal managerial authorization.`;
      }
    }
  } else {
    // Si no supera $1500 y es Rutina
    procurementState.approvalStatus = "Routine Authorization";

    if (badgeContainer) {
      badgeContainer.innerHTML = `
        <span class="badge-status instock" id="approvalStatusBadge">
          <i class="fa-solid fa-shield-halved"></i> Routine Pre-Authorization (<$1,500)
        </span>
      `;
    }

    if (workflowBadge) {
      workflowBadge.className = "badge-status-lg status-step-quoting";
      workflowBadge.innerHTML = `<i class="fa-solid fa-clipboard-check"></i> Standard Approval`;
    }

    if (alertBanner) alertBanner.classList.remove("hidden");
    if (alertTitle) alertTitle.innerText = "Within Standard Expenditure Limit";
    if (alertReason) {
      alertReason.innerText = `Total expenditure ($${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD) is under the $1,500.00 limit with Routine urgency. Manager may verify and authorize to issue the Purchase Order.`;
    }
  }
}

// =============================================================================
// HU-005: ACCIONES DE GERENCIA (APPROVE / REJECT)
// =============================================================================
function handleApproveQuote() {
  if (!procurementState.selectedQuote) return;

  procurementState.approvalStatus = "Approved";

  // Actualizar Badge en la sección de aprobación a "Approved"
  const badgeContainer = document.getElementById("approvalStatusBadgeContainer");
  if (badgeContainer) {
    badgeContainer.innerHTML = `
      <span class="badge-status approved" id="approvalStatusBadge">
        <i class="fa-solid fa-circle-check"></i> Approved
      </span>
    `;
  }

  // Actualizar Badge en la barra de flujo superior
  const workflowBadge = document.getElementById("procWorkflowBadge");
  if (workflowBadge) {
    workflowBadge.className = "badge-status-lg status-step-approved";
    workflowBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Quote Approved`;
  }

  // Inhabilitar botones de aprobación para reflejar decisión tomada
  const btnApprove = document.getElementById("btnApproveQuote");
  const btnReject = document.getElementById("btnRejectQuote");
  if (btnApprove) {
    btnApprove.disabled = true;
    btnApprove.innerHTML = `<i class="fa-solid fa-check-double"></i> Approved by Manager`;
  }
  if (btnReject) btnReject.disabled = true;

  // HU-006: Revelar la tarjeta de Orden de Compra (PO)
  revealPurchaseOrderSection();
}

function openRejectQuoteModal() {
  if (!procurementState.selectedQuote) return;

  const totalCost = procurementState.selectedQuote.unitPrice + procurementState.selectedQuote.freight;
  const vendorEl = document.getElementById("rejectModalVendor");
  const totalEl = document.getElementById("rejectModalTotal");

  if (vendorEl) vendorEl.innerText = procurementState.selectedQuote.vendor;
  if (totalEl) totalEl.innerText = `$${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`;

  // Limpiar campos previos y mensajes de error
  const reasonInput = document.getElementById("rejectionReasonInput");
  const errorMsg = document.getElementById("rejectionErrorText");
  if (reasonInput) reasonInput.value = "";
  if (errorMsg) errorMsg.classList.add("hidden");

  openModal("modalRejectQuote");
  if (reasonInput) reasonInput.focus();
}

function confirmRejectQuote() {
  const reasonInput = document.getElementById("rejectionReasonInput");
  const errorMsg = document.getElementById("rejectionErrorText");
  const reason = reasonInput ? reasonInput.value.trim() : "";

  // Validación estricta: Motivo obligatorio
  if (!reason) {
    if (errorMsg) errorMsg.classList.remove("hidden");
    if (reasonInput) reasonInput.focus();
    return;
  }

  procurementState.approvalStatus = "Rejected";
  procurementState.rejectionReason = reason;

  closeModal("modalRejectQuote");

  // Actualizar Badge a "Rejected"
  const badgeContainer = document.getElementById("approvalStatusBadgeContainer");
  if (badgeContainer) {
    badgeContainer.innerHTML = `
      <span class="badge-status rejected" id="approvalStatusBadge">
        <i class="fa-solid fa-circle-xmark"></i> Rejected
      </span>
    `;
  }

  // Actualizar Workflow Badge en la cabecera
  const workflowBadge = document.getElementById("procWorkflowBadge");
  if (workflowBadge) {
    workflowBadge.className = "badge-status-lg status-step-rejected";
    workflowBadge.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Quote Rejected`;
  }

  // Ocultar barra de botones y mostrar feedback con la razón estipulada
  const toolbar = document.getElementById("approvalActionsToolbar");
  const feedbackCard = document.getElementById("rejectionFeedbackCard");
  const feedbackText = document.getElementById("rejectionFeedbackText");

  if (toolbar) toolbar.classList.add("hidden");
  if (feedbackText) feedbackText.innerText = `"${reason}"`;
  if (feedbackCard) feedbackCard.classList.remove("hidden");

  // Bloquear/Ocultar sección de PO
  const poSection = document.getElementById("cardPurchaseOrder");
  if (poSection) poSection.classList.add("hidden");
}

function resetQuoteSelection() {
  // Restaurar barra de acciones para reevaluar cotización
  const toolbar = document.getElementById("approvalActionsToolbar");
  const feedbackCard = document.getElementById("rejectionFeedbackCard");
  if (toolbar) toolbar.classList.remove("hidden");
  if (feedbackCard) feedbackCard.classList.add("hidden");

  const btnApprove = document.getElementById("btnApproveQuote");
  const btnReject = document.getElementById("btnRejectQuote");
  if (btnApprove) {
    btnApprove.disabled = false;
    btnApprove.innerHTML = `<i class="fa-solid fa-check"></i> Approve`;
  }
  if (btnReject) btnReject.disabled = false;

  // Desplazar hacia la tabla de cotizaciones para seleccionar otro proveedor
  const quotesTable = document.getElementById("cardQuotesComparison");
  if (quotesTable) quotesTable.scrollIntoView({ behavior: "smooth" });
}

// =============================================================================
// HU-006: EMISIÓN DE ORDEN DE COMPRA (PURCHASE ORDER)
// =============================================================================
function revealPurchaseOrderSection() {
  const poSection = document.getElementById("cardPurchaseOrder");
  if (!poSection) return;

  poSection.classList.remove("hidden");

  const quote = procurementState.selectedQuote;
  const totalCost = quote.unitPrice + quote.freight;

  // Sugerir número de PO automáticamente con prefijo corporativo
  const autoPoNumber = "PO-2026-" + Math.floor(1000 + Math.random() * 9000);
  const poNumberInput = document.getElementById("poNumberInput");
  const poVendorDisplay = document.getElementById("poVendorDisplay");
  const poAmountDisplay = document.getElementById("poTotalAmountDisplay");
  const poPaymentSelect = document.getElementById("poPaymentMethod");

  if (poNumberInput) {
    poNumberInput.value = autoPoNumber;
    poNumberInput.disabled = false;
  }
  if (poVendorDisplay) poVendorDisplay.value = quote.vendor;
  if (poAmountDisplay) poAmountDisplay.value = `$${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`;
  if (poPaymentSelect) {
    poPaymentSelect.selectedIndex = 0;
    poPaymentSelect.disabled = false;
  }

  // Estado inicial del badge en la tarjeta de PO
  const poBadgeContainer = document.getElementById("poStatusBadgeContainer");
  if (poBadgeContainer) {
    poBadgeContainer.innerHTML = `
      <span class="badge-status-outline" id="poStatusBadge">
        <i class="fa-solid fa-file-signature"></i> Ready to Issue
      </span>
    `;
  }

  // Habilitar botón de generación
  const btnPO = document.getElementById("btnGeneratePO");
  if (btnPO) {
    btnPO.disabled = false;
    btnPO.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Generate &amp; Send PO`;
  }

  poSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function handleGeneratePO() {
  const poNumberInput = document.getElementById("poNumberInput");
  const poPaymentSelect = document.getElementById("poPaymentMethod");

  const poNumber = poNumberInput ? poNumberInput.value.trim() : "";
  const paymentMethod = poPaymentSelect ? poPaymentSelect.value : "";

  // 1. Validaciones
  if (!poNumber) {
    alert("Please enter a valid Purchase Order (PO) Number.");
    if (poNumberInput) poNumberInput.focus();
    return;
  }

  if (!paymentMethod) {
    alert("Please select a Payment Method (Corporate Card, Net 30, or Wire Transfer).");
    if (poPaymentSelect) poPaymentSelect.focus();
    return;
  }

  procurementState.poGenerated = true;
  procurementState.poNumber = poNumber;

  // 2. Criterio HU-006: Cambiar badge de estado visual a "Purchased"
  const poBadgeContainer = document.getElementById("poStatusBadgeContainer");
  if (poBadgeContainer) {
    poBadgeContainer.innerHTML = `
      <span class="badge-status purchased" id="poStatusBadge">
        <i class="fa-solid fa-check-double"></i> Purchased
      </span>
    `;
  }

  // Actualizar Workflow Badge en la cabecera
  const workflowBadge = document.getElementById("procWorkflowBadge");
  if (workflowBadge) {
    workflowBadge.className = "badge-status-lg status-step-purchased";
    workflowBadge.innerHTML = `<i class="fa-solid fa-check-double"></i> Purchased`;
  }

  // 3. Bloquear campos del formulario para prevenir doble envío
  if (poNumberInput) poNumberInput.disabled = true;
  if (poPaymentSelect) poPaymentSelect.disabled = true;

  const btnPO = document.getElementById("btnGeneratePO");
  if (btnPO) {
    btnPO.disabled = true;
    btnPO.innerHTML = `<i class="fa-solid fa-circle-check"></i> PO Dispatched`;
  }

  // 4. Mostrar alerta / modal de éxito con los datos despachados
  const quote = procurementState.selectedQuote;
  const totalCost = quote ? quote.unitPrice + quote.freight : 0;

  const displayNum = document.getElementById("poSuccessDisplayNumber");
  const displayVendor = document.getElementById("poSuccessVendor");
  const displayPayment = document.getElementById("poSuccessPayment");
  const displayAmount = document.getElementById("poSuccessAmount");

  if (displayNum) displayNum.innerText = poNumber;
  if (displayVendor) displayVendor.innerText = quote ? quote.vendor : "--";
  if (displayPayment) displayPayment.innerText = paymentMethod;
  if (displayAmount) displayAmount.innerText = `$${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`;

  // Sincronizar estado en la tabla de My Requisitions
  const targetReqRow = document.querySelector('#requisitionsTableBody tr[data-id="REQ-2026-0839"]');
  if (targetReqRow) {
    targetReqRow.setAttribute("data-status", "Purchased");
    const cells = targetReqRow.querySelectorAll("td");
    if (cells.length >= 8) {
      cells[7].innerHTML = `<span class="badge-status purchased">Purchased</span>`;
      cells[8].innerHTML = `
        <div class="table-actions-cell">
          <button type="button" class="btn-table-action btn-dispatch-action" onclick="openDispatchModal(this)" title="Register Logistics Dispatch">
            <i class="fa-solid fa-truck-ramp-box"></i> Dispatch
          </button>
          <button type="button" class="btn-table-action" onclick="openDetailsDrawer(this)" title="View Details">Details</button>
        </div>
      `;
    }
  }

  openModal("modalPoSuccess");
}

function resetProcurementFlow() {
  procurementState.selectedQuote = null;
  procurementState.approvalStatus = null;
  procurementState.rejectionReason = "";
  procurementState.poGenerated = false;

  // Desmarcar filas de cotización
  document.querySelectorAll("#quotesTableBody tr").forEach(row => {
    row.classList.remove("quote-row-selected");
    const btn = row.querySelector(".btn-select-quote");
    if (btn) btn.innerHTML = `<i class="fa-regular fa-circle-check"></i> Select Quote`;
  });

  // Ocultar tarjetas de aprobación y de PO
  const cardApproval = document.getElementById("cardManagerApproval");
  const cardPO = document.getElementById("cardPurchaseOrder");
  const feedbackCard = document.getElementById("rejectionFeedbackCard");
  const toolbar = document.getElementById("approvalActionsToolbar");

  if (cardApproval) cardApproval.classList.add("hidden");
  if (cardPO) cardPO.classList.add("hidden");
  if (feedbackCard) feedbackCard.classList.add("hidden");
  if (toolbar) toolbar.classList.remove("hidden");

  // Restaurar badge del workflow a Quoting
  const workflowBadge = document.getElementById("procWorkflowBadge");
  if (workflowBadge) {
    workflowBadge.className = "badge-status-lg status-step-quoting";
    workflowBadge.innerHTML = `<i class="fa-solid fa-scale-balanced"></i> Comparing Quotes`;
  }

  // Restaurar inputs de PO
  const poNumberInput = document.getElementById("poNumberInput");
  const poPaymentSelect = document.getElementById("poPaymentMethod");
  if (poNumberInput) poNumberInput.disabled = false;
  if (poPaymentSelect) poPaymentSelect.disabled = false;

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Utilidad interactiva para alternar la urgencia y verificar las reglas de negocio
function toggleRequisitionUrgency() {
  const urgencyBadge = document.getElementById("procUrgencyBadge");
  const btnToggle = document.getElementById("btnToggleUrgency");

  if (procurementState.urgency === "AOG") {
    procurementState.urgency = "Routine";
    if (urgencyBadge) {
      urgencyBadge.className = "badge-urgency routine";
      urgencyBadge.innerHTML = `<i class="fa-regular fa-clock"></i> Routine`;
    }
    if (btnToggle) {
      btnToggle.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> Switch to AOG`;
    }
  } else {
    procurementState.urgency = "AOG";
    if (urgencyBadge) {
      urgencyBadge.className = "badge-urgency aog";
      urgencyBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> AOG`;
    }
    if (btnToggle) {
      btnToggle.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> Switch to Routine`;
    }
  }

  // Si ya hay una cotización seleccionada, re-evaluar la política en tiempo real
  if (procurementState.selectedQuote && !procurementState.poGenerated && procurementState.approvalStatus !== "Rejected") {
    const totalCost = procurementState.selectedQuote.unitPrice + procurementState.selectedQuote.freight;
    evaluateApprovalPolicy(totalCost);
  }
}


// =============================================================================
// MÓDULO: VENDOR DIRECTORY (HU-003)
// =============================================================================

let currentVendorStatusFilter = "ALL";

function filterVendors() {
  const query = (document.getElementById("vendorSearchInput")?.value || "").toLowerCase().trim();
  const cards = document.querySelectorAll("#vendorsGrid .vendor-card");

  cards.forEach(card => {
    const name = (card.getAttribute("data-vendor-name") || "").toLowerCase();
    const code = (card.getAttribute("data-vendor-code") || "").toLowerCase();
    const location = (card.getAttribute("data-vendor-location") || "").toLowerCase();
    const status = card.getAttribute("data-vendor-status") || "Active";

    const matchesQuery = !query || name.includes(query) || code.includes(query) || location.includes(query);
    const matchesStatus = (currentVendorStatusFilter === "ALL") || (status === currentVendorStatusFilter);

    if (matchesQuery && matchesStatus) {
      card.style.display = "";
    } else {
      card.style.display = "none";
    }
  });
}

function filterVendorsByStatus(status, button) {
  currentVendorStatusFilter = status;
  document.querySelectorAll("#viewVendors .btn-filter").forEach(btn => btn.classList.remove("active"));
  if (button) button.classList.add("active");
  filterVendors();
}


// =============================================================================
// MÓDULO: LOGISTICS DISPATCH (HU-007)
// =============================================================================

let currentDispatchRow = null;

function openDispatchModal(button) {
  currentDispatchRow = button.closest("tr");
  if (!currentDispatchRow) return;

  const cells = currentDispatchRow.querySelectorAll("td");
  const reqId = currentDispatchRow.getAttribute("data-id") || cells[0].innerText.trim();
  const target = currentDispatchRow.getAttribute("data-target") || cells[2].innerText.trim();
  const pn = currentDispatchRow.getAttribute("data-pn") || cells[3].innerText.trim();

  document.getElementById("dispReqId").innerText = reqId;
  document.getElementById("dispPn").innerText = pn;
  document.getElementById("dispTarget").innerText = target;

  const carrierSelect = document.getElementById("dispCarrierSelect");
  const awbInput = document.getElementById("dispAwbInput");
  const errorText = document.getElementById("dispErrorText");

  if (carrierSelect) carrierSelect.selectedIndex = 0;
  if (awbInput) awbInput.value = "";
  if (errorText) errorText.classList.add("hidden");

  openModal("modalLogisticsDispatch");
}

function autoGenerateAwb() {
  const carrierSelect = document.getElementById("dispCarrierSelect");
  if (carrierSelect && carrierSelect.selectedIndex === 0) {
    carrierSelect.value = "FedEx";
  }
  const prefix = Math.floor(1000 + Math.random() * 9000);
  const mid = Math.floor(1000 + Math.random() * 9000);
  const suffix = Math.floor(1000 + Math.random() * 9000);
  const generatedAwb = `${prefix}-${mid}-${suffix}`;
  
  const awbInput = document.getElementById("dispAwbInput");
  if (awbInput) awbInput.value = generatedAwb;
}

function confirmLogisticsDispatch() {
  if (!currentDispatchRow) return;

  const carrierSelect = document.getElementById("dispCarrierSelect");
  const awbInput = document.getElementById("dispAwbInput");
  const errorText = document.getElementById("dispErrorText");

  const carrier = carrierSelect ? carrierSelect.value : "";
  const awb = awbInput ? awbInput.value.trim() : "";

  if (!carrier || !awb) {
    if (errorText) errorText.classList.remove("hidden");
    return;
  }

  // 1. Actualizar atributos de datos de la fila
  currentDispatchRow.setAttribute("data-status", "In Transit");
  currentDispatchRow.setAttribute("data-carrier", carrier);
  currentDispatchRow.setAttribute("data-awb", awb);
  currentDispatchRow.setAttribute("data-eta", "Estimated 24-48h");

  // 2. Actualizar badge de estado a "In Transit"
  const cells = currentDispatchRow.querySelectorAll("td");
  if (cells.length >= 8) {
    cells[7].innerHTML = `<span class="badge-status transit">In Transit</span>`;
  }

  // 3. Ocultar / remover el botón de Dispatch Carrier de la celda de acción
  const dispatchBtn = currentDispatchRow.querySelector(".btn-dispatch-action");
  if (dispatchBtn) {
    dispatchBtn.remove();
  }

  closeModal("modalLogisticsDispatch");

  // 4. Mostrar alerta de éxito
  const reqId = currentDispatchRow.getAttribute("data-id") || "Requisition";
  alert(`✓ Logistics Dispatch Confirmed!\n\nShipment for ${reqId} has been booked with ${carrier}.\nAWB Tracking: ${awb}\nStatus updated to: In Transit.`);

  // 5. Refrescar la tabla de recepción de almacén (HU-008)
  refreshWarehouseReceivingTable();
}


// =============================================================================
// MÓDULO: WAREHOUSE RECEIVING (HU-008)
// =============================================================================

let currentInspectionRow = null;

function refreshWarehouseReceivingTable() {
  const tbody = document.getElementById("warehouseTableBody");
  if (!tbody) return;

  // Limpiar contenido anterior
  tbody.innerHTML = "";

  // Escanear todas las filas que estén "In Transit" en el sistema
  const reqRows = document.querySelectorAll("#requisitionsTableBody tr");
  let inTransitCount = 0;

  reqRows.forEach(row => {
    const status = row.getAttribute("data-status") || "";
    if (status === "In Transit") {
      inTransitCount++;
      const cells = row.querySelectorAll("td");

      const reqId = row.getAttribute("data-id") || (cells[0] ? cells[0].innerText.trim() : "");
      const target = cells[2] ? cells[2].innerText.trim() : "STOCK";
      const pn = cells[3] ? cells[3].innerText.trim() : "";
      const desc = cells[4] ? cells[4].innerText.trim() : "";
      const qty = cells[5] ? cells[5].innerText.trim() : "1";
      const urgency = cells[6] ? cells[6].innerText.trim() : "Routine";
      const carrier = row.getAttribute("data-carrier") || "FedEx Aviation";
      const awb = row.getAttribute("data-awb") || "N/A";

      const tr = document.createElement("tr");
      tr.setAttribute("data-id", reqId);
      tr.setAttribute("data-pn", pn);
      tr.setAttribute("data-desc", desc);
      tr.setAttribute("data-target", target);
      tr.setAttribute("data-qty", qty);
      tr.setAttribute("data-carrier", carrier);
      tr.setAttribute("data-awb", awb);
      tr.setAttribute("data-urgency", urgency);

      tr.innerHTML = `
        <td class="col-id">${reqId}</td>
        <td>
          <div class="carrier-cell">
            <strong>${carrier}</strong>
            <span class="awb-sub mono">${awb}</span>
          </div>
        </td>
        <td class="col-target">${target}</td>
        <td class="col-pn">${pn}</td>
        <td class="col-desc">${desc}</td>
        <td class="col-qty">${qty}</td>
        <td class="text-center"><span class="badge-urgency ${urgency === 'AOG' ? 'aog' : 'routine'}">${urgency}</span></td>
        <td class="text-center"><span class="badge-status transit">In Transit</span></td>
        <td class="text-center">
          <button type="button" class="btn-table-action btn-inspect-action" onclick="openReceivingModal(this)">
            <i class="fa-solid fa-clipboard-check"></i> Inspect &amp; Receive
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    }
  });

  // Si no hay filas en tránsito, mostrar mensaje vacío
  if (inTransitCount === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center" style="padding: 2.5rem; color: #64748b;">
          <i class="fa-solid fa-box-open" style="font-size: 1.75rem; margin-bottom: 0.5rem; display: block; color: #94a3b8;"></i>
          No shipments currently in transit awaiting inspection.
        </td>
      </tr>
    `;
  }

  // Actualizar contador del header
  const countBadge = document.getElementById("warehouseCountBadge");
  if (countBadge) {
    countBadge.innerHTML = `<i class="fa-solid fa-plane-arrival"></i> ${inTransitCount} Awaiting Inspection`;
  }
}

function openReceivingModal(button) {
  currentInspectionRow = button.closest("tr");
  if (!currentInspectionRow) return;

  const reqId = currentInspectionRow.getAttribute("data-id") || "";
  const pn = currentInspectionRow.getAttribute("data-pn") || "";
  const target = currentInspectionRow.getAttribute("data-target") || "";
  const carrier = currentInspectionRow.getAttribute("data-carrier") || "";
  const awb = currentInspectionRow.getAttribute("data-awb") || "";

  document.getElementById("inspReqId").innerText = reqId;
  document.getElementById("inspExpectedPn").value = pn;
  document.getElementById("inspCarrierAwb").innerText = `${carrier} • ${awb}`;
  document.getElementById("inspDest").innerText = target;

  const scannedInput = document.getElementById("inspScannedPn");
  if (scannedInput) {
    scannedInput.value = "";
    scannedInput.classList.remove("border-danger");
  }

  // Resetear Packaging a Intact por defecto
  const intactRadio = document.querySelector('input[name="packagingRadio"][value="Intact"]');
  if (intactRadio) {
    intactRadio.checked = true;
    togglePackagingStyle();
  }

  const alertBox = document.getElementById("nonConformityAlert");
  if (alertBox) alertBox.classList.add("hidden");

  const pnError = document.getElementById("inspPnError");
  if (pnError) pnError.classList.add("hidden");

  openModal("modalWarehouseInspection");
  if (scannedInput) scannedInput.focus();
}

function simulateBarcodeScan() {
  const expectedPn = document.getElementById("inspExpectedPn").value;
  const scannedInput = document.getElementById("inspScannedPn");
  if (scannedInput) {
    scannedInput.value = expectedPn;
    checkInspectionCondition();
  }
}

function togglePackagingStyle() {
  const selectedRadio = document.querySelector('input[name="packagingRadio"]:checked');
  const val = selectedRadio ? selectedRadio.value : "Intact";

  const lblIntact = document.getElementById("lblPkgIntact");
  const lblDamaged = document.getElementById("lblPkgDamaged");

  if (val === "Damaged") {
    if (lblDamaged) lblDamaged.className = "packaging-toggle-option active damaged";
    if (lblIntact) lblIntact.className = "packaging-toggle-option";
  } else {
    if (lblIntact) lblIntact.className = "packaging-toggle-option active";
    if (lblDamaged) lblDamaged.className = "packaging-toggle-option";
  }

  checkInspectionCondition();
}

function checkInspectionCondition() {
  const expectedPn = (document.getElementById("inspExpectedPn")?.value || "").trim().toUpperCase();
  const scannedPn = (document.getElementById("inspScannedPn")?.value || "").trim().toUpperCase();
  const selectedRadio = document.querySelector('input[name="packagingRadio"]:checked');
  const packaging = selectedRadio ? selectedRadio.value : "Intact";

  const alertBox = document.getElementById("nonConformityAlert");
  const alertMsg = document.getElementById("nonConformityMsg");

  if (!alertBox || !alertMsg) return;

  const isDamaged = (packaging === "Damaged");
  const isMismatch = (scannedPn && scannedPn !== expectedPn);

  if (isDamaged || isMismatch) {
    alertBox.classList.remove("hidden");
    if (isDamaged && isMismatch) {
      alertMsg.innerText = "CRITICAL NON-CONFORMITY: Part Number mismatch AND damaged packaging detected. Shipment must be quarantined with an immediate Red Tag.";
    } else if (isDamaged) {
      alertMsg.innerText = "COMPROMISED PACKAGING: Transit damage detected. Potential internal shock or contamination risk. Component will be quarantined.";
    } else {
      alertMsg.innerText = `P/N MISMATCH: Expected ${expectedPn} but scanned ${scannedPn}. Suspected unapproved or incorrect component. Immediate quarantine required.`;
    }
  } else {
    alertBox.classList.add("hidden");
  }
}

// Escuchar cambios en el input de escaneo
document.addEventListener("DOMContentLoaded", () => {
  const scannedInput = document.getElementById("inspScannedPn");
  if (scannedInput) {
    scannedInput.addEventListener("input", checkInspectionCondition);
  }
  refreshWarehouseReceivingTable();
});

function submitWarehouseInspection() {
  if (!currentInspectionRow) return;

  const expectedPn = (document.getElementById("inspExpectedPn")?.value || "").trim().toUpperCase();
  const scannedInput = document.getElementById("inspScannedPn");
  const scannedPn = (scannedInput?.value || "").trim().toUpperCase();
  const pnError = document.getElementById("inspPnError");

  if (!scannedPn) {
    if (pnError) pnError.classList.remove("hidden");
    if (scannedInput) scannedInput.focus();
    return;
  }
  if (pnError) pnError.classList.add("hidden");

  const selectedRadio = document.querySelector('input[name="packagingRadio"]:checked');
  const packaging = selectedRadio ? selectedRadio.value : "Intact";

  const reqId = currentInspectionRow.getAttribute("data-id") || "";
  const isIntact = (packaging === "Intact");
  const isMatch = (scannedPn === expectedPn);

  closeModal("modalWarehouseInspection");

  // Encontrar la fila correspondiente en la tabla de My Requisitions
  const reqRow = document.querySelector(`#requisitionsTableBody tr[data-id="${reqId}"]`);

  // =========================================================================
  // CONDICIÓN 1: Intact + Part Numbers Match -> Estado: "Received" (Green)
  // =========================================================================
  if (isIntact && isMatch) {
    // 1. Actualizar fila en Warehouse Receiving
    const cells = currentInspectionRow.querySelectorAll("td");
    if (cells.length >= 8) {
      cells[7].innerHTML = `<span class="badge-status received"><i class="fa-solid fa-circle-check"></i> Received</span>`;
    }
    if (cells.length >= 9) {
      cells[8].innerHTML = `<button type="button" class="btn-table-action btn-qa-active" onclick="switchView('qa')"><i class="fa-solid fa-stamp"></i> Ready for QA</button>`;
    }

    // 2. Actualizar fila correspondiente en My Requisitions a "Received"
    if (reqRow) {
      reqRow.setAttribute("data-status", "Received");
      const reqCells = reqRow.querySelectorAll("td");
      if (reqCells.length >= 8) {
        reqCells[7].innerHTML = `<span class="badge-status received"><i class="fa-solid fa-circle-check"></i> Received</span>`;
      }
    }

    alert(`✓ Component Successfully Received & Physically Verified!\n\nRequisition: ${reqId}\nPart Number: ${expectedPn}\nInspection Result: Packaging Intact, Barcode Matched.\nStatus updated to 'Received'. Ready for Quality Assurance documentary review.`);
    if (typeof refreshQATable === "function") refreshQATable();
  }
  // =========================================================================
  // CONDICIÓN 2: Damaged o P/N Mismatch -> Estado: "Quarantined" (Red / Red Tag)
  // =========================================================================
  else {
    // 1. Actualizar fila en Warehouse Receiving
    const cells = currentInspectionRow.querySelectorAll("td");
    if (cells.length >= 8) {
      cells[7].innerHTML = `<span class="badge-status quarantined"><i class="fa-solid fa-triangle-exclamation"></i> Quarantined</span>`;
    }
    if (cells.length >= 9) {
      cells[8].innerHTML = `<span class="badge-status quarantined"><i class="fa-solid fa-ban"></i> Red Tagged</span>`;
    }

    // 2. Actualizar fila correspondiente en My Requisitions
    if (reqRow) {
      reqRow.setAttribute("data-status", "Quarantined");
      const reqCells = reqRow.querySelectorAll("td");
      if (reqCells.length >= 8) {
        reqCells[7].innerHTML = `<span class="badge-status quarantined">Quarantined</span>`;
      }
    }

    const reason = !isIntact && !isMatch
      ? "Packaging damaged AND Part Number mismatch"
      : (!isIntact ? "Compromised / damaged packaging" : "Part Number discrepancy");

    alert(`⚠ NON-CONFORMITY ALERT - COMPONENT QUARANTINED!\n\nRequisition: ${reqId}\nNon-Conformance: ${reason}\nAction: Placed under physical lock in Quarantine Bay with Red Tag.\nTCCA / FAA Non-Conformance Report logged.`);
  }

  // Refrescar el contador de pendientes
  const activeInTransit = document.querySelectorAll("#warehouseTableBody tr td .badge-status.transit").length;
  const countBadge = document.getElementById("warehouseCountBadge");
  if (countBadge) {
    countBadge.innerHTML = `<i class="fa-solid fa-plane-arrival"></i> ${activeInTransit} Awaiting Inspection`;
  }
}


// =============================================================================
// MÓDULO: QUALITY ASSURANCE (HU-009, HU-010, HU-011, HU-012)
// =============================================================================

const qaState = {
  selectedPartId: "REQ-2026-0841",
  selectedPn: "PR-1422-B2",
  selectedDesc: "PRO-SEAL FUEL TANK SEALANT (CONSUMABLE)",
  selectedTarget: "C-GYBF",
  selectedQty: "4",
  isConsumable: true,
  isCertValid: false,
  isShelfLifeValid: false,
  isExpired: false,
  isLocationValid: false,
  remainingDays: null
};

// Refrescar tabla de piezas en estado "Received" pendientes de certificación QA
function refreshQATable() {
  const tbody = document.getElementById("qaTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  // Escanear todas las filas que estén "Received" en el sistema
  const reqRows = document.querySelectorAll("#requisitionsTableBody tr");
  let receivedCount = 0;

  reqRows.forEach(row => {
    const status = row.getAttribute("data-status") || "";
    if (status === "Received") {
      receivedCount++;
      const cells = row.querySelectorAll("td");

      const reqId = row.getAttribute("data-id") || (cells[0] ? cells[0].innerText.trim() : "");
      const target = cells[2] ? cells[2].innerText.trim() : "STOCK";
      const pn = cells[3] ? cells[3].innerText.trim() : "";
      const desc = cells[4] ? cells[4].innerText.trim() : "";
      const qty = cells[5] ? cells[5].innerText.trim() : "1";
      const carrier = row.getAttribute("data-carrier") || "FedEx Aviation";
      const awb = row.getAttribute("data-awb") || "AWB-LOG-9921";
      const isConsumable = pn.startsWith("PR-") || desc.toLowerCase().includes("sealant") || desc.toLowerCase().includes("consumable");
      const isSelected = (reqId === qaState.selectedPartId);

      const tr = document.createElement("tr");
      tr.id = `qa-row-${reqId}`;
      tr.setAttribute("data-id", reqId);
      tr.setAttribute("data-pn", pn);
      tr.setAttribute("data-desc", desc);
      tr.setAttribute("data-target", target);
      tr.setAttribute("data-qty", qty);
      tr.setAttribute("data-type", isConsumable ? "Consumable" : "Standard");
      tr.setAttribute("data-status", "Received");
      if (isSelected) tr.className = "quote-row-selected";

      tr.innerHTML = `
        <td class="col-id">${reqId}</td>
        <td>
          <div class="carrier-cell">
            <strong>${carrier}</strong>
            <span class="awb-sub mono">${awb}</span>
          </div>
        </td>
        <td class="col-target">${target}</td>
        <td class="col-pn">${pn}</td>
        <td class="col-desc">${desc}</td>
        <td class="col-qty">${qty}</td>
        <td class="text-center">
          <span class="badge-part-type ${isConsumable ? 'consumable' : ''}">
            <i class="fa-solid ${isConsumable ? 'fa-flask' : 'fa-gear'}"></i> ${isConsumable ? 'Consumable' : 'Hardware'}
          </span>
        </td>
        <td class="text-center"><span class="badge-status received"><i class="fa-solid fa-circle-check"></i> Received</span></td>
        <td class="text-center">
          <button type="button" class="btn-table-action ${isSelected ? 'btn-qa-active' : ''}" onclick="selectQAPart('${reqId}')">
            <i class="fa-solid ${isSelected ? 'fa-stamp' : 'fa-clipboard-check'}"></i> ${isSelected ? 'Selected' : 'Review'}
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    }
  });

  // Si no hay filas en "Received", mostrar fila vacía informativa
  if (receivedCount === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center" style="padding: 2.5rem; color: #64748b;">
          <i class="fa-solid fa-boxes-packing" style="font-size: 1.75rem; margin-bottom: 0.5rem; display: block; color: #94a3b8;"></i>
          No components currently in "Received" status awaiting QA documentation checks.
        </td>
      </tr>
    `;
  }

  // Actualizar badges contadores de la vista QA
  const pendingEl = document.getElementById("qaPendingCount");
  const countBadge = document.getElementById("qaCountBadge");
  if (pendingEl) pendingEl.innerText = receivedCount;
  if (countBadge) {
    countBadge.innerHTML = `<i class="fa-solid fa-clipboard-check"></i> ${receivedCount} Awaiting QA Certification`;
  }
}

// Seleccionar un componente de la cola para revisión en el formulario
function selectQAPart(reqId) {
  qaState.selectedPartId = reqId;

  // Buscar información en la fila seleccionada
  const row = document.getElementById(`qa-row-${reqId}`);
  if (row) {
    qaState.selectedPn = row.getAttribute("data-pn") || "PR-1422-B2";
    qaState.selectedDesc = row.getAttribute("data-desc") || "PRO-SEAL FUEL TANK SEALANT (CONSUMABLE)";
    qaState.selectedTarget = row.getAttribute("data-target") || "C-GYBF";
    qaState.selectedQty = row.getAttribute("data-qty") || "4";
  }

  // Actualizar clases de selección en la tabla
  document.querySelectorAll("#qaTableBody tr").forEach(r => {
    r.classList.remove("quote-row-selected");
    const btn = r.querySelector(".btn-table-action");
    if (btn) {
      btn.classList.remove("btn-qa-active");
      btn.innerHTML = `<i class="fa-solid fa-clipboard-check"></i> Review`;
    }
  });

  if (row) {
    row.classList.add("quote-row-selected");
    const btn = row.querySelector(".btn-table-action");
    if (btn) {
      btn.classList.add("btn-qa-active");
      btn.innerHTML = `<i class="fa-solid fa-stamp"></i> Selected`;
    }
  }

  // Actualizar banner superior del elemento activo
  const reqIdEl = document.getElementById("qaActiveReqId");
  const tailEl = document.getElementById("qaActiveTail");
  const pnEl = document.getElementById("qaActivePn");
  const descEl = document.getElementById("qaActiveDesc");
  const qtyEl = document.getElementById("qaActiveQty");

  if (reqIdEl) reqIdEl.innerText = reqId;
  if (tailEl) tailEl.innerHTML = `<i class="fa-solid fa-plane"></i> Tail: ${qaState.selectedTarget}`;
  if (pnEl) pnEl.innerText = qaState.selectedPn;
  if (descEl) descEl.innerText = qaState.selectedDesc;
  if (qtyEl) qtyEl.innerText = `${qaState.selectedQty} EA`;

  // Resetear campos del formulario para el nuevo ítem
  resetQAFormFields();
}

function resetQAFormFields() {
  const certType = document.getElementById("qaCertType");
  const certNum = document.getElementById("qaCertNumber");
  const issuingAuth = document.getElementById("qaIssuingAuth");
  const mfgDate = document.getElementById("qaMfgDate");
  const expDate = document.getElementById("qaExpDate");
  const batchLot = document.getElementById("qaBatchLot");
  const location = document.getElementById("qaStorageLocation");

  if (certType) certType.selectedIndex = 0;
  if (certNum) certNum.value = "";
  if (issuingAuth) issuingAuth.value = "";
  if (mfgDate) mfgDate.value = "";
  if (expDate) expDate.value = "";
  if (batchLot) batchLot.value = "";
  if (location) location.value = "";

  const alertBox = document.getElementById("qaExpiredWarningBox");
  if (alertBox) alertBox.classList.add("hidden");

  const resultText = document.getElementById("qaShelfLifeResultText");
  const bar = document.getElementById("qaShelfLifeBar");
  const subText = document.getElementById("qaShelfLifeSubText");

  if (resultText) {
    resultText.innerText = "Awaiting Date Input";
    resultText.className = "shelf-calc-value";
  }
  if (bar) {
    bar.style.width = "0%";
    bar.className = "shelf-life-fill";
  }
  if (subText) {
    subText.innerText = "Enter Manufacturing and Expiration Dates to calculate remaining usable time.";
  }

  qaState.isCertValid = false;
  qaState.isShelfLifeValid = false;
  qaState.isExpired = false;
  qaState.isLocationValid = false;
  qaState.remainingDays = null;

  checkQAFormValidity();
}

// HU-009: Auto-llenar datos de muestra de certificado de aeronavegabilidad
function autoFillSampleCert() {
  const certType = document.getElementById("qaCertType");
  const certNum = document.getElementById("qaCertNumber");
  const issuingAuth = document.getElementById("qaIssuingAuth");

  if (certType) certType.value = "TCCA Form One";
  if (certNum) certNum.value = "TC-2026-90412";
  if (issuingAuth) issuingAuth.value = "Transport Canada AMO 40-92";

  checkQAFormValidity();
}

// HU-010: Cálculo automático de vida útil de partes consumibles
function calculateShelfLife() {
  const expInput = document.getElementById("qaExpDate");
  const mfgInput = document.getElementById("qaMfgDate");
  const resultText = document.getElementById("qaShelfLifeResultText");
  const bar = document.getElementById("qaShelfLifeBar");
  const subText = document.getElementById("qaShelfLifeSubText");
  const alertBox = document.getElementById("qaExpiredWarningBox");
  const alertMsg = document.getElementById("qaExpiredWarningMsg");
  const btnAdmit = document.getElementById("btnAdmitInventory");

  if (!expInput || !expInput.value) {
    if (resultText) {
      resultText.innerText = "Awaiting Expiration Date";
      resultText.className = "shelf-calc-value";
    }
    if (bar) {
      bar.style.width = "0%";
      bar.className = "shelf-life-fill";
    }
    if (alertBox) alertBox.classList.add("hidden");
    qaState.isShelfLifeValid = false;
    qaState.isExpired = false;
    qaState.remainingDays = null;
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expDate = new Date(expInput.value + "T00:00:00");
  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  qaState.remainingDays = diffDays;

  // =========================================================================
  // CRITERIO HU-010: Si la fecha de vencimiento es en el pasado (< 0 días)
  // Deshabilitar INMEDIATAMENTE el botón "Approve" (Admit) y mostrar alerta roja
  // =========================================================================
  if (diffDays < 0) {
    const expiredDays = Math.abs(diffDays);
    qaState.isExpired = true;
    qaState.isShelfLifeValid = false;

    // 1. Deshabilitar botón Admit to Inventory inmediatamente
    if (btnAdmit) {
      btnAdmit.disabled = true;
    }

    // 2. Mostrar advertencia roja crítica
    if (alertBox) alertBox.classList.remove("hidden");
    if (alertMsg) {
      alertMsg.innerText = `CRITICAL AIRWORTHINESS VIOLATION: Component expired ${expiredDays} days ago (${expInput.value}). Civil aviation regulations (TCCA/FAA) strictly prohibit the inventory admission or maintenance release of expired consumable goods. The "Admit to Inventory" button is disabled. You must Reject & Quarantine (Red Tag) this item per HU-012.`;
    }

    // 3. Estilos visuales del medidor
    if (resultText) {
      resultText.innerText = `EXPIRED (${expiredDays} Days Ago)`;
      resultText.className = "shelf-calc-value expired";
    }
    if (bar) {
      bar.style.width = "100%";
      bar.className = "shelf-life-fill expired";
    }
    if (subText) {
      subText.innerText = "Status: Shelf life exhausted. Installation strictly prohibited.";
    }

    // Checklist visual
    const chkLife = document.getElementById("chkLife");
    if (chkLife) {
      chkLife.className = "chk-item failed";
      chkLife.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Shelf Life Expired`;
    }
  } else {
    // Fecha vigente (diffDays >= 0)
    qaState.isExpired = false;
    qaState.isShelfLifeValid = true;

    if (alertBox) alertBox.classList.add("hidden");

    // Calcular porcentaje si se proporcionó fecha de fabricación
    let percent = 100;
    if (mfgInput && mfgInput.value) {
      const mfgDate = new Date(mfgInput.value + "T00:00:00");
      const totalLife = expDate.getTime() - mfgDate.getTime();
      if (totalLife > 0) {
        percent = Math.max(5, Math.min(100, Math.round((diffTime / totalLife) * 100)));
      }
    }

    const isNearWarning = (diffDays <= 30);

    if (resultText) {
      resultText.innerText = `${diffDays} Days Remaining (${percent}% Total Life)`;
      resultText.className = `shelf-calc-value ${isNearWarning ? 'warning' : 'valid'}`;
    }
    if (bar) {
      bar.style.width = `${percent}%`;
      bar.className = `shelf-life-fill ${isNearWarning ? 'warning' : 'valid'}`;
    }
    if (subText) {
      subText.innerText = isNearWarning
        ? "Warning: Under 30 days of shelf life remaining. Prioritize inventory turn."
        : "Shelf life verified within safe operating and storage parameters.";
    }

    const chkLife = document.getElementById("chkLife");
    if (chkLife) {
      chkLife.className = "chk-item checked";
      chkLife.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${diffDays}d Remaining`;
    }
  }
}

// Botones de demostración interactiva para HU-010
function setSampleShelfLife(type) {
  const mfgInput = document.getElementById("qaMfgDate");
  const expInput = document.getElementById("qaExpDate");
  const lotInput = document.getElementById("qaBatchLot");

  if (type === "valid") {
    // Fecha de vencimiento futura (Octubre 2027)
    if (mfgInput) mfgInput.value = "2026-04-10";
    if (expInput) expInput.value = "2027-10-15";
    if (lotInput) lotInput.value = "LOT-2026-B812";
  } else if (type === "expired") {
    // Fecha de vencimiento en el pasado (Agosto 2026)
    if (mfgInput) mfgInput.value = "2025-02-15";
    if (expInput) expInput.value = "2026-08-30";
    if (lotInput) lotInput.value = "LOT-2025-X409";
  }

  calculateShelfLife();
  checkQAFormValidity();
}

// HU-011: Sugerir ubicación física de almacenamiento
function autoSuggestLocation() {
  const locInput = document.getElementById("qaStorageLocation");
  if (locInput) {
    locInput.value = "Bay 2 - Shelf B, Bin 104";
    checkQAFormValidity();
  }
}

// Evaluación reactiva de la validez del formulario de QA
function checkQAFormValidity() {
  const certType = document.getElementById("qaCertType");
  const certNum = document.getElementById("qaCertNumber");
  const issuingAuth = document.getElementById("qaIssuingAuth");
  const batchLot = document.getElementById("qaBatchLot");
  const expDate = document.getElementById("qaExpDate");
  const locInput = document.getElementById("qaStorageLocation");
  const btnAdmit = document.getElementById("btnAdmitInventory");
  const summaryBadge = document.getElementById("qaValidationSummaryBadge");

  const chkCert = document.getElementById("chkCert");
  const chkLoc = document.getElementById("chkLoc");

  // 1. Validar Certificados (HU-009)
  const hasCertType = certType && certType.value !== "";
  const hasCertNum = certNum && certNum.value.trim() !== "";
  const hasIssuingAuth = issuingAuth && issuingAuth.value.trim() !== "";
  qaState.isCertValid = hasCertType && hasCertNum && hasIssuingAuth;

  if (chkCert) {
    if (qaState.isCertValid) {
      chkCert.className = "chk-item checked";
      chkCert.innerHTML = `<i class="fa-solid fa-circle-check"></i> Valid Cert (${certType.value.split(" ")[0]})`;
    } else {
      chkCert.className = "chk-item";
      chkCert.innerHTML = `<i class="fa-regular fa-circle"></i> Valid Cert`;
    }
  }

  // 2. Validar Vida Útil (HU-010)
  const hasLot = batchLot && batchLot.value.trim() !== "";
  const hasExp = expDate && expDate.value !== "";
  const isShelfValid = hasLot && hasExp && qaState.isShelfLifeValid && !qaState.isExpired;

  // 3. Validar Ubicación Física (HU-011)
  const hasLoc = locInput && locInput.value.trim() !== "";
  qaState.isLocationValid = hasLoc;

  if (chkLoc) {
    if (qaState.isLocationValid) {
      chkLoc.className = "chk-item checked";
      chkLoc.innerHTML = `<i class="fa-solid fa-circle-check"></i> Location Defined`;
    } else {
      chkLoc.className = "chk-item";
      chkLoc.innerHTML = `<i class="fa-regular fa-circle"></i> Location Defined`;
    }
  }

  // 4. Regla estricta HU-011: Habilitar "Admit to Inventory" SÓLO SI certs válidos, shelf life passed, y location definida
  const canAdmit = qaState.isCertValid && isShelfValid && qaState.isLocationValid;

  if (btnAdmit) {
    btnAdmit.disabled = !canAdmit;
  }

  // Si está vencido, inhabilitar estrictamente el botón (HU-010)
  if (qaState.isExpired && btnAdmit) {
    btnAdmit.disabled = true;
  }

  // Indicador de estado del formulario
  if (summaryBadge) {
    if (qaState.isExpired) {
      summaryBadge.className = "badge-status-outline";
      summaryBadge.style.color = "#dc2626";
      summaryBadge.style.borderColor = "#fca5a5";
      summaryBadge.innerHTML = `<i class="fa-solid fa-ban"></i> Blocked (Expired Part)`;
    } else if (canAdmit) {
      summaryBadge.className = "badge-status-outline";
      summaryBadge.style.color = "#059669";
      summaryBadge.style.borderColor = "#a7f3d0";
      summaryBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Ready to Stock`;
    } else {
      summaryBadge.className = "badge-status-outline";
      summaryBadge.style.color = "#475569";
      summaryBadge.style.borderColor = "#94a3b8";
      summaryBadge.innerHTML = `<i class="fa-solid fa-clipboard-question"></i> Form Incomplete`;
    }
  }
}

// HU-011: Admitir a Inventario (In Stock)
function handleAdmitToInventory() {
  const btnAdmit = document.getElementById("btnAdmitInventory");
  if (btnAdmit && btnAdmit.disabled) return;

  const locInput = document.getElementById("qaStorageLocation");
  const location = locInput ? locInput.value.trim() : "Bay 2 - Shelf B";
  const certType = document.getElementById("qaCertType")?.value || "TCCA Form One";
  const certNum = document.getElementById("qaCertNumber")?.value || "TC-2026-90412";
  const reqId = qaState.selectedPartId || "REQ-2026-0841";

  // 1. Actualizar estado en la tabla de My Requisitions a "In Stock"
  const reqRow = document.querySelector(`#requisitionsTableBody tr[data-id="${reqId}"]`);
  if (reqRow) {
    reqRow.setAttribute("data-status", "In Stock");
    reqRow.setAttribute("data-location", location);
    const cells = reqRow.querySelectorAll("td");
    if (cells.length >= 8) {
      cells[7].innerHTML = `<span class="badge-status instock">In Stock</span>`;
    }
  }

  // 2. Poblar datos en la modal de éxito
  const modalLoc = document.getElementById("qaSuccessLocation");
  const modalReqId = document.getElementById("qaSuccessReqId");
  const modalPn = document.getElementById("qaSuccessPn");
  const modalCert = document.getElementById("qaSuccessCert");
  const modalShelf = document.getElementById("qaSuccessShelf");

  if (modalLoc) modalLoc.innerText = location;
  if (modalReqId) modalReqId.innerText = reqId;
  if (modalPn) modalPn.innerText = qaState.selectedPn;
  if (modalCert) modalCert.innerText = `${certType} #${certNum}`;
  if (modalShelf) modalShelf.innerText = qaState.remainingDays ? `${qaState.remainingDays} Days Remaining (Passed)` : "Non-Consumable (Passed)";

  openModal("modalQASuccess");

  // 3. Refrescar cola de QA
  refreshQATable();
}

// HU-012: Abrir modal de rechazo y cuarentena
function openQuarantineModal() {
  const modalReqId = document.getElementById("quarModalReqId");
  const modalPn = document.getElementById("quarModalPn");
  const modalDest = document.getElementById("quarModalDest");
  const classificationSelect = document.getElementById("quarantineClassificationSelect");
  const reasonTextarea = document.getElementById("quarantineReasonInput");
  const errorText = document.getElementById("quarantineErrorText");

  if (modalReqId) modalReqId.innerText = qaState.selectedPartId || "REQ-2026-0841";
  if (modalPn) modalPn.innerText = qaState.selectedPn || "PR-1422-B2";
  if (modalDest) modalDest.innerText = qaState.selectedTarget || "C-GYBF";

  if (errorText) errorText.classList.add("hidden");

  // Si la pieza fue detectada como vencida, auto-seleccionar "Expired" y pre-llenar justificación técnica
  if (qaState.isExpired) {
    if (classificationSelect) classificationSelect.value = "Expired";
    const expVal = document.getElementById("qaExpDate")?.value || "past date";
    if (reasonTextarea) {
      reasonTextarea.value = `Shelf life expired on ${expVal} (${Math.abs(qaState.remainingDays || 0)} days past limit). Item cannot be released into active maintenance stock under TCCA/FAA regulations.`;
    }
  } else {
    if (classificationSelect) classificationSelect.selectedIndex = 0;
    if (reasonTextarea) reasonTextarea.value = "";
  }

  openModal("modalQuarantine");
  if (reasonTextarea && !qaState.isExpired) reasonTextarea.focus();
}

// HU-012: Confirmar cuarentena y aplicar Red Tag
function confirmQuarantineSubmission() {
  const classificationSelect = document.getElementById("quarantineClassificationSelect");
  const reasonTextarea = document.getElementById("quarantineReasonInput");
  const errorText = document.getElementById("quarantineErrorText");

  const classification = classificationSelect ? classificationSelect.value : "";
  const reason = reasonTextarea ? reasonTextarea.value.trim() : "";

  // Validación estricta: Clasificación y Motivo son obligatorios
  if (!classification || !reason) {
    if (errorText) errorText.classList.remove("hidden");
    return;
  }

  closeModal("modalQuarantine");

  const reqId = qaState.selectedPartId || "REQ-2026-0841";

  // 1. Actualizar estado en My Requisitions a "Quarantined"
  const reqRow = document.querySelector(`#requisitionsTableBody tr[data-id="${reqId}"]`);
  if (reqRow) {
    reqRow.setAttribute("data-status", "Quarantined");
    const cells = reqRow.querySelectorAll("td");
    if (cells.length >= 8) {
      cells[7].innerHTML = `<span class="badge-status quarantined"><i class="fa-solid fa-ban"></i> Quarantined</span>`;
    }
  }

  // 2. Refrescar cola de QA
  refreshQATable();

  // 3. Mostrar alerta de éxito notificando a compras (Criterio HU-012)
  alert(`✓ Component Successfully Quarantined & Red-Tagged!\n\nRequisition: ${reqId}\nPart Number: ${qaState.selectedPn}\nClassification: ${classification}\nReason: ${reason}\n\nActions Taken:\n- Physical Quarantine Bay lock secured.\n- Red Tag notice logged in the AeroSupply station ledger.\n- Procurement desk and supplier notified for vendor return / RMA.`);
}


// =============================================================================
// MÓDULO: AUDIT & TRACEABILITY (HU-013)
// =============================================================================

// Base de datos de trazabilidad histórica
const AUDIT_RECORDS = {
  "REQ-2026-0810": {
    id: "REQ-2026-0810",
    pn: "S3432-A",
    desc: "NUTPLATE",
    tail: "C-GYBF (C172S)",
    status: "In Stock (Bay 2 - Shelf B)",
    urgency: "Routine",
    po: "PO-2026-7812",
    vendor: "Aviall Services",
    cost: "$1,505.00 USD",
    hash: "SHA256: 7f8a92c4...e109",
    milestones: [
      {
        num: 1,
        title: "Requested",
        badge: "Requisition Origin",
        badgeClass: "badge-step-blue",
        markerClass: "marker-requested",
        icon: "fa-solid fa-square-plus",
        date: "2026-10-04 11:30 UTC",
        desc: "Technical requisition initiated by <strong>J. Serna (Line Mechanic &bull; AME-88412)</strong> for aircraft <strong>C-GYBF (C172S)</strong>.",
        meta: [
          { label: "Destination Target:", val: "C-GYBF (C172S)" },
          { label: "Reason for Request:", val: "Scheduled Maintenance (100-Hr Inspection)" },
          { label: "Requested Quantity:", val: "10 EA" },
          { label: "Urgency Classification:", val: '<span class="badge-urgency routine">Routine</span>' }
        ],
        sign: '<i class="fa-solid fa-user-check"></i> Operator: J. Serna &bull; Station: CYUL Hangar 2',
        tag: '<span class="audit-status-tag tag-verified"><i class="fa-solid fa-check"></i> Logged</span>'
      },
      {
        num: 2,
        title: "Quoted & Approved",
        badge: "Manager Authorization",
        badgeClass: "badge-step-green",
        markerClass: "marker-approved",
        icon: "fa-solid fa-user-shield",
        date: "2026-10-05 09:15 UTC",
        desc: "Compared 4 certified vendor quotes. Commercial bid selected and approved by <strong>M. Henderson (Director of Maintenance)</strong>.",
        meta: [
          { label: "Selected Vendor:", val: "Aviall Services (Dallas DFW)" },
          { label: "Supplier Accreditation:", val: "EASA.145.0210 &bull; FAA 00-56B" },
          { label: "Landed Cost:", val: '<strong class="mono">$1,420.00 Unit + $85.00 Freight = $1,505.00 USD</strong>' },
          { label: "Delegation Policy:", val: "Executive review sign-off verified (&gt;$1,500)" }
        ],
        sign: '<i class="fa-solid fa-signature"></i> Sign-Off: M. Henderson (Director of Maintenance)',
        tag: '<span class="audit-status-tag tag-verified"><i class="fa-solid fa-check"></i> Approved</span>'
      },
      {
        num: 3,
        title: "PO Issued",
        badge: "Financial Commitment",
        badgeClass: "badge-step-purple",
        markerClass: "marker-po",
        icon: "fa-solid fa-file-invoice-dollar",
        date: "2026-10-05 14:00 UTC",
        desc: "Purchase Order generated and transmitted electronically via supplier EDI gateway to <strong>Aviall Services</strong>.",
        meta: [
          { label: "PO Reference:", val: '<strong class="mono">PO-2026-7812</strong>' },
          { label: "Settlement Terms:", val: "Net 30 (Commercial Account)" },
          { label: "Delivery Destination:", val: "CYUL Hangar 2 &bull; Receiving Dock" },
          { label: "Procurement Status:", val: '<span class="badge-status purchased">Purchased</span>' }
        ],
        sign: '<i class="fa-solid fa-building-columns"></i> Transmitted by AeroSupply Procurement Desk',
        tag: '<span class="audit-status-tag tag-verified"><i class="fa-solid fa-check"></i> Dispatched</span>'
      },
      {
        num: 4,
        title: "Dispatched via Carrier",
        badge: "Logistics In Transit",
        badgeClass: "badge-step-amber",
        markerClass: "marker-dispatched",
        icon: "fa-solid fa-truck-plane",
        date: "2026-10-06 16:20 UTC",
        desc: "Component picked, packed, and manifested via express air cargo from Dallas DFW logistics hub to Montreal CYUL.",
        meta: [
          { label: "Carrier Logistics:", val: "FedEx Aviation Priority Freight" },
          { label: "Air Waybill (AWB):", val: '<strong class="mono awb-link">7849-2091-8831</strong>' },
          { label: "Route Trajectory:", val: "DFW Hub &rarr; MEM Sorting &rarr; CYUL Dock" },
          { label: "Transit Status:", val: '<span class="badge-status transit">In Transit</span>' }
        ],
        sign: '<i class="fa-solid fa-barcode"></i> AWB Barcode Scanned at DFW Departure Facility',
        tag: '<span class="audit-status-tag tag-verified"><i class="fa-solid fa-check"></i> In Flight</span>'
      },
      {
        num: 5,
        title: "Physical Inspection Passed",
        badge: "Inbound Goods Receiving",
        badgeClass: "badge-step-teal",
        markerClass: "marker-received",
        icon: "fa-solid fa-clipboard-check",
        date: "2026-10-08 10:45 UTC",
        desc: "Shipment received at CYUL Hangar 2 dock. Receiving clerk executed physical verification and packaging integrity protocol.",
        meta: [
          { label: "Packaging Integrity:", val: '<strong class="text-success"><i class="fa-solid fa-circle-check"></i> Intact (No transit deformation)</strong>' },
          { label: "Barcode Scan Matching:", val: '<strong class="mono">Expected: S3432-A &bull; Scanned: S3432-A (100% Match)</strong>' },
          { label: "Physical Quantity Count:", val: "10 EA Verified" },
          { label: "Receiving Status:", val: '<span class="badge-status received">Received</span>' }
        ],
        sign: '<i class="fa-solid fa-boxes-packing"></i> Inspected by J. Serna (Warehouse Receiving Clerk)',
        tag: '<span class="audit-status-tag tag-verified"><i class="fa-solid fa-check"></i> Passed</span>'
      },
      {
        num: 6,
        title: "QA & Stocked",
        badge: "Airworthiness Release",
        badgeClass: "badge-step-emerald",
        markerClass: "marker-stocked",
        icon: "fa-solid fa-certificate",
        date: "2026-10-08 15:30 UTC",
        desc: "Documentary airworthiness verification approved and component placed into final designated hangar storage location.",
        meta: [
          { label: "Airworthiness Tag:", val: "TCCA Form One #TCCA-2026-8812" },
          { label: "Issuing Authority:", val: "Transport Canada AMO 40-92" },
          { label: "Shelf Life Limit:", val: "Non-consumable metallic hardware (Unlimited Life)" },
          { label: "Physical Bin Placement:", val: '<strong class="text-primary font-bold">Bay 2 - Shelf B, Bin 104</strong>' }
        ],
        sign: '<i class="fa-solid fa-stamp"></i> Certified by M. Tremblay (QA Inspector &bull; Lic #QA-4491)',
        tag: '<span class="audit-status-tag tag-complete"><i class="fa-solid fa-circle-check"></i> In Stock</span>'
      }
    ]
  },
  "REQ-2026-0839": {
    id: "REQ-2026-0839",
    pn: "C253001-0101",
    desc: "LOCK ASSY - DOOR L/H",
    tail: "C-GYBF (C172S)",
    status: "In Transit / Awaiting Dock Receiving",
    urgency: "AOG",
    po: "PO-2026-8942",
    vendor: "Boeing Distribution Inc.",
    cost: "$1,800.00 USD",
    hash: "SHA256: 3a9e141b...cc42",
    milestones: [
      {
        num: 1,
        title: "Requested",
        badge: "Requisition Origin",
        badgeClass: "badge-step-blue",
        markerClass: "marker-requested",
        icon: "fa-solid fa-square-plus",
        date: "2026-10-14 14:20 UTC",
        desc: "AOG requisition submitted by <strong>J. Serna (Line Mechanic)</strong> for critical defect on <strong>C-GYBF</strong> door lock assembly.",
        meta: [
          { label: "Destination Target:", val: "C-GYBF (C172S)" },
          { label: "Reason for Request:", val: "Unscheduled Defect (Aircraft Grounded)" },
          { label: "Requested Quantity:", val: "1 EA" },
          { label: "Urgency Classification:", val: '<span class="badge-urgency aog">AOG</span>' }
        ],
        sign: '<i class="fa-solid fa-user-check"></i> Operator: J. Serna &bull; Station: CYUL Hangar 2',
        tag: '<span class="audit-status-tag tag-verified"><i class="fa-solid fa-check"></i> Logged</span>'
      },
      {
        num: 2,
        title: "Quoted & Approved",
        badge: "Manager Authorization",
        badgeClass: "badge-step-green",
        markerClass: "marker-approved",
        icon: "fa-solid fa-user-shield",
        date: "2026-10-14 15:45 UTC",
        desc: "AOG expedited supplier quote approved by <strong>M. Henderson (Director of Maintenance)</strong>.",
        meta: [
          { label: "Selected Vendor:", val: "Boeing Distribution Inc. (Miami MIA)" },
          { label: "Supplier Accreditation:", val: "FAA-AC 00-56B" },
          { label: "Landed Cost:", val: '<strong class="mono">$1,680.00 Unit + $120.00 Freight = $1,800.00 USD</strong>' },
          { label: "Delegation Policy:", val: "AOG Expedited Sign-off authorized" }
        ],
        sign: '<i class="fa-solid fa-signature"></i> Sign-Off: M. Henderson (Director of Maintenance)',
        tag: '<span class="audit-status-tag tag-verified"><i class="fa-solid fa-check"></i> Approved</span>'
      },
      {
        num: 3,
        title: "PO Issued",
        badge: "Financial Commitment",
        badgeClass: "badge-step-purple",
        markerClass: "marker-po",
        icon: "fa-solid fa-file-invoice-dollar",
        date: "2026-10-14 16:10 UTC",
        desc: "Purchase Order dispatched with Corporate Card instant authorization for fastest release.",
        meta: [
          { label: "PO Reference:", val: '<strong class="mono">PO-2026-8942</strong>' },
          { label: "Settlement Terms:", val: "Corporate Card (Instant Auth)" },
          { label: "Delivery Destination:", val: "CYUL Hangar 2 &bull; AOG Express Desk" },
          { label: "Procurement Status:", val: '<span class="badge-status purchased">Purchased</span>' }
        ],
        sign: '<i class="fa-solid fa-building-columns"></i> Transmitted by AeroSupply Procurement Desk',
        tag: '<span class="audit-status-tag tag-verified"><i class="fa-solid fa-check"></i> Dispatched</span>'
      },
      {
        num: 4,
        title: "Dispatched via Carrier",
        badge: "Logistics In Transit",
        badgeClass: "badge-step-amber",
        markerClass: "marker-dispatched",
        icon: "fa-solid fa-truck-plane",
        date: "2026-10-14 18:30 UTC",
        desc: "Consignment picked and transferred to FedEx Aviation Next Flight Out service.",
        meta: [
          { label: "Carrier Logistics:", val: "FedEx Aviation Priority (NFO)" },
          { label: "Air Waybill (AWB):", val: '<strong class="mono awb-link">7849-2091-8831</strong>' },
          { label: "Route Trajectory:", val: "MIA Hub &rarr; CYUL Direct Express" },
          { label: "Transit Status:", val: '<span class="badge-status transit">In Transit</span>' }
        ],
        sign: '<i class="fa-solid fa-barcode"></i> AWB Barcode Scanned at MIA Airport Cargo Center',
        tag: '<span class="audit-status-tag tag-verified"><i class="fa-solid fa-plane-departure"></i> In Flight</span>'
      }
    ]
  }
};

// Cargar y mostrar la línea de tiempo de auditoría para un requerimiento
function loadAuditTimeline(reqId, button) {
  const record = AUDIT_RECORDS[reqId] || AUDIT_RECORDS["REQ-2026-0810"];

  // Actualizar botones de filtro rápido
  document.querySelectorAll(".audit-quick-pills .btn-filter").forEach(b => b.classList.remove("active"));
  if (button) {
    button.classList.add("active");
  } else {
    const pill = document.getElementById(reqId === "REQ-2026-0810" ? "btnAudit810" : "btnAudit839");
    if (pill) pill.classList.add("active");
  }

  // Actualizar barra de resumen
  const idEl = document.getElementById("auditSummaryId");
  const tailEl = document.getElementById("auditSummaryTail");
  const statusEl = document.getElementById("auditSummaryStatus");
  const urgencyEl = document.getElementById("auditSummaryUrgency");
  const pnEl = document.getElementById("auditSummaryPn");
  const descEl = document.getElementById("auditSummaryDesc");
  const poEl = document.getElementById("auditSummaryPO");
  const vendorEl = document.getElementById("auditSummaryVendor");
  const costEl = document.getElementById("auditSummaryCost");

  if (idEl) idEl.innerText = record.id;
  if (tailEl) tailEl.innerHTML = `<i class="fa-solid fa-plane"></i> Aircraft: ${record.tail}`;
  if (statusEl) {
    const isStocked = record.status.includes("In Stock");
    statusEl.className = `badge-status ${isStocked ? 'instock' : 'transit'}`;
    statusEl.innerHTML = `<i class="fa-solid ${isStocked ? 'fa-circle-check' : 'fa-truck-fast'}"></i> ${record.status}`;
  }
  if (urgencyEl) {
    urgencyEl.className = `badge-urgency ${record.urgency === 'AOG' ? 'aog' : 'routine'}`;
    urgencyEl.innerText = record.urgency;
  }
  if (pnEl) pnEl.innerText = record.pn;
  if (descEl) descEl.innerText = record.desc;
  if (poEl) poEl.innerText = record.po;
  if (vendorEl) vendorEl.innerText = record.vendor;
  if (costEl) costEl.innerText = record.cost;

  // Renderizar la lista vertical de hitos
  const container = document.getElementById("timelineContainer");
  if (!container) return;

  container.innerHTML = "";

  record.milestones.forEach(m => {
    const item = document.createElement("div");
    item.className = "timeline-item";

    let metaHtml = "";
    m.meta.forEach(meta => {
      metaHtml += `
        <div class="t-meta-item">
          <span>${meta.label}</span>
          <strong>${meta.val}</strong>
        </div>
      `;
    });

    item.innerHTML = `
      <div class="timeline-marker ${m.markerClass}">
        <i class="${m.icon}"></i>
      </div>
      <div class="timeline-content">
        <div class="timeline-header">
          <div class="timeline-title-wrap">
            <h4>${m.num}. ${m.title}</h4>
            <span class="timeline-badge ${m.badgeClass}">${m.badge}</span>
          </div>
          <span class="timeline-date"><i class="fa-regular fa-clock"></i> ${m.date}</span>
        </div>
        <div class="timeline-body">
          <p>${m.desc}</p>
          <div class="timeline-meta-grid">
            ${metaHtml}
          </div>
        </div>
        <div class="timeline-footer">
          <span class="audit-sign">${m.sign}</span>
          ${m.tag}
        </div>
      </div>
    `;

    container.appendChild(item);
  });
}

// Búsqueda en la barra de auditoría (HU-013)
function performAuditSearch() {
  const query = (document.getElementById("auditSearchInput")?.value || "").trim().toUpperCase();

  if (!query) {
    alert("Please enter a Part Number (e.g. S3432-A) or Request ID (e.g. REQ-2026-0810) to search.");
    return;
  }

  if (query.includes("839") || query.includes("C253001")) {
    loadAuditTimeline("REQ-2026-0839");
  } else if (query.includes("810") || query.includes("S3432")) {
    loadAuditTimeline("REQ-2026-0810");
  } else {
    // Si no coincide exactamente, cargar el registro por defecto y alertar al usuario
    loadAuditTimeline("REQ-2026-0810");
    alert(`Found matching archived lifecycle trail for reference query "${query}". Displaying completed airworthiness audit trail for REQ-2026-0810.`);
  }
}

function handleAuditSearchKey(event) {
  if (event.key === "Enter") {
    performAuditSearch();
  }
}

// Inicialización de colas de QA y auditoría al cargar
document.addEventListener("DOMContentLoaded", () => {
  if (typeof refreshQATable === "function") refreshQATable();
});
