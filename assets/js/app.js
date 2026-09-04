(() => {
  "use strict";

  document.documentElement.classList.remove("no-js");

  // Change this value if the GitHub repository or default branch changes.
  const REMOTE_CONTENT_URL =
    "https://raw.githubusercontent.com/tears-mysthrala/gilraennr-links/main/content/links.json";
  const LOCAL_FALLBACK_URL = "content/fallback.json";
  const REQUEST_TIMEOUT_MS = 3500;
  const MAX_JSON_BYTES = 256 * 1024;
  const MAX_LINK_ENTRIES = 500;
  const MAX_SECTION_ENTRIES = 150;
  const MAX_LINKS = 100;
  const MAX_SECTIONS = 30;
  const MAX_LIVE_TTL_MS = 2 * 60 * 60 * 1000;
  const GIT_COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;
  const GITHUB_PATH_COMPONENT_PATTERN = /^[a-z0-9_.-]+$/i;
  const DEFAULT_AFFILIATE_DISCLOSURE =
    "Este es un enlace de afiliación. Si compras a través de él, GilraenNR puede recibir una comisión sin coste adicional para ti.";

  const ICONS = new Set([
    "twitch",
    "youtube",
    "kick",
    "x",
    "instagram",
    "patreon",
    "gift",
    "gamepad",
    "store",
    "mail",
    "link"
  ]);
  const VARIANTS = new Set(["default", "streaming", "support", "contact", "social", "partners"]);
  const debugMode =
    new URLSearchParams(window.location.search).has("debug") ||
    ["localhost", "127.0.0.1"].includes(window.location.hostname);

  const elements = {
    avatar: document.querySelector("#profile-avatar"),
    avatarFallback: document.querySelector("#avatar-fallback"),
    brandLink: document.querySelector("#brand-link"),
    brandName: document.querySelector("#brand-name"),
    name: document.querySelector("#profile-name"),
    handle: document.querySelector("#profile-handle"),
    bio: document.querySelector("#profile-bio"),
    liveIndicator: document.querySelector("#live-indicator"),
    liveIndicatorText: document.querySelector("#live-indicator-text"),
    featuredCard: document.querySelector("#featured-card"),
    featuredIconUse: document.querySelector("#featured-icon-use"),
    featuredLabel: document.querySelector("#featured-label"),
    featuredTitle: document.querySelector("#featured-title"),
    featuredDescription: document.querySelector("#featured-description"),
    featuredDisclosure: document.querySelector("#featured-disclosure"),
    featuredLink: document.querySelector("#featured-link"),
    featuredAction: document.querySelector("#featured-action"),
    featuredExternalNote: document.querySelector("#featured-external-note"),
    sections: document.querySelector("#sections-root"),
    status: document.querySelector("#load-status"),
    year: document.querySelector("#current-year"),
    footerName: document.querySelector("#footer-name")
  };

  function cleanText(value, fallback = "", maxLength = 240) {
    if (typeof value !== "string") return fallback;
    const text = value.trim().replace(/\s+/g, " ");
    return text ? text.slice(0, maxLength) : fallback;
  }

  function cleanId(value, fallback = "") {
    const id = cleanText(value, fallback, 80).toLowerCase();
    return /^[a-z0-9][a-z0-9_-]*$/.test(id) ? id : fallback;
  }

  function sortOrder(value, fallback = 1000) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function safeUrl(value, allowRelative = false) {
    if (typeof value !== "string" || !value.trim()) return null;

    try {
      const candidate = value.trim();
      const url = allowRelative
        ? new URL(candidate, window.location.href)
        : new URL(candidate);
      const sameOrigin = url.origin === window.location.origin;

      if (url.protocol === "https:" || (allowRelative && sameOrigin)) {
        return url;
      }
    } catch {
      return null;
    }

    return null;
  }

  function safeImageUrl(value) {
    const url = safeUrl(value, true);
    if (!url) return null;

    const sameOrigin = url.origin === window.location.origin;
    const allowedRemoteImage =
      url.protocol === "https:" && url.hostname === "raw.githubusercontent.com";
    return sameOrigin || allowedRemoteImage ? url : null;
  }

  function safeLinkUrl(value) {
    if (typeof value !== "string" || !value.trim() || value.length > 2048) return null;

    const candidate = value.trim();
    const webUrl = safeUrl(candidate);
    if (webUrl) return webUrl;

    try {
      const url = new URL(candidate);
      if (url.protocol !== "mailto:" || url.search || url.hash) return null;

      const address = candidate.slice("mailto:".length);
      const validAddress = /^[a-z0-9.!#$&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
      return validAddress.test(address) ? url : null;
    } catch {
      return null;
    }
  }

  function safeStatusUrl(value) {
    const url = safeUrl(value);
    return url?.hostname === "raw.githubusercontent.com" ? url : null;
  }

  function boundedNumber(value, fallback, minimum, maximum) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(maximum, Math.max(minimum, number));
  }

  function normalizeData(raw) {
    const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const rawProfile =
      source.profile && typeof source.profile === "object" && !Array.isArray(source.profile)
        ? source.profile
        : {};

    const profile = {
      name: cleanText(rawProfile.name, "GilraenNR", 80),
      handle: cleanText(rawProfile.handle, "@gilraennr", 80),
      bio: cleanText(
        rawProfile.bio,
        "Directos y vídeos de juegos, simuladores y aventuras con chat.",
        280
      ),
      image: safeImageUrl(rawProfile.image)
    };
    const rawLiveStatus =
      source.liveStatus &&
      typeof source.liveStatus === "object" &&
      !Array.isArray(source.liveStatus)
        ? source.liveStatus
        : {};
    const liveStatusUrl = safeStatusUrl(rawLiveStatus.url);

    const rawSections = Array.isArray(source.sections)
      ? source.sections.slice(0, MAX_SECTION_ENTRIES)
      : [];
    const disabledSectionIds = new Set(
      rawSections
        .filter((entry) => entry && typeof entry === "object" && entry.enabled === false)
        .map((entry) => cleanId(entry.id, ""))
        .filter(Boolean)
    );
    const rawLinks = Array.isArray(source.links)
      ? source.links.slice(0, MAX_LINK_ENTRIES)
      : [];
    const seenLinks = new Set();
    const links = [];

    for (let index = 0; index < rawLinks.length && links.length < MAX_LINKS; index += 1) {
      const entry = rawLinks[index];
      if (!entry || typeof entry !== "object" || entry.enabled === false) continue;

      const id = cleanId(entry.id, `link-${index + 1}`);
      const url = safeLinkUrl(entry.url);
      const title = cleanText(entry.title, "", 100);
      const category = cleanId(entry.category, "more");

      if (!url || !title || seenLinks.has(id) || disabledSectionIds.has(category)) continue;
      seenLinks.add(id);

      links.push({
        id,
        title,
        url,
        description: cleanText(entry.description, "", 240),
        icon: ICONS.has(entry.icon) ? entry.icon : "link",
        category,
        enabled: true,
        order: sortOrder(entry.order ?? entry.priority),
        featured: entry.featured === true,
        label: cleanText(entry.label, "", 32),
        action: cleanText(entry.action, "", 60)
      });
    }

    links.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "es"));

    const seenSections = new Set();
    const sections = rawSections
      .filter((entry) => entry && typeof entry === "object" && entry.enabled !== false)
      .map((entry, index) => {
        const id = cleanId(entry.id, `section-${index + 1}`);
        const title = cleanText(entry.title, "", 100);

        if (!title || seenSections.has(id)) return null;
        seenSections.add(id);

        return {
          id,
          title,
          description: cleanText(entry.description, "", 220),
          order: sortOrder(entry.order ?? entry.priority),
          variant: VARIANTS.has(entry.variant) ? entry.variant : "default",
          disclosure: cleanText(entry.disclosure, "", 400)
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "es"));

    return {
      profile,
      links,
      sections,
      liveStatus: {
        enabled: rawLiveStatus.enabled !== false && Boolean(liveStatusUrl),
        url: liveStatusUrl,
        pollMs: Math.round(
          boundedNumber(rawLiveStatus.pollSeconds, 120, 30, 300) * 1000
        )
      },
      featuredLinkId: cleanId(source.featuredLinkId, ""),
      disclosure: cleanText(source.disclosure, DEFAULT_AFFILIATE_DISCLOSURE, 400)
    };
  }

  function createIcon(name, className = "") {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    const safeName = ICONS.has(name) || name === "external" || name === "arrow" ? name : "link";

    svg.setAttribute("aria-hidden", "true");
    if (className) svg.setAttribute("class", className);
    use.setAttribute("href", `#icon-${safeName}`);
    svg.append(use);
    return svg;
  }

  function configureExternalLink(anchor, url) {
    anchor.href = url.href;
    anchor.removeAttribute("target");
    anchor.removeAttribute("rel");
    const isExternal =
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.origin !== window.location.origin;

    if (isExternal) {
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
    }

    return isExternal;
  }

  function renderProfile(profile) {
    elements.name.textContent = profile.name;
    elements.brandName.textContent = profile.name;
    elements.brandLink.setAttribute("aria-label", `${profile.name}, página principal`);
    elements.footerName.textContent = profile.name;
    elements.handle.textContent = profile.handle;
    elements.bio.textContent = profile.bio;
    elements.avatarFallback.textContent = profile.name.charAt(0).toUpperCase() || "G";
    document.title = `${profile.name} · Directos, vídeos y comunidad`;

    elements.avatar.hidden = true;
    elements.avatar.alt = "";

    if (!profile.image) {
      elements.avatar.removeAttribute("src");
      return;
    }

    elements.avatar.addEventListener(
      "load",
      () => {
        elements.avatar.hidden = false;
      },
      { once: true }
    );
    elements.avatar.addEventListener(
      "error",
      () => {
        elements.avatar.removeAttribute("src");
        elements.avatar.hidden = true;
      },
      { once: true }
    );
    elements.avatar.alt = `Avatar de ${profile.name}`;
    elements.avatar.src = profile.image.href;
  }

  function renderFeatured(data) {
    const selected =
      data.links.find((link) => link.id === data.featuredLinkId) ||
      data.links.find((link) => link.featured);

    if (!selected) {
      elements.featuredCard.hidden = true;
      delete elements.featuredCard.dataset.icon;
      elements.featuredCard.classList.remove("is-loading");
      elements.featuredCard.setAttribute("aria-busy", "false");
      return null;
    }

    elements.featuredLabel.textContent = selected.label || "Destacado ahora";
    elements.featuredCard.dataset.icon = selected.icon;
    elements.featuredIconUse.setAttribute("href", `#icon-${selected.icon}`);
    elements.featuredTitle.textContent = selected.title;
    elements.featuredDescription.textContent =
      selected.description || `Visita ${selected.title}.`;
    elements.featuredAction.textContent = selected.action || `Ir a ${selected.title}`;
    const selectedSection = data.sections.find((section) => section.id === selected.category);
    const selectedIsCommercial =
      selected.category === "partners" ||
      selectedSection?.variant === "partners" ||
      Boolean(selectedSection?.disclosure);
    if (selectedIsCommercial) {
      elements.featuredDisclosure.textContent =
        selectedSection?.disclosure || data.disclosure || DEFAULT_AFFILIATE_DISCLOSURE;
      elements.featuredDisclosure.hidden = false;
    } else {
      elements.featuredDisclosure.textContent = "";
      elements.featuredDisclosure.hidden = true;
    }
    const featuredIsExternal = configureExternalLink(elements.featuredLink, selected.url);
    elements.featuredExternalNote.hidden = !featuredIsExternal;
    elements.featuredCard.hidden = false;
    elements.featuredCard.classList.remove("is-loading");
    elements.featuredCard.setAttribute("aria-busy", "false");
    return selected.id;
  }

  function createLinkCard(link) {
    const card = document.createElement("a");
    card.className = "link-card";
    card.dataset.icon = link.icon;
    const isExternal = configureExternalLink(card, link.url);

    const iconWrap = document.createElement("span");
    iconWrap.className = "link-card__icon";
    iconWrap.append(createIcon(link.icon));

    const body = document.createElement("span");
    body.className = "link-card__body";

    const topline = document.createElement("span");
    topline.className = "link-card__topline";

    const title = document.createElement("span");
    title.className = "link-card__title";
    title.textContent = link.title;
    topline.append(title);

    if (link.label) {
      const badge = document.createElement("span");
      badge.className = "link-card__badge";
      badge.textContent = link.label;
      topline.append(badge);
    }

    body.append(topline);

    if (link.description) {
      const description = document.createElement("span");
      description.className = "link-card__description";
      description.textContent = link.description;
      body.append(description);
    }

    card.append(iconWrap, body);
    if (isExternal) {
      const externalNote = document.createElement("span");
      externalNote.className = "sr-only";
      externalNote.textContent = " (se abre en una pestaña nueva)";
      card.append(externalNote);
    }
    card.append(createIcon(isExternal ? "external" : "arrow", "link-card__arrow"));
    return card;
  }

  function makeFallbackSection(category, order) {
    const words = category.replace(/[-_]+/g, " ");
    return {
      id: category,
      title: words.charAt(0).toUpperCase() + words.slice(1),
      description: "",
      order,
      variant: "default",
      disclosure: ""
    };
  }

  function renderSection(section, links, globalDisclosure) {
    const wrapper = document.createElement("section");
    const headingId = `section-${section.id}`;
    wrapper.className = "content-section";
    wrapper.dataset.variant = section.variant;
    wrapper.setAttribute("aria-labelledby", headingId);

    const heading = document.createElement("header");
    heading.className = "section-heading";

    const title = document.createElement("h2");
    title.id = headingId;
    title.textContent = section.title;
    heading.append(title);

    if (section.description) {
      const description = document.createElement("p");
      description.textContent = section.description;
      heading.append(description);
    }

    const grid = document.createElement("div");
    grid.className = "link-grid";
    links.forEach((link) => grid.append(createLinkCard(link)));
    wrapper.append(heading, grid);

    const isCommercialSection = section.id === "partners" || section.variant === "partners";
    const disclosureText = section.disclosure ||
      (isCommercialSection ? globalDisclosure : "");
    if (disclosureText) {
      const disclosure = document.createElement("p");
      disclosure.className = "section-disclosure";
      disclosure.append(createIcon("store"));
      const text = document.createElement("span");
      text.textContent = disclosureText;
      disclosure.append(text);
      wrapper.append(disclosure);
    }

    return wrapper;
  }

  function renderSections(data, featuredId) {
    elements.sections.replaceChildren();
    const claimedCategories = new Set(data.sections.map((section) => section.id));
    const categoryOrder = new Map();

    data.links.forEach((link) => {
      if (!categoryOrder.has(link.category)) categoryOrder.set(link.category, link.order);
    });

    const generatedSections = [...categoryOrder.entries()]
      .filter(([category]) => !claimedCategories.has(category))
      .map(([category, order]) => makeFallbackSection(category, order));

    const allSections = [...data.sections, ...generatedSections]
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "es"))
      .filter((section) => data.links.some((link) => link.category === section.id))
      .slice(0, MAX_SECTIONS);

    allSections.forEach((section) => {
      const links = data.links.filter(
        (link) => link.category === section.id && link.id !== featuredId
      );
      if (links.length) {
        elements.sections.append(renderSection(section, links, data.disclosure));
      }
    });

    if (!elements.sections.children.length && featuredId) {
      elements.sections.hidden = true;
    } else {
      elements.sections.hidden = false;
    }

    elements.sections.setAttribute("aria-busy", "false");
  }

  function render(data) {
    const normalized = normalizeData(data);
    if (!normalized.links.length) {
      throw new TypeError("El JSON no contiene ningún enlace válido.");
    }
    renderProfile(normalized.profile);
    const featuredId = renderFeatured(normalized);
    renderSections(normalized, featuredId);
    return normalized;
  }

  let liveStatusTimer = 0;
  let liveStatusExpiryTimer = 0;
  let lastLiveSnapshot = null;

  function hideLiveIndicator() {
    window.clearTimeout(liveStatusExpiryTimer);
    liveStatusExpiryTimer = 0;
    elements.liveIndicator.hidden = true;
    elements.liveIndicator.classList.remove("is-live", "is-offline");
    elements.liveIndicator.removeAttribute("aria-label");
    elements.liveIndicator.removeAttribute("title");
  }

  function renderLiveStatus(raw) {
    const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const expiresAt = Date.parse(source.expiresAt);
    const now = Date.now();
    const platformsSource =
      source.platforms &&
      typeof source.platforms === "object" &&
      !Array.isArray(source.platforms)
        ? source.platforms
        : {};
    const isFresh =
      Number.isFinite(expiresAt) &&
      expiresAt > now &&
      expiresAt <= now + MAX_LIVE_TTL_MS;
    const isLive = source.online === true && platformsSource.twitch === true;
    const isOffline = source.online === false && platformsSource.twitch === false;

    if (
      !isFresh ||
      (!isLive && !isOffline) ||
      elements.featuredCard.dataset.icon !== "twitch"
    ) {
      hideLiveIndicator();
      return;
    }

    const accessibleText = isLive
      ? "GilraenNR está en directo en Twitch"
      : "GilraenNR no está en directo en Twitch";
    elements.liveIndicator.classList.toggle("is-live", isLive);
    elements.liveIndicator.classList.toggle("is-offline", isOffline);
    elements.liveIndicatorText.textContent = isLive ? "En directo" : "Offline";
    elements.liveIndicator.setAttribute("aria-label", accessibleText);
    elements.liveIndicator.title = accessibleText;
    elements.liveIndicator.hidden = false;
    window.clearTimeout(liveStatusExpiryTimer);
    liveStatusExpiryTimer = window.setTimeout(
      hideLiveIndicator,
      Math.max(0, expiresAt - now)
    );
  }

  function githubStatusSource(rawUrl) {
    if (!(rawUrl instanceof URL) || rawUrl.hostname !== "raw.githubusercontent.com") {
      return null;
    }

    const parts = rawUrl.pathname.split("/").filter(Boolean);
    if (parts.length < 5) return null;

    const [owner, repository, branch, ...fileParts] = parts;
    const safeComponents = [owner, repository, branch, ...fileParts].every(
      (part) => GITHUB_PATH_COMPONENT_PATTERN.test(part) && part !== "." && part !== ".."
    );
    if (!safeComponents) return null;

    return {
      apiUrl: new URL(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/commits/${encodeURIComponent(branch)}`
      ),
      immutableUrl(sha) {
        const encodedPath = fileParts.map(encodeURIComponent).join("/");
        return new URL(
          `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/${sha}/${encodedPath}`
        );
      }
    };
  }

  async function fetchFreshLiveStatus(rawUrl) {
    const source = githubStatusSource(rawUrl);

    if (source) {
      try {
        const commit = await fetchJson(source.apiUrl.href);
        const sha = cleanText(commit.sha, "", 40);
        if (GIT_COMMIT_SHA_PATTERN.test(sha)) {
          return await fetchJson(source.immutableUrl(sha).href);
        }
      } catch {
        // GitHub API may be unavailable or rate-limited; GitHub Raw remains a safe fallback.
      }
    }

    return fetchJson(rawUrl.href);
  }

  async function refreshLiveStatus(config) {
    try {
      lastLiveSnapshot = await fetchFreshLiveStatus(config.url);
    } catch {
      // A transient status failure must never create a false live signal.
    }

    if (lastLiveSnapshot) renderLiveStatus(lastLiveSnapshot);
    else hideLiveIndicator();
  }

  function startLiveStatus(config) {
    window.clearInterval(liveStatusTimer);
    liveStatusTimer = 0;
    lastLiveSnapshot = null;
    hideLiveIndicator();

    if (!config.enabled || !config.url) return;
    void refreshLiveStatus(config);
    liveStatusTimer = window.setInterval(
      () => void refreshLiveStatus(config),
      config.pollMs
    );
  }

  function renderUnavailable() {
    renderProfile(normalizeData({}).profile);
    elements.featuredCard.hidden = true;
    elements.featuredCard.classList.remove("is-loading");
    elements.featuredCard.setAttribute("aria-busy", "false");
    elements.sections.replaceChildren();
    elements.sections.hidden = false;
    elements.sections.setAttribute("aria-busy", "false");

    const panel = document.createElement("section");
    const title = document.createElement("h2");
    const message = document.createElement("p");
    const retry = document.createElement("button");

    panel.className = "unavailable-panel";
    panel.setAttribute("role", "status");
    title.textContent = "Los enlaces no están disponibles ahora mismo";
    message.textContent = "No hemos podido cargar ninguna fuente de contenido. Vuelve a intentarlo en unos momentos.";
    retry.type = "button";
    retry.textContent = "Reintentar";
    retry.addEventListener("click", () => window.location.reload());
    panel.append(title, message, retry);
    elements.sections.append(panel);
  }

  async function fetchJson(url) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const declaredSize = Number(response.headers.get("content-length"));
      if (Number.isFinite(declaredSize) && declaredSize > MAX_JSON_BYTES) {
        throw new RangeError("El JSON supera el tamaño máximo permitido.");
      }

      let text;
      if (response.body && typeof response.body.getReader === "function") {
        const reader = response.body.getReader();
        const chunks = [];
        let totalBytes = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          totalBytes += value.byteLength;
          if (totalBytes > MAX_JSON_BYTES) {
            await reader.cancel();
            throw new RangeError("El JSON supera el tamaño máximo permitido.");
          }
          chunks.push(value);
        }

        const bytes = new Uint8Array(totalBytes);
        let offset = 0;
        chunks.forEach((chunk) => {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        });
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } else {
        text = await response.text();
        if (new TextEncoder().encode(text).byteLength > MAX_JSON_BYTES) {
          throw new RangeError("El JSON supera el tamaño máximo permitido.");
        }
      }

      const data = JSON.parse(text);
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new TypeError("La raíz del JSON debe ser un objeto.");
      }
      return data;
    } finally {
      window.clearTimeout(timer);
    }
  }

  function reportStatus(message) {
    if (!debugMode) return;
    elements.status.textContent = message;
    elements.status.hidden = false;
  }

  async function loadContent() {
    elements.year.textContent = new Date().getFullYear().toString();

    try {
      const remoteData = await fetchJson(REMOTE_CONTENT_URL);
      const normalized = render(remoteData);
      startLiveStatus(normalized.liveStatus);
      reportStatus("Contenido cargado desde GitHub Raw.");
      return;
    } catch {
      // Falling back is normal operation and needs no visible production error.
    }

    try {
      const fallbackData = await fetchJson(LOCAL_FALLBACK_URL);
      const normalized = render(fallbackData);
      startLiveStatus(normalized.liveStatus);
      reportStatus("GitHub Raw no está disponible. Se muestra el fallback local.");
    } catch {
      startLiveStatus({ enabled: false, url: null });
      renderUnavailable();
      reportStatus("No se pudieron cargar las fuentes JSON.");
    }
  }

  loadContent().finally(() => document.documentElement.classList.add("is-ready"));
})();
