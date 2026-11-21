✈️ AeroSupply — MRO Aviation Supply Chain Prototype

Prototipo web frontend de alta fidelidad para la gestión integral de abastecimiento, compras, recepción, control de calidad y trazabilidad de repuestos aeronáuticos en una estación MRO (Maintenance, Repair, and Overhaul) — Hangar CYUL.
🎯 Propósito del Proyecto

AeroSupply simula de extremo a extremo el ciclo de vida de un componente aeronáutico sin depender de un servidor backend, ejecutando reglas de negocio reales directamente en el cliente. El sistema valida normativas críticas de la industria aérea (estándares TCCA, FAA y EASA), asegurando trazabilidad en marcas temporales UTC, prevención de errores operativos y control estricto de calidad antes de liberar cualquier repuesto a una aeronave.

🧩 Módulos del Sistema

1. Gestión de Requerimientos (Create Request & My Requisitions)

Registro Técnico (HU-001): Solicitud de partes asociadas a matrícula de aeronave (Tail Number) o stock general, autocompletado de catálogo y soporte para múltiples líneas.

Protocolo AOG (Aircraft On Ground): Activa alertas visuales críticas y altera las políticas de aprobación.

Prevención de Duplicados: Bloquea solicitudes repetidas si ya existe una orden activa en curso y emite advertencias preventivas si el componente ya se encuentra en inventario (In Stock).

Seguimiento y Gestión (HU-002): Búsqueda en tiempo real, filtros por estado, edición/cancelación con motivo obligatorio para órdenes pendientes y panel lateral (Drawer) con detalle logístico o ubicación física.

2. Proveedores y Compras (Vendor Directory & Procurement & Quotes)

Directorio de Proveedores Aprobados (HU-003): Catálogo filtrable con código de proveedor, contacto, ubicación y estado de acreditación (TCCA/FAA Approved). Incluye bloqueo visual y alerta de auditoría para proveedores en estado Suspended.

Comparación de Cotizaciones (HU-004): Contraste de ofertas por costo unitario, flete estimado, Lead Time y divisa (USD), permitiendo seleccionar la cotización ganadora.

Gobernanza y Aprobación Gerencial (HU-005): Evaluación automática de políticas: toda compra superior a $1,500 USD o con prioridad AOG queda retenida en Pending Manager Approval. Los rechazos exigen una justificación formal obligatoria.

Emisión de Orden de Compra (HU-006): Generación de Purchase Order (PO) con asignación de modalidad de pago (Corporate Card, Net 30, Wire Transfer) y actualización inmediata a estado Purchased.

3. Logística y Recepción Física (Logistics Dispatch & Warehouse Receiving)

Despacho Internacional (HU-007): Asignación de empresa transportadora (FedEx, DHL, UPS, Specialized Air Cargo) y número de guía (AWB / Tracking Number), cambiando el estado a In Transit.

Inspección Física en Almacén (HU-008): Verificación de paquetes entrantes mediante comparación del Part Number esperado contra el escaneado y evaluación de integridad del embalaje (Intact vs. Damaged).

Conforme: Avanza a estado Received para revisión documental.

No Conforme: Dispara alerta de seguridad y deriva la pieza a Quarantined (Red Tag).

4. Aseguramiento de Calidad y Auditoría (Quality Assurance & Audit & Traceability)

Certificación Aeronáutica (HU-009): Registro y validación de documentos de liberación autorizados únicamente bajo formatos TCCA Form One, FAA 8130-3 o EASA Form 1, exigiendo número de certificado y autoridad emisora.

Control de Vida Útil — Shelf Life (HU-010): Cálculo matemático automático de los días y porcentaje de vida útil remanente para partes consumibles a partir de fechas de fabricación y expiración. Si la fecha está vencida, el sistema lanza una alerta crítica roja y deshabilita automáticamente el ingreso a inventario.

Admisión a Inventario (HU-011): Habilita el botón Admit to Inventory únicamente cuando los certificados, la vida útil y la ubicación física (Bay / Shelf / Bin) están completos y válidos, pasando el repuesto a In Stock.

Cuarentena Formal y Reporte de Rechazo (HU-012): Modal de no conformidad que exige clasificación del defecto (Physical Damage, Doc Discrepancy, Missing Cert, Expired) y justificación técnica para aplicar etiqueta roja (Red Tag) y notificar a compras.

Trazabilidad Integral (HU-013): Buscador por Request ID o Part Number que despliega una línea de tiempo cronológica en UTC con el expediente completo (desde la requisición hasta el almacenamiento final), respaldado por sello de integridad y política de retención inmutable de 5 años.

## 📋 Matriz de Trazabilidad de Historias de Usuario

| ID | Historia de Usuario | Rol Principal | Módulo en Prototipo | Requisitos Asociados | Estado |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **HU-001** | Registro de requerimiento técnico de partes | Mecánico de Línea | `Create Request` | Validación de duplicados, alerta AOG | ✅ Completado |
| **HU-002** | Consulta, edición y cancelación de requerimientos | Mecánico de Línea | `My Requisitions` | Filtros, buscador, drawer de detalles | ✅ Completado |
| **HU-003** | Consulta y gestión del catálogo de proveedores aprobados | Comprador (Colombia) | `Vendor Directory` | RF-007, RF-010 / RNF-001, RNF-003, RNF-007 | ✅ Completado |
| **HU-004** | Registro y comparación de cotizaciones | Comprador (Colombia) | `Procurement & Quotes` | RF-007, RF-008 / RNF-001, RNF-003, RNF-007 | ✅ Completado |
| **HU-005** | Aprobación de compras según monto o criticidad | Gerente de Mantenimiento | `Procurement & Quotes` | RF-009 / RNF-001, RNF-003, RNF-007 | ✅ Completado |
| **HU-006** | Registro de órdenes de compra (PO) | Comprador (Colombia) | `Procurement & Quotes` | RF-010, RF-011 / RNF-001, RNF-003, RNF-007 | ✅ Completado |
| **HU-007** | Seguimiento del envío de partes (Despacho) | Comprador (Colombia) | `My Requisitions` (Modal) | RF-012, RF-013 / RNF-001, RNF-004, RNF-007 | ✅ Completado |
| **HU-008** | Registro de recepción e inspección física de partes | Almacenista (Canadá) | `Warehouse Receiving` | RF-014, RF-015 / RNF-001, RNF-003, RNF-007 | ✅ Completado |
| **HU-009** | Verificación de documentación y certificaciones aeronáuticas | Almacenista (Canadá) | `Quality Assurance` | RF-016 / RNF-001, RNF-003, RNF-007 | ✅ Completado |
| **HU-010** | Control de caducidad y vida límite de componentes | Almacenista (Canadá) | `Quality Assurance` | RF-017 / RNF-001, RNF-003, RNF-007 | ✅ Completado |
| **HU-011** | Ingreso de partes conformes al inventario | Almacenista (Canadá) | `Quality Assurance` | RF-018 / RNF-001, RNF-003, RNF-007 | ✅ Completado |
| **HU-012** | Registro de partes no conformes, cuarentena (Red Tag) y rechazo | Almacenista (Canadá) | `Quality Assurance` (Modal) | RF-019, RF-020 / RNF-001, RNF-003, RNF-007 | ✅ Completado |
| **HU-013** | Consulta de la trazabilidad integral de una parte | Gerente de Mantenimiento | `Audit & Traceability` | RF-021 / RNF-001, RNF-003, RNF-004 | ✅ Completado |

🛠️ Stack Tecnológico y Arquitectura

El proyecto fue construido con tecnologías web estándar, sin dependencias de frameworks pesados, priorizando claridad estructural y rendimiento:

HTML5: Estructura semántica modular organizada por vistas, tablas interactivas, paneles laterales (drawers) y ventanas modales operativas.

CSS3 (Vanilla): Sistema de diseño empresarial basado en variables CSS (:root), Flexbox, CSS Grid, estados reactivos, animaciones de alerta y línea de tiempo vertical.

JavaScript (ES6+): Gestión de estado en memoria, sincronización dinámica entre vistas (ej. una orden comprada se habilita para despacho, luego aparece en recepción y pasa a cola de QA), validaciones reactivas de formularios y cálculos de fechas en UTC.

FontAwesome 6 & Google Fonts (Inter): Iconografía aeronáutica/técnica y tipografía moderna.

Estructura de Archivos

aerosupply-prototype/
├── index.html      # Estructura principal, vistas (HU-001 a HU-013) y modales
├── styles.css      # Estilos corporativos, sistema de badges y timeline de auditoría
├── app.js          # Lógica de negocio, validaciones y sincronización de estado
└── README.md       # Documentación del proyecto
