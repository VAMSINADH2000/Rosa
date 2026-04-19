// Realtime function-tool specs. Sent to OpenAI in the session config so the
// model can call them; the client side handles the calls and renders UI.

export const CITE_NMSU_DOC_TOOL = {
  type: "function" as const,
  name: "cite_nmsu_doc",
  description:
    "Cita una publicación de NMSU Extension cuando respondes sobre chile, plagas, enfermedades, riego, fertilización, o producción. Llama esta herramienta INMEDIATAMENTE antes o durante tu respuesta verbal cuando uses información de una guía NMSU. La interfaz mostrará una tarjeta con la guía citada al lado de la conversación.",
  parameters: {
    type: "object",
    properties: {
      doc_id: {
        type: "string",
        description:
          "El identificador exacto del documento NMSU (formato: nmsu-<series>-<número>, por ejemplo: nmsu-h-230, nmsu-a-128, nmsu-cr-573). Solo use IDs que aparecieron en los resultados de search_nmsu o en el índice listado en sus instrucciones.",
      },
      passage: {
        type: "string",
        description:
          "A short 1-sentence quote (max 25 words) IN THE SAME LANGUAGE you are currently speaking — Spanish if speaking Spanish, English if speaking English. Summarizes the part of the guide that supports your answer.",
      },
    },
    required: ["doc_id"],
  },
} as const;

export const SAVE_USER_PROFILE_TOOL = {
  type: "function" as const,
  name: "save_user_profile",
  description:
    "Guarda el perfil del agricultor después de las cuatro preguntas de bienvenida (nombre, ubicación, cultivos, años cultivando). Llama esta herramienta UNA SOLA VEZ después de obtener las cuatro respuestas. La interfaz guardará el perfil en el dispositivo del agricultor para futuras visitas.",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Nombre del agricultor tal como lo dijo.",
      },
      zip_or_city: {
        type: "string",
        description:
          "Código postal (5 dígitos) o nombre de ciudad/pueblo donde está su finca.",
      },
      crops: {
        type: "array",
        items: { type: "string" },
        description:
          "Lista de cultivos que el agricultor mencionó. Por ejemplo: ['chile', 'maíz', 'frijol'].",
      },
      years_farming: {
        type: "number",
        description: "Cantidad de años cultivando, como número entero.",
      },
    },
    required: ["name", "zip_or_city", "crops", "years_farming"],
  },
} as const;

export const SEARCH_NMSU_TOOL = {
  type: "function" as const,
  name: "search_nmsu",
  description:
    "Busca en la biblioteca completa de publicaciones NMSU Extension usando búsqueda semántica. Use esta herramienta ANTES de responder preguntas específicas sobre chile, plagas, enfermedades, riego, fertilización, o producción — le devolverá pasajes concretos de las guías relevantes. Luego use cite_nmsu_doc para mostrar la tarjeta visual, y formule su respuesta con la información recuperada.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "La consulta de búsqueda en el mismo idioma en que habla con el agricultor. Sea específico: incluya síntomas observados, palabras clave técnicas, y contexto ('hojas amarillas venas verdes chile', 'riego chile suelo arenoso verano', 'Phytophthora manchas tallo').",
      },
    },
    required: ["query"],
  },
} as const;

export const WEB_SEARCH_FALLBACK_TOOL = {
  type: "function" as const,
  name: "web_search_fallback",
  description:
    "ÚLTIMO RECURSO: busca en la web general cuando search_nmsu NO devuelve pasajes útiles Y el índice de títulos NMSU abajo TAMPOCO contiene una guía coincidente. Úselo con moderación — la información de la web es menos confiable que las guías NMSU Extension. Cuando use esto, diga al agricultor que la respuesta viene de la web y no de NMSU.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Consulta específica en inglés o español. Incluya el contexto agrícola/hortícola y la ubicación (suroeste de EE.UU., Nuevo México) para obtener resultados relevantes.",
      },
    },
    required: ["query"],
  },
} as const;

// SAVE_USER_PROFILE_TOOL kept in the file for easy re-enabling, but removed
// from the active tool set — onboarding flow was cut for demo speed.
export const ROSA_TOOLS = [
  SEARCH_NMSU_TOOL,
  CITE_NMSU_DOC_TOOL,
  WEB_SEARCH_FALLBACK_TOOL,
] as const;
