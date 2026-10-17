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
const navMyReqsBtn = document.getElementById("navMyReqsBtn");
const viewCreate = document.getElementById("viewCreate");
const viewRequisitions = document.getElementById("viewRequisitions");
const viewTitle = document.getElementById("viewTitle");

navCreateBtn.addEventListener("click", () => {
  viewCreate.classList.remove("hidden");
  viewRequisitions.classList.add("hidden");
  navCreateBtn.classList.add("active");
  navMyReqsBtn.classList.remove("active");
  viewTitle.innerText = "Create Request";
});

navMyReqsBtn.addEventListener("click", () => {
  viewCreate.classList.add("hidden");
  viewRequisitions.classList.remove("hidden");
  navMyReqsBtn.classList.add("active");
  navCreateBtn.classList.remove("active");
  viewTitle.innerText = "My Requisitions";
});

// ==========================================
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

  viewCreate.classList.add("hidden");
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