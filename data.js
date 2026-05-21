// Base de datos inicial para la Suite BIA de Colmédica / Aliansalud
// Estructurada según los campos exactos de las plantillas de Excel compartidas.

// Obtener o solicitar el nombre del usuario en el primer uso
function obtenerNombreUsuario() {
  let nombre = localStorage.getItem("bia_usuario_nombre");
  if (!nombre) {
    nombre = prompt("Bienvenido al BIA de Colmédica / Aliansalud.\n\nIngrese su nombre para el registro de auditoría:\n(Ej: María García - Continuidad de Negocio)") || "Equipo de Continuidad";
    localStorage.setItem("bia_usuario_nombre", nombre);
  }
  return nombre;
}

const BIA_INITIAL_DATA = {
  configuracion: {
    nivelesImpacto: [
      { id: "minimo", label: "Mínimo", color: "#10b981", orden: 1 },
      { id: "moderado", label: "Moderado", color: "#eab308", orden: 2 },
      { id: "significativo", label: "Significativo", color: "#f97316", orden: 3 },
      { id: "catastrofico", label: "Catastrófico", color: "#ef4444", orden: 4 }
    ]
  },
  procesos: [
    {
      id: "proc-1",
      nombreProceso: "Autorizaciones Aliansalud y Colmédica",
      nombreSubproceso: "Evaluación y Seguimiento Autorizaciones",
      descripcion: "Análisis por muestreo de la calidad de autorizaciones tanto de MPP como de PBS, los hallazgos son reportados en informe a los encargados de grupos autorizadores tanto en la Subgerencia de Autorizaciones como de modelos de atención, quienes deberán realizar la retroalimentación a los colaboradores evaluar las implementación de las acciones propuestas o definir otras acciones de mejora; lo casos reiterativos o de costo alto son llevados a comité de autorizaciones. Evalúa a oficinas, call center, CNA PBS, alto costo MPP, SOM, central de referencia.",
      horario: "Lunes a Viernes 7:30am a 5pm, sábados de 8am a 12pm",
      trabajadores: "8 (5 en sede y 3 Teletrabajo)",
      ubicacion: "Bogotá, Calle 63 Trabajo en casa",
      periodosActividad: "Actividad a ejecutar mensualmente no presenta picos de operación",
      proveedoresApoyo: "Emtelco (Reporte y seguimiento de autorizaciones realizadas por CallCenter y vía WhatsApp)",
      
      // Flujo de Interdependencia (Entradas, Trámites, Salidas)
      flujo: [
        {
          id: "flujo-1-1",
          quienDaEntrada: "Subproceso de Autorizaciones, Mipres, CNA, SOM",
          entrada: "Relación o informe mensual de autorizaciones realizadas",
          medioEntrada: "Huella - Módulo autorizaciones",
          actividad: "Extracción de informe y depuración de información",
          medioRequerido: "Huella - Módulo de reportes",
          salida: "Reporte de Hallazgos de Autorizaciones con novedades",
          medioSalida: "Correo electrónico, Carpeta compartida de reportes",
          aQuienSeDirige: "Subproceso de Autorizaciones, Mipres, CNA, SOM"
        }
      ],
      
      // Análisis de Impacto Colmédica (Imagen 2)
      impactoColmedica: {
        financiero: ["minimo", "moderado", "moderado", "significativo"], // 1d, 3d, 1w, 1m
        operacional: ["minimo", "significativo", "moderado", "moderado"],
        legal: ["minimo", "moderado", "significativo", "catastrofico"],
        reputacional: ["moderado", "significativo", "significativo", "catastrofico"],
        rto: "24 horas",
        rpo: "N/A",
        mtpd: "72 horas"
      },
      
      // Análisis de Impacto Aliansalud (Imagen 2)
      impactoAliansalud: {
        financiero: ["moderado", "significativo", "significativo", "catastrofico"],
        operacional: ["minimo", "minimo", "moderado", "moderado"],
        legal: ["minimo", "moderado", "significativo", "catastrofico"],
        reputacional: ["moderado", "significativo", "significativo", "catastrofico"],
        rto: "24 horas",
        rpo: "N/A",
        mtpd: "48 horas"
      },
      fechaActualizacion: "2026-05-21",
      version: 1
    },
    {
      id: "proc-2",
      nombreProceso: "Autorizaciones Médicas",
      nombreSubproceso: "S.O.M. - Soporte Operativo Médico",
      descripcion: "Gestión operativa de autorizaciones médicas y soporte al proceso de servicio al cliente para continuidad de atención.",
      horario: "Lunes a Viernes 7:00 am a 5:30 pm",
      trabajadores: "6 (4 en sede y 2 teletrabajo)",
      ubicacion: "Bogotá, operación híbrida",
      periodosActividad: "Operación diaria con incremento en cierres de mes",
      proveedoresApoyo: "Emtelco (Operación de Call Center y seguimiento de casos por WhatsApp)",
      flujo: [
        {
          id: "flujo-2-1",
          quienDaEntrada: "Servicio al cliente, CNA, SOM",
          entrada: "Solicitudes de autorización y novedades operativas",
          medioEntrada: "HUELLA / Correo corporativo",
          actividad: "Validación, priorización y trazabilidad de solicitudes",
          medioRequerido: "HUELLA - módulo operativo",
          salida: "Autorizaciones gestionadas y reporte de novedades",
          medioSalida: "Correo electrónico y carpeta compartida",
          aQuienSeDirige: "Servicio al cliente y grupos autorizadores"
        }
      ],
      impactoColmedica: {
        financiero: ["moderado", "significativo", "significativo", "catastrofico"],
        operacional: ["minimo", "moderado", "significativo", "catastrofico"],
        legal: ["minimo", "moderado", "significativo", "catastrofico"],
        reputacional: ["moderado", "significativo", "significativo", "catastrofico"],
        rto: "4 horas",
        rpo: "N/A",
        mtpd: "24 horas"
      },
      impactoAliansalud: {
        financiero: ["moderado", "significativo", "significativo", "catastrofico"],
        operacional: ["minimo", "moderado", "significativo", "catastrofico"],
        legal: ["minimo", "moderado", "significativo", "catastrofico"],
        reputacional: ["moderado", "significativo", "significativo", "catastrofico"],
        rto: "4 horas",
        rpo: "N/A",
        mtpd: "24 horas"
      },
      fechaActualizacion: "2026-05-21",
      version: 1
    }
  ],
  
  aplicativos: [
    {
      id: "app-1",
      nombreProceso: "Servicio al cliente",
      nombreSubproceso: "(CAR) Central de Autorizaciones de Reclamos",
      aplicacion: "HUELLA",
      frecuencia: "Diaria",
      rtoMaxApp: "2 Horas",
      impactosInterrupcion: [
        "Daños a la reputación",
        "Pérdidas de ingresos financieros",
        "Incumplimiento contractual",
        "Operaciones - entregas no realizadas"
      ],
      explicacionImpacto: "Afectación directa en los tiempos de respuesta y atención para la Central de Autorizaciones de Reclamos.",
      dependenciasClave: "Mipres, CNA, SOM",
      tipoEstrategia: [
        "Esperar que el sistema se reanude",
        "Trabajo llevado a cabo manualmente"
      ],
      explicacionEstrategia: "Se determina un tiempo específico de espera para la reanudación del aplicativo en caso de interrupción. Si la reanudación lleva más tiempo del estipulado se procede a realizar el trabajo de forma manual.",
      estrategiasUsadasAntes: "Si",
      cuandoReanudara: "2 Horas",
      tiempoMantenerOperacion: "2 Horas",
      
      // Trabajo Acumulado (Imagen 4)
      porcentajeTrabajoInterrumpido: "1-25%",
      porcentajeTrabajoManual: "1-25%",
      porcentajeTrabajoAlternativos: "1-25%",
      porcentajeTrabajoOtros: "1-25%",
      tipoEstrategiaAcumulado: ["Datos cargados manualmente"],
      explicacionEstrategiaAcumulado: "Se realiza la operación de forma manual y posteriormente se cargan los datos al formato xxxx",
      fechaActualizacion: "2026-05-21",
      version: 1
    },
    {
      id: "app-2",
      nombreProceso: "Autorizaciones Médicas",
      nombreSubproceso: "S.O.M.",
      aplicacion: "HUELLA - Módulo Reportes",
      frecuencia: "Diaria",
      rtoMaxApp: "4 Horas",
      impactosInterrupcion: [
        "Impacto financiero",
        "Impacto operativo"
      ],
      explicacionImpacto: "Retrasos en autorizaciones y acumulación de casos por indisponibilidad del sistema.",
      dependenciasClave: "CNA, SOM, proveedor Emtelco",
      tipoEstrategia: [
        "Trabajo llevado a cabo manualmente"
      ],
      explicacionEstrategia: "Se registra la gestión en formato manual y se carga al sistema cuando se restablece.",
      estrategiasUsadasAntes: "Si",
      cuandoReanudara: "1 Hora",
      tiempoMantenerOperacion: "2 Horas",
      porcentajeTrabajoInterrumpido: "26-50%",
      porcentajeTrabajoManual: "26-50%",
      porcentajeTrabajoAlternativos: "1-25%",
      porcentajeTrabajoOtros: "1-25%",
      tipoEstrategiaAcumulado: ["Datos cargados manualmente"],
      explicacionEstrategiaAcumulado: "Se mantiene continuidad operativa manual con posterior cargue de datos.",
      fechaActualizacion: "2026-05-21",
      version: 1
    }
  ],
  
  proveedores: [
    {
      id: "prov-1",
      nombreProceso: "Autorizaciones Médicas",
      nombreSubproceso: "S.O.M.",
      proveedor: "Emtelco",
      servicioPrestado: "Call Center",
      horario: "Lunes a Viernes 7:00 am a 5:30 pm",
      direccion: "CL 52A # 85A - 61",
      puntoContactoName: "Karen Pimiento Peña",
      puntoContactoEmail: "karenp@colmedica.com",
      suplenteContactoName: "Juli Andrea Alarcón González",
      suplenteContactoEmail: "juliag@colmedica.com",
      representanteProveedorName: "Maritza Garzón",
      representanteProveedorEmail: "Maritza.garzon@emtelco.com.co",
      representanteSuplenteName: "Duván Ovidio Hernández Pedraza",
      representanteSuplenteEmail: "duvan.hernandez@emtelco.com.co",
      impactoNoDisponible: "* Financiero\n* Operativo",
      estrategiasRecuperacion: "* Reproducir tareas manualmente",
      detallesEstrategia: "",
      rtoOfrecida: "4 horas",
      porcentajeTrabajo: "26 - 50%",
      periodoImplementacion: "1 Horas",
      periodoMantener: "2 Horas",
      herramientasComunicacion: "Correo Electrónico / TEAMS",
      fechaActualizacion: "2026-05-21",
      version: 1
    }
  ],
  
  historial: [
    {
      id: "hist-1",
      fecha: "2026-05-21T07:15:00",
      usuario: "Administrador del Sistema",
      tipo: "Migración inicial",
      referencia: "Todos los procesos",
      comentario: "Carga inicial de la matriz de Excel BIA de Colmédica / Aliansalud en la plataforma interactiva."
    }
  ],

  // Instantáneas anuales para comparación histórica
  // Se generan con el botón 'Tomar Instantánea Anual'
  snapshots: []
};

// Cargar de LocalStorage si existe, o inicializar con los datos definidos arriba
function obtenerDatosBIA() {
  const datosGuardados = localStorage.getItem("colmedica_bia_db");
  if (datosGuardados) {
    try {
      const parsed = JSON.parse(datosGuardados);
      // Migración: asegurar que snapshots exista en datos guardados
      if (!parsed.snapshots) parsed.snapshots = [];
      migrarConfiguracionNivelesImpacto(parsed);
      return parsed;
    } catch (e) {
      console.error("Error cargando base de datos local, reinstanciando...", e);
    }
  }
  // Si no existe, guardar e inicializar
  guardarDatosBIA(BIA_INITIAL_DATA);
  return JSON.parse(JSON.stringify(BIA_INITIAL_DATA));
}

function migrarConfiguracionNivelesImpacto(datos) {
  if (!datos.configuracion) datos.configuracion = {};
  if (!Array.isArray(datos.configuracion.nivelesImpacto) || datos.configuracion.nivelesImpacto.length === 0) {
    datos.configuracion.nivelesImpacto = JSON.parse(JSON.stringify(BIA_INITIAL_DATA.configuracion.nivelesImpacto));
  }
  const idsValidos = new Set(datos.configuracion.nivelesImpacto.map(n => n.id));
  const fallbackId = datos.configuracion.nivelesImpacto.slice().sort((a, b) => a.orden - b.orden)[0]?.id || "minimo";
  const legacyMap = { minimo: "minimo", moderado: "moderado", significativo: "significativo", catastrofico: "catastrofico" };
  const normalizar = (valor) => {
    if (idsValidos.has(valor)) return valor;
    if (legacyMap[valor] && idsValidos.has(legacyMap[valor])) return legacyMap[valor];
    return fallbackId;
  };
  (datos.procesos || []).forEach(p => {
    ["impactoColmedica", "impactoAliansalud"].forEach(claveImpacto => {
      const imp = p[claveImpacto];
      if (!imp) return;
      ["financiero", "operacional", "legal", "reputacional"].forEach(cat => {
        if (!Array.isArray(imp[cat])) imp[cat] = [fallbackId, fallbackId, fallbackId, fallbackId];
        imp[cat] = imp[cat].map(normalizar);
      });
    });
  });
}

function guardarDatosBIA(datos) {
  localStorage.setItem("colmedica_bia_db", JSON.stringify(datos));
}
