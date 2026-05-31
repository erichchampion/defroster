/* Defroster — bilingual content (EN / ES).
   English strings are lifted from the real repo (lib/i18n/en.json);
   Spanish covers the redesigned UI. */
window.I18N = {
  "en-us": {
    langName: "English",
    brand: { name: "Defroster", tagline: "Community safety, kept anonymous." },
    nav: { app: "Alerts", guide: "Know Your Rights", about: "About" },

    onboarding: {
      eyebrow: "Anonymous · Real-time · On your block",
      title: "Know when ICE, the Army, or police are nearby.",
      sub: "Defroster lets neighbors quietly warn each other. One tap sends an anonymous alert to everyone within 5 miles — no name, no account, no trace.",
      trust: ["100% anonymous", "No account needed", "Auto-deletes"],
      cta: "Turn on location to begin",
      ctaLoading: "Getting your location…",
      ctaNote: "We use your location only to show alerts near you. It never leaves your device with your name attached.",
      secondaryRights: "Read: Know Your Rights",
      secondaryStory: "Why we built this",
      ios: {
        badge: "iPhone & iPad",
        title: "Add Defroster to your Home Screen",
        required: "Required on iOS — alerts and notifications only work once Defroster is saved to your Home Screen as a web app.",
        steps: [
          ["Tap", "Share", "in Safari", "share"],
          ["Choose", "Add to Home Screen", "", "plus"],
          ["Open Defroster", "from your Home Screen", "", "home"]
        ],
        location: "Also turn on {locationServicesLink} for Safari Websites, then save this site to your {homeScreenLink}.",
        locationServicesText: "Location Services",
        locationServicesUrl: "https://support.apple.com/en-us/102515",
        homeScreenText: "Home Screen",
        homeScreenUrl: "https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios"
      },
      privacyTitle: "What stays private",
      privacy: [
        ["Location is only used to find nearby alerts", "lock"],
        ["Your spot is blurred to the nearest block (~250 ft)", "blur"],
        ["Reports leave the server after 1 day", "clock"],
        ["No personal data is ever stored", "shield"],
        ["No accounts, no sign-in, ever", "user"],
        ["You can turn off location anytime", "toggle"]
      ],
      storyTitle: "Why Defroster exists",
      story1: "In the early hours of October 2, a South Shore Drive apartment building in Chicago was torn apart by a federal raid. Agents stormed the five-story complex with helicopters, armored vehicles, and flash-bang grenades. Families were forced from their homes, zip-tied in the street — some unclothed — and left outside for hours.",
      story2: "Incidents like this show the urgent need for tools that protect and inform. Defroster is an anonymous, open-source app that lets anyone report Immigration and Customs Enforcement (ICE) activity with a single tap — so communities can stay safe, informed, and connected while remaining fully anonymous."
    },

    app: {
      reportCta: "Report a sighting",
      statusOn: "Alerts on",
      statusOffline: "Offline — showing saved alerts",
      enableNotif: "Turn on notifications",
      notifWhy: "Get a heads-up when something is reported within 5 miles.",
      mapTab: "Map",
      listTab: "List",
      nearbyTitle: "Nearby sightings",
      radiusNote: "Within 5 miles of you",
      empty: "All clear nearby",
      emptySub: "No sightings reported around you right now.",
      yourLocation: "You are here",
      sightingAt: "Reported near here",
      withinRadius: "Within 5 miles of you",
      rightsCardTitle: "Know your rights",
      rightsCardSub: "What to do if ICE is at the door — plain and clear.",
      rightsCardCta: "Open the guide",
      refresh: "Refresh"
    },

    report: {
      title: "What did you see?",
      sub: "Pick one. Your report is anonymous and the location is blurred to the block.",
      types: {
        ICE:    { label: "ICE", full: "Immigration & Customs Enforcement", hint: "Immigration enforcement agents" },
        Army:   { label: "Army / National Guard", full: "Army or National Guard", hint: "Military or National Guard" },
        Police: { label: "Police", full: "Local or state police", hint: "Local or state police" }
      },
      locLabel: "Your location (blurred to the block)",
      send: "Send anonymous alert",
      sending: "Sending…",
      doneTitle: "Alert sent",
      doneSub: "Neighbors within 5 miles have been notified. Thank you for looking out.",
      doneClose: "Done",
      cancel: "Cancel"
    },

    guide: {
      title: "Know Your Rights",
      sub: "What to do when U.S. Immigration and Customs Enforcement (ICE) is at the door. Save this. Share it.",
      tocTitle: "Jump to",
      sections: {
        stopped: "If you're stopped by ICE",
        warrants: "Judicial warrant vs. ICE paper",
        school: "School safety",
        police: "Local police & 287(g)",
        help: "How everyone can help",
        legal: "Need legal help?"
      },
      stopped: {
        rightsTitle: "Your rights — use them",
        rights: [
          "You have the right to remain silent. Use it.",
          "Do not speak without a lawyer present.",
          "Never lie or show false documents. (ICE can lie to you; you cannot lie to them.)",
          "Memorize your A-number, your lawyer's phone number, and a family contact."
        ],
        arrestedTitle: "If you're arrested",
        arrested: [
          "Ask for a lawyer immediately.",
          "If you can't afford one, ask for a public defender.",
          "Do not speak to law enforcement without a lawyer."
        ]
      },
      warrants: {
        intro: "This is the single most important thing to know. ICE cannot enter your home without a warrant signed by a judge.",
        judicial: {
          tag: "Judicial warrant",
          verdict: "You must comply",
          points: [
            "Signed by a judge, from a real court.",
            "Says \u201cSearch and Seizure\u201d and lists your name & address.",
            "Has a judge's signature line."
          ]
        },
        admin: {
          tag: "ICE / DHS paper",
          verdict: "You can refuse",
          points: [
            "Issued by ICE itself — not a judge.",
            "Says \u201cWarrant for Arrest of Alien\u201d, not search.",
            "Signed by an immigration officer, not a judge.",
            "Does not let them enter your home."
          ]
        },
        ask: "Ask them to slip the warrant under the door or hold it to a window. If there's no judge's signature, you do not have to open the door.",
        imgCaption: "Real examples: a judicial warrant (left) and a DHS arrest warrant (right). ICE cannot enter your home with only the DHS document."
      },
      school: {
        intro: "Contact your local board of education and teachers' union to:",
        points: [
          "Understand their protection policies.",
          "Ask how you can help — for all parents, not only immigrant families."
        ]
      },
      police: {
        warn: "Many areas have 287(g) agreements that require local police to work with ICE. Calling local police may bring ICE involvement.",
        what: "287(g) are federal agreements forcing local police to enforce immigration law — active in 1,000+ agencies across nearly all states. Only six states have banned them: Washington, Oregon, California, Illinois, New Jersey, and Connecticut."
      },
      help: {
        items: [
          ["Get involved locally", "Attend school board, city council, and town hall meetings. Join local immigrant-rights groups."],
          ["Contact Congress", "Call your representatives regularly. Push for humane policy and due process."],
          ["Support organizations", "Volunteer for phone banks, door-knocking, petitions. Donate to local rights groups."],
          ["Stay informed", "Follow non-profit investigative media. Share good information with your community."],
          ["Organize & mobilize", "Bring friends to meetings and actions. Build community networks."],
          ["Sanctuary locations", "800+ houses of worship offer shelter. Note: they have no special legal protection from warrants."],
          ["Repeal 287(g)", "These are local agreements. Ask your city council, mayor, and police chief to end them."]
        ],
        repsUrl: "https://www.congress.gov/members/find-your-member"
      },
      legal: {
        points: [
          "Find an immigration lawyer before an emergency.",
          "Be fully honest about your status — attorney–client privilege protects you.",
          "Most firms offer help in multiple languages."
        ]
      },
      takeaway: "Know your rights, get legal help, and engage locally. Change happens at the community level.",
      rightsUrl: "https://www.aclusocal.org/icenotwelcome",
      rightsUrlLabel: "aclusocal.org/icenotwelcome"
    },

    footer: {
      privacy: "No accounts · No tracking · Open source",
      open: "Open source on GitHub",
      disclaimer: "Defroster is a community tool for safety information. It is not legal advice."
    }
  },

  "es-us": {
    langName: "Español",
    brand: { name: "Defroster", tagline: "Seguridad comunitaria, de forma anónima." },
    nav: { app: "Alertas", guide: "Conoce tus derechos", about: "Acerca de" },

    onboarding: {
      eyebrow: "Anónimo · En tiempo real · En tu cuadra",
      title: "Entérate cuando ICE, el Ejército o la policía están cerca.",
      sub: "Defroster permite que los vecinos se avisen entre sí. Un toque envía una alerta anónima a todos en un radio de 5 millas — sin nombre, sin cuenta, sin rastro.",
      trust: ["100% anónimo", "Sin cuenta", "Se borra solo"],
      cta: "Activa la ubicación para empezar",
      ctaLoading: "Obteniendo tu ubicación…",
      ctaNote: "Usamos tu ubicación solo para mostrarte alertas cercanas. Nunca sale de tu dispositivo con tu nombre.",
      secondaryRights: "Leer: Conoce tus derechos",
      secondaryStory: "Por qué lo creamos",
      ios: {
        badge: "iPhone y iPad",
        title: "Agrega Defroster a tu pantalla de inicio",
        required: "Obligatorio en iOS — las alertas y notificaciones solo funcionan cuando Defroster se guarda en tu pantalla de inicio como app web.",
        steps: [
          ["Toca", "Compartir", "en Safari", "share"],
          ["Elige", "Agregar a inicio", "", "plus"],
          ["Abre Defroster", "desde tu pantalla de inicio", "", "home"]
        ],
        location: "También activa {locationServicesLink} para sitios de Safari y guarda este sitio en tu {homeScreenLink}.",
        locationServicesText: "Servicios de ubicación",
        locationServicesUrl: "https://support.apple.com/es-us/102515",
        homeScreenText: "pantalla de inicio",
        homeScreenUrl: "https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios"
      },
      privacyTitle: "Lo que se mantiene privado",
      privacy: [
        ["La ubicación solo se usa para encontrar alertas cercanas", "lock"],
        ["Tu lugar se difumina a la cuadra más cercana (~250 pies)", "blur"],
        ["Los reportes salen del servidor después de 1 día", "clock"],
        ["Nunca se guardan datos personales", "shield"],
        ["Sin cuentas, sin inicio de sesión, nunca", "user"],
        ["Puedes desactivar la ubicación cuando quieras", "toggle"]
      ],
      storyTitle: "Por qué existe Defroster",
      story1: "En la madrugada del 2 de octubre, un edificio de apartamentos en South Shore Drive, Chicago, fue destrozado por una redada federal. Agentes irrumpieron en el complejo de cinco pisos con helicópteros, vehículos blindados y granadas aturdidoras. Familias fueron sacadas de sus hogares, atadas en la calle — algunas sin ropa — y dejadas afuera por horas.",
      story2: "Incidentes como este muestran la necesidad urgente de herramientas que protejan e informen. Defroster es una app anónima y de código abierto que permite reportar actividad de ICE con un solo toque — para que las comunidades estén seguras, informadas y conectadas, manteniéndose totalmente anónimas."
    },

    app: {
      reportCta: "Reportar un avistamiento",
      statusOn: "Alertas activadas",
      statusOffline: "Sin conexión — mostrando alertas guardadas",
      enableNotif: "Activar notificaciones",
      notifWhy: "Recibe un aviso cuando algo se reporta a menos de 5 millas.",
      mapTab: "Mapa",
      listTab: "Lista",
      nearbyTitle: "Avistamientos cercanos",
      radiusNote: "A menos de 5 millas de ti",
      empty: "Todo despejado cerca",
      emptySub: "No hay avistamientos reportados a tu alrededor ahora mismo.",
      yourLocation: "Estás aquí",
      sightingAt: "Reportado por aquí",
      withinRadius: "A menos de 5 millas de ti",
      rightsCardTitle: "Conoce tus derechos",
      rightsCardSub: "Qué hacer si ICE está en la puerta — claro y sencillo.",
      rightsCardCta: "Abrir la guía",
      refresh: "Actualizar"
    },

    report: {
      title: "¿Qué viste?",
      sub: "Elige uno. Tu reporte es anónimo y la ubicación se difumina a la cuadra.",
      types: {
        ICE:    { label: "ICE", full: "Inmigración y Control de Aduanas", hint: "Agentes de inmigración" },
        Army:   { label: "Ejército / Guardia Nacional", full: "Ejército o Guardia Nacional", hint: "Militares o Guardia Nacional" },
        Police: { label: "Policía", full: "Policía local o estatal", hint: "Policía local o estatal" }
      },
      locLabel: "Tu ubicación (difuminada a la cuadra)",
      send: "Enviar alerta anónima",
      sending: "Enviando…",
      doneTitle: "Alerta enviada",
      doneSub: "Se notificó a los vecinos en un radio de 5 millas. Gracias por cuidar a tu comunidad.",
      doneClose: "Listo",
      cancel: "Cancelar"
    },

    guide: {
      title: "Conoce tus derechos",
      sub: "Qué hacer cuando ICE está en la puerta. Guárdalo. Compártelo.",
      tocTitle: "Ir a",
      sections: {
        stopped: "Si ICE te detiene",
        warrants: "Orden judicial vs. papel de ICE",
        school: "Seguridad escolar",
        police: "Policía local y 287(g)",
        help: "Cómo todos pueden ayudar",
        legal: "¿Necesitas ayuda legal?"
      },
      stopped: {
        rightsTitle: "Tus derechos — úsalos",
        rights: [
          "Tienes derecho a guardar silencio. Úsalo.",
          "No hables sin un abogado presente.",
          "Nunca mientas ni muestres documentos falsos. (ICE puede mentirte; tú no puedes mentirles.)",
          "Memoriza tu número A, el teléfono de tu abogado y un contacto familiar."
        ],
        arrestedTitle: "Si te arrestan",
        arrested: [
          "Pide un abogado de inmediato.",
          "Si no puedes pagar uno, pide un defensor público.",
          "No hables con las autoridades sin un abogado."
        ]
      },
      warrants: {
        intro: "Esto es lo más importante que debes saber. ICE no puede entrar a tu casa sin una orden firmada por un juez.",
        judicial: {
          tag: "Orden judicial",
          verdict: "Debes cumplir",
          points: [
            "Firmada por un juez, de un tribunal real.",
            "Dice \u201cSearch and Seizure\u201d e incluye tu nombre y dirección.",
            "Tiene una línea con la firma del juez."
          ]
        },
        admin: {
          tag: "Papel de ICE / DHS",
          verdict: "Puedes negarte",
          points: [
            "Emitido por ICE — no por un juez.",
            "Dice \u201cWarrant for Arrest of Alien\u201d, no búsqueda.",
            "Firmado por un agente de inmigración, no un juez.",
            "No les permite entrar a tu casa."
          ]
        },
        ask: "Pídeles que pasen la orden por debajo de la puerta o la muestren por la ventana. Si no tiene la firma de un juez, no tienes que abrir la puerta.",
        imgCaption: "Ejemplos reales: una orden judicial (izquierda) y una orden de arresto del DHS (derecha). ICE no puede entrar a tu casa solo con el documento del DHS."
      },
      school: {
        intro: "Contacta a tu junta de educación local y al sindicato de maestros para:",
        points: [
          "Entender sus políticas de protección.",
          "Preguntar cómo puedes ayudar — para todos los padres, no solo familias inmigrantes."
        ]
      },
      police: {
        warn: "Muchas zonas tienen acuerdos 287(g) que obligan a la policía local a colaborar con ICE. Llamar a la policía local puede traer a ICE.",
        what: "Los 287(g) son acuerdos federales que obligan a la policía local a aplicar leyes de inmigración — activos en más de 1,000 agencias en casi todos los estados. Solo seis los han prohibido: Washington, Oregón, California, Illinois, Nueva Jersey y Connecticut."
      },
      help: {
        items: [
          ["Participa localmente", "Asiste a juntas escolares, concejos municipales y reuniones públicas. Únete a grupos de derechos de inmigrantes."],
          ["Contacta al Congreso", "Llama a tus representantes con frecuencia. Exige políticas humanas y debido proceso."],
          ["Apoya a organizaciones", "Sé voluntario en campañas y peticiones. Dona a grupos locales de derechos."],
          ["Mantente informado", "Sigue a medios investigativos sin fines de lucro. Comparte buena información con tu comunidad."],
          ["Organiza y moviliza", "Lleva amigos a reuniones y acciones. Construye redes comunitarias."],
          ["Lugares santuario", "Más de 800 lugares de culto ofrecen refugio. Nota: no tienen protección legal especial ante órdenes."],
          ["Deroga el 287(g)", "Son acuerdos locales. Pide a tu concejo, alcalde y jefe de policía que los terminen."]
        ],
        repsUrl: "https://www.congress.gov/members/find-your-member"
      },
      legal: {
        points: [
          "Busca un abogado de inmigración antes de una emergencia.",
          "Sé totalmente honesto sobre tu estatus — el privilegio abogado-cliente te protege.",
          "La mayoría de los bufetes ofrecen ayuda en varios idiomas."
        ]
      },
      takeaway: "Conoce tus derechos, busca ayuda legal y participa localmente. El cambio ocurre a nivel comunitario.",
      rightsUrl: "https://www.aclusocal.org/icenotwelcome",
      rightsUrlLabel: "aclusocal.org/icenotwelcome"
    },

    footer: {
      privacy: "Sin cuentas · Sin rastreo · Código abierto",
      open: "Código abierto en GitHub",
      disclaimer: "Defroster es una herramienta comunitaria de información de seguridad. No es asesoría legal."
    }
  }
};
