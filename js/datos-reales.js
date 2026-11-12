/* Datos reales de la pareja (solo datos, sin lógica).
   Fuente de verdad: docs/modelo_datos.json. Esta copia existe porque la app corre con file://
   y no puede hacer fetch de JSON. Si cambian el JSON, actualicen también este archivo.
   Montos: enteros en COP. */
const DATOS_REALES =
{
    "finanzas_hogar": {
      "ingresos": {
        "total_mensual": 0,
        "fuente_principal": "David"
      },
      "presupuesto_gastos": [
        { "id": "g_01", "categoria": "Arriendo", "tipo": "fijo", "presupuestado": 0, "ejecutado": 0 },
        { "id": "g_02", "categoria": "Mercado", "tipo": "fijo", "presupuestado": 0, "ejecutado": 0 },
        { "id": "g_03", "categoria": "Internet", "tipo": "fijo", "presupuestado": 0, "ejecutado": 0 },
        { "id": "g_04", "categoria": "Servicios Públicos", "tipo": "variable", "presupuestado": 0, "ejecutado": 0 },
        { "id": "g_05", "categoria": "Suscripciones (Netflix, YouTube, Google, iCloud)", "tipo": "fijo", "presupuestado": 0, "ejecutado": 0 },
        { "id": "g_06", "categoria": "Deuda David", "tipo": "fijo", "presupuestado": 0, "ejecutado": 0 },
        { "id": "g_07", "categoria": "Deuda Externa", "tipo": "fijo", "presupuestado": 0, "ejecutado": 0 },
        { "id": "g_08", "categoria": "Salud (EPS y Prepagada)", "tipo": "fijo", "presupuestado": 0, "ejecutado": 0 },
        { "id": "g_09", "categoria": "Salud (Citas y Farmacia)", "tipo": "variable", "presupuestado": 0, "ejecutado": 0 },
        { "id": "g_10", "categoria": "Salidas y Ocio", "tipo": "variable", "presupuestado": 0, "ejecutado": 0 },
        { "id": "g_11", "categoria": "Domicilios y Antojos", "tipo": "variable", "presupuestado": 0, "ejecutado": 0 },
        { "id": "g_12", "categoria": "Transporte General (Uber/Pasajes)", "tipo": "variable", "presupuestado": 0, "ejecutado": 0 },
        { "id": "g_13", "categoria": "Transporte Moto (Gasolina y Lavadas)", "tipo": "variable", "presupuestado": 0, "ejecutado": 0 },
        { "id": "g_14", "categoria": "Mascotas (Cuido y Snacks)", "tipo": "variable", "presupuestado": 0, "ejecutado": 0 },
        { "id": "g_15", "categoria": "Cuidado Personal y Gimnasio", "tipo": "variable", "presupuestado": 0, "ejecutado": 0 },
        { "id": "g_16", "categoria": "Compras Personales (Ropa, Belleza)", "tipo": "variable", "presupuestado": 0, "ejecutado": 0 },
        { "id": "g_17", "categoria": "Gastos Varios (Imprevistos)", "tipo": "variable", "presupuestado": 0, "ejecutado": 0 },
        { "id": "g_18", "categoria": "Fondo: Documentos Moto (SOAT, Tecno)", "tipo": "fondo_anual", "presupuestado": 0, "ejecutado": 0 },
        { "id": "g_19", "categoria": "Fondo: DIAN y Contador", "tipo": "fondo_anual", "presupuestado": 0, "ejecutado": 0 },
        { "id": "g_20", "categoria": "Fondo: Regalos y Fechas Especiales", "tipo": "fondo_anual", "presupuestado": 0, "ejecutado": 0 }
      ],
      "ahorros_e_inversiones": [
        { "id": "a_01", "categoria": "Fondo de Vivienda (Largo Plazo)", "aporte_mensual": 0, "acumulado_actual": 0 },
        { "id": "a_02", "categoria": "Fondo Vehículo (Mediano Plazo)", "aporte_mensual": 0, "acumulado_actual": 0 },
        { "id": "a_03", "categoria": "Fondo Corto Plazo (Navidad/Otros)", "aporte_mensual": 0, "acumulado_actual": 0 },
        { "id": "a_04", "categoria": "Inversiones Diversificadas", "aporte_mensual": 0, "acumulado_actual": 0 },
        { "id": "a_05", "categoria": "Fondo Viaje Argentina (Febrero)", "aporte_mensual": 0, "acumulado_actual": 0 }
      ],
      "metas_compras": [
        { "id": "m_01", "item": "Viaje Aniversario Argentina", "costo_estimado": 0, "ahorrado": 0 },
        { "id": "m_02", "item": "Cuota Inicial Casa", "costo_estimado": 0, "ahorrado": 0 },
        { "id": "m_03", "item": "Carro", "costo_estimado": 0, "ahorrado": 0 },
        { "id": "m_04", "item": "Cama + Colchón", "costo_estimado": 0, "ahorrado": 0 },
        { "id": "m_05", "item": "Escritorio", "costo_estimado": 0, "ahorrado": 0 }
      ],
      "tareas_pendientes": [
        { "id": "t_01", "tarea": "Organizar la puerta", "estado": "pendiente" },
        { "id": "t_02", "tarea": "Poner la chapa", "estado": "pendiente" },
        { "id": "t_03", "tarea": "Cotizar escritorio y cama", "estado": "pendiente" },
        { "id": "t_04", "tarea": "Bañar a los perros", "estado": "pendiente" },
        { "id": "t_05", "tarea": "Revisar y comprar faltantes de navidad", "estado": "pendiente" },
        { "id": "t_06", "tarea": "Poner la estantería", "estado": "pendiente" },
        { "id": "t_07", "tarea": "Poner las luces led", "estado": "pendiente" },
        { "id": "t_08", "tarea": "Guardar la maleta y el restante en cuarto útil", "estado": "pendiente" }
      ]
    }
  }
;
