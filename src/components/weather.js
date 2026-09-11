import { getSettings, updateSetting, saveSettings } from "../services/state.js"
import { geti18n } from "../services/i18n.js"
import { fadeToggle } from "../utils/dom.js"

const DEFAULT_LOCATION = {
  name: "Ho Chi Minh City",
  latitude: 10.8231,
  longitude: 106.6297,
  country: "Vietnam",
}

const WEATHER_CACHE_KEY = "weatherWidgetCache"
const WEATHER_CACHE_TTL = 30 * 60 * 1000
const WEATHER_REQUEST_TIMEOUT = 12000
const WEATHER_REFRESH_LIMIT_KEY = "weatherExtensionRefreshLimit"
const WEATHER_REFRESH_LIMIT_MAX = 3
const WEATHER_REFRESH_LIMIT_WINDOW = 60 * 60 * 1000
const DEFAULT_FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast"
const DEFAULT_GEOCODING_ENDPOINT =
  "https://geocoding-api.open-meteo.com/v1/search"
const WEATHER_API_PARAM_KEYS = {
  forecast: [
    "latitude",
    "longitude",
    "current",
    "daily",
    "timezone",
    "forecast_days",
  ],
  geocoding: ["name", "count", "language", "format"],
}

function makeWeatherCode(icon, nightIcon, theme, en, vi, de, sv) {
  const entry = [icon, en, vi]
  return Object.assign(entry, {
    icon,
    nightIcon: nightIcon || icon,
    theme,
    en,
    vi,
    de: de || en,
    sv: sv || en,
  })
}

const WEATHER_CODES = {
  0: makeWeatherCode("sun", "moon", "sunny", "Clear sky", "Trời quang", "Klarer Himmel", "Klar himmel"),
  1: makeWeatherCode("cloud-sun", "cloud-moon", "partly-cloudy", "Mainly clear", "Ít mây", "Überwiegend klar", "Mestadels klart"),
  2: makeWeatherCode("cloud-sun", "cloud-moon", "partly-cloudy", "Partly cloudy", "Có mây", "Teilweise bewölkt", "Halvklart"),
  3: makeWeatherCode("cloud", "cloud", "cloudy", "Overcast", "Nhiều mây", "Bedeckt", "Mulet"),
  45: makeWeatherCode("smog", "smog", "fog", "Fog", "Sương mù", "Nebel", "Dimma"),
  48: makeWeatherCode("smog", "smog", "fog", "Depositing rime fog", "Sương mù đóng băng", "Raureifnebel", "Rimfrostdimma"),
  51: makeWeatherCode("cloud-rain", "cloud-rain", "drizzle", "Light drizzle", "Mưa phùn nhẹ", "Leichter Nieselregen", "Lätt duggregn"),
  53: makeWeatherCode("cloud-rain", "cloud-rain", "drizzle", "Drizzle", "Mưa phùn", "Nieselregen", "Duggregn"),
  55: makeWeatherCode("cloud-rain", "cloud-rain", "drizzle", "Dense drizzle", "Mưa phùn dày", "Dichter Nieselregen", "Tätt duggregn"),
  56: makeWeatherCode("snowflake", "snowflake", "snow", "Freezing drizzle", "Mưa phùn băng giá", "Gefrierender Nieselregen", "Underkylt duggregn"),
  57: makeWeatherCode("snowflake", "snowflake", "snow", "Dense freezing drizzle", "Mưa phùn băng giá dày", "Dichter gefrierender Nieselregen", "Tätt underkylt duggregn"),
  61: makeWeatherCode("cloud-rain", "cloud-rain", "rain", "Light rain", "Mưa nhẹ", "Leichter Regen", "Lätt regn"),
  63: makeWeatherCode("cloud-showers-heavy", "cloud-showers-heavy", "rain", "Rain", "Mưa", "Regen", "Regn"),
  65: makeWeatherCode("cloud-showers-heavy", "cloud-showers-heavy", "heavy-rain", "Heavy rain", "Mưa lớn", "Starker Regen", "Kraftigt regn"),
  66: makeWeatherCode("snowflake", "snowflake", "snow", "Freezing rain", "Mưa đóng băng", "Gefrierender Regen", "Underkylt regn"),
  67: makeWeatherCode("snowflake", "snowflake", "snow", "Heavy freezing rain", "Mưa đóng băng dữ dội", "Starker gefrierender Regen", "Kraftigt underkylt regn"),
  71: makeWeatherCode("snowflake", "snowflake", "snow", "Light snow", "Tuyết nhẹ", "Leichter Schneefall", "Lätt snöfall"),
  73: makeWeatherCode("snowflake", "snowflake", "snow", "Snow", "Tuyết", "Schnee", "Snöfall"),
  75: makeWeatherCode("snowflake", "snowflake", "snow", "Heavy snow", "Tuyết lớn", "Starker Schneefall", "Kraftigt snöfall"),
  77: makeWeatherCode("snowflake", "snowflake", "snow", "Snow grains", "Mưa tuyết", "Schneegriesel", "Kornsnö"),
  80: makeWeatherCode("cloud-sun-rain", "cloud-moon-rain", "rain", "Light showers", "Mưa rào nhẹ", "Leichte Schauer", "Lätta skurar"),
  81: makeWeatherCode("cloud-sun-rain", "cloud-moon-rain", "rain", "Showers", "Mưa rào", "Regenschauer", "Regnskurar"),
  82: makeWeatherCode("cloud-showers-heavy", "cloud-showers-heavy", "heavy-rain", "Heavy showers", "Mưa rào lớn", "Starke Schauer", "Kraftiga regnskurar"),
  85: makeWeatherCode("snowflake", "snowflake", "snow", "Snow showers", "Mưa rào tuyết", "Schneeschauer", "Snöbyar"),
  86: makeWeatherCode("snowflake", "snowflake", "snow", "Heavy snow showers", "Mưa rào tuyết lớn", "Starke Schneeschauer", "Kraftiga snöbyar"),
  95: makeWeatherCode("cloud-bolt", "cloud-bolt", "storm", "Thunderstorm", "Dông", "Gewitter", "Åskväder"),
  96: makeWeatherCode("cloud-bolt", "cloud-bolt", "storm", "Thunderstorm with hail", "Dông kèm mưa đá", "Gewitter mit Hagel", "Åska med hagel"),
  99: makeWeatherCode("cloud-bolt", "cloud-bolt", "storm", "Heavy thunderstorm with hail", "Dông mạnh kèm mưa đá", "Schweres Gewitter mit Hagel", "Kraftig åska med hagel"),
}

export class Weather {
  constructor() {
    this.container = null
    this.abortController = null
    this.suggestionTimer = null
    this.suggestionAbortController = null
    this.activeSuggestionIndex = -1
    this.init()
  }

  init() {
    this.render()
    this.setupEventListeners()
    this.applySettings()
    if (getSettings().showWeather === true) {
      this.loadWeather()
    }
  }

  render() {
    this.container = document.getElementById("weather-container")
    if (!this.container) {
      this.container = document.createElement("div")
      this.container.id = "weather-container"
      this.container.className = "weather-container glass-panel drag-handle"
      document.body.appendChild(this.container)
    }

    const i18n = geti18n()
    const currentLocationLabel = this.locationLabel()
    this.container.innerHTML = `
      <div class="weather-header">
        <div class="weather-title-group">
          <h3>${this.escapeHtml(i18n.weather_title || "Weather")}</h3>
          <div class="weather-location" id="weather-location-label" title="${this.escapeAttribute(currentLocationLabel)}">
            <i class="fa-solid fa-location-dot"></i>
            <span>${this.escapeHtml(currentLocationLabel)}</span>
          </div>
        </div>
        <div class="weather-actions">
          <button class="icon-btn" id="weather-locate-btn" title="${this.escapeAttribute(i18n.weather_use_current || "Use current location")}"><i class="fa-solid fa-location-crosshairs"></i></button>
          <button class="icon-btn" id="weather-refresh-btn" title="${this.escapeAttribute(i18n.weather_refresh || "Refresh")}"><i class="fa-solid fa-rotate"></i></button>
          <button class="icon-btn weather-close-btn widget-close-btn" id="weather-close-btn" title="${this.escapeAttribute(i18n.close || "Close")}"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>
      <div class="weather-search-wrap">
        <div class="weather-search-row">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input id="weather-location-input" type="text" autocomplete="off" spellcheck="false" aria-controls="weather-suggestions" aria-expanded="false" placeholder="${this.escapeAttribute(i18n.weather_search_placeholder || "Search city...")}">
          <button class="weather-search-btn" id="weather-search-btn" type="button" title="${this.escapeAttribute(i18n.weather_search || "Search")}"><i class="fa-solid fa-arrow-right"></i></button>
        </div>
        <div class="weather-suggestions" id="weather-suggestions" role="listbox" style="display: none;"></div>
      </div>
      <div class="weather-body" id="weather-body">
        <div class="weather-loading">${this.escapeHtml(i18n.weather_loading || "Loading weather...")}</div>
      </div>
    `
    this.applySkin()
  }

  setupEventListeners() {
    this.container
      .querySelector("#weather-close-btn")
      ?.addEventListener("click", () => {
        updateSetting("showWeather", false)
        saveSettings()
        this.applySettings()
        window.dispatchEvent(
          new CustomEvent("layoutUpdated", {
            detail: { key: "showWeather", value: false },
          }),
        )
      })

    this.container
      .querySelector("#weather-refresh-btn")
      ?.addEventListener("click", () => {
        this.loadWeather({ force: true })
      })

    this.container
      .querySelector("#weather-locate-btn")
      ?.addEventListener("click", () => {
        this.useCurrentLocation()
      })

    const input = this.container.querySelector("#weather-location-input")
    const runSearch = () => {
      this.clearSuggestions()
      this.searchLocation(input?.value.trim() || "")
    }

    this.container
      .querySelector("#weather-search-btn")
      ?.addEventListener("click", runSearch)

    input?.addEventListener("input", () => {
      this.queueSuggestions(input.value.trim())
    })

    input?.addEventListener("blur", () => {
      window.setTimeout(() => this.clearSuggestions(), 160)
    })

    input?.addEventListener("keydown", (event) => {
      if (event.isComposing) return

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const items = this.getSuggestionItems()
        if (!items.length) return
        event.preventDefault()
        this.moveActiveSuggestion(event.key === "ArrowDown" ? 1 : -1)
        return
      }

      if (event.key === "Enter" && !event.isComposing) {
        if (this.selectActiveSuggestion(input)) {
          event.preventDefault()
          return
        }
        runSearch()
        return
      }

      if (event.key === "Escape") {
        if (!this.areSuggestionsVisible()) {
          event.target.value = ""
        }
        this.clearSuggestions()
      }
    })

    this.container
      .querySelector("#weather-suggestions")
      ?.addEventListener("click", (event) => {
        const item = event.target.closest?.("[data-weather-suggestion]")
        if (!item) return
        this.chooseSuggestionItem(item, input)
      })

    window.addEventListener("layoutUpdated", (event) => {
      if (event.detail?.key === "showWeather") {
        this.applySettings()
        if (event.detail.value === true) this.loadWeather()
      }
      if (event.detail?.key === "weatherSkin") {
        this.applySkin()
      }
      if (event.detail?.key === "weatherExpanded") {
        this.applySkin()
      }
      if (event.detail?.key === "weatherMini") {
        this.applySkin()
      }
      if (event.detail?.key === "weatherColorStyle") {
        this.applySkin()
      }
      if (
        event.detail?.key === "weatherApiMode" ||
        event.detail?.key === "weatherForecastEndpoint" ||
        event.detail?.key === "weatherGeocodingEndpoint" ||
        event.detail?.key === "weatherUnit"
      ) {
        this.loadWeather({ force: true, skipRefreshLimit: true })
      }
    })

    window.addEventListener("languageChanged", () => {
      this.render()
      this.loadWeather()
    })
  }

  applySettings() {
    fadeToggle(this.container, getSettings().showWeather === true, "block")
  }

  applySkin() {
    const settings = getSettings()
    const skin =
      settings.widgetUseM3Accent === true
        ? "m3-accent"
        : settings.weatherSkin || "default"
    const colorStyle = settings.weatherColorStyle || "accent"

    this.container.classList.toggle("skin-white-blur", skin === "white-blur")
    this.container.classList.toggle("skin-m3-accent", skin === "m3-accent")
    this.container.classList.toggle("skin-transparent", skin === "transparent")
    this.container.classList.toggle(
      "skin-light-transparent",
      skin === "light-transparent",
    )
    this.container.classList.toggle(
      "widget-border-hidden",
      settings.weatherHideBorder === true,
    )
    this.container.classList.toggle(
      "weather-mini",
      settings.weatherMini === true,
    )
    this.container.classList.toggle(
      "weather-expanded",
      settings.weatherExpanded === true && settings.weatherMini !== true,
    )
    this.container.classList.toggle(
      "weather-color-accent",
      colorStyle === "accent",
    )
    this.container.classList.toggle(
      "weather-color-natural",
      colorStyle === "natural",
    )
    this.container.classList.toggle(
      "weather-color-monochrome",
      colorStyle === "monochrome",
    )
  }

  locationFromSettings() {
    const settings = getSettings()
    const latitude = Number(settings.weatherLatitude)
    const longitude = Number(settings.weatherLongitude)
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return {
        name: settings.weatherLocationName || DEFAULT_LOCATION.name,
        latitude,
        longitude,
        country: settings.weatherCountry || "",
      }
    }
    return DEFAULT_LOCATION
  }

  locationLabel() {
    const location = this.locationFromSettings()
    return [location.name, location.country].filter(Boolean).join(", ")
  }

  getWeatherApiConfig(type = "forecast") {
    const settings = getSettings()
    const endpointKey =
      type === "geocoding"
        ? "weatherGeocodingEndpoint"
        : "weatherForecastEndpoint"
    const defaultEndpoint =
      type === "geocoding"
        ? DEFAULT_GEOCODING_ENDPOINT
        : DEFAULT_FORECAST_ENDPOINT

    if (settings.weatherApiMode !== "custom") {
      return {
        endpoint: defaultEndpoint,
        sourceLabel: "Open-Meteo",
        sourceKey: `extension:${defaultEndpoint}`,
      }
    }

    const endpoint = String(settings[endpointKey] || "").trim()
    const validation = this.validateWeatherEndpoint(
      endpoint,
      WEATHER_API_PARAM_KEYS[type] || WEATHER_API_PARAM_KEYS.forecast,
    )

    if (!validation.ok) {
      throw new Error(
        geti18n().weather_custom_api_invalid ||
          "Custom weather API URL is invalid. Check Weather API settings.",
      )
    }

    return {
      endpoint,
      sourceLabel: this.sourceLabelFromEndpoint(endpoint),
      sourceKey: `custom:${endpoint}`,
    }
  }

  isCustomWeatherApi() {
    return getSettings().weatherApiMode === "custom"
  }

  getForecastEndpoint() {
    return this.getWeatherApiConfig("forecast").endpoint
  }

  getGeocodingEndpoint() {
    return this.getWeatherApiConfig("geocoding").endpoint
  }

  withQueryParams(endpoint, params) {
    const url = new URL(endpoint)
    params.forEach((value, key) => {
      url.searchParams.set(key, value)
    })
    return url.toString()
  }

  isValidHttpUrl(value) {
    try {
      const url = new URL(String(value || "").trim())
      return url.protocol === "https:" || url.protocol === "http:"
    } catch {
      return false
    }
  }

  validateWeatherEndpoint(value, requiredParams = []) {
    try {
      const url = new URL(String(value || "").trim())
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        return { ok: false, reason: "protocol" }
      }
      const duplicateParams = requiredParams.filter((param) =>
        url.searchParams.has(param),
      )
      if (duplicateParams.length) {
        return { ok: false, reason: "query", params: duplicateParams }
      }
      return { ok: true }
    } catch {
      return { ok: false, reason: "url" }
    }
  }

  sourceLabelFromEndpoint(endpoint) {
    try {
      const host = new URL(endpoint).hostname.replace(/^www\./, "")
      return host.includes("open-meteo.com") ? "Open-Meteo" : host
    } catch {
      return geti18n().settings_weather_api_custom || "Custom endpoint"
    }
  }

  canUseManualRefresh() {
    if (this.isCustomWeatherApi()) return true

    const now = Date.now()
    let timestamps = []
    try {
      timestamps = JSON.parse(
        localStorage.getItem(WEATHER_REFRESH_LIMIT_KEY) || "[]",
      )
    } catch {
      timestamps = []
    }

    timestamps = timestamps.filter(
      (timestamp) => now - Number(timestamp) < WEATHER_REFRESH_LIMIT_WINDOW,
    )

    if (timestamps.length >= WEATHER_REFRESH_LIMIT_MAX) {
      const oldest = Math.min(...timestamps)
      const waitMinutes = Math.max(
        1,
        Math.ceil((WEATHER_REFRESH_LIMIT_WINDOW - (now - oldest)) / 60000),
      )
      const message =
        geti18n().weather_refresh_limited ||
        "Weather refresh limit reached. Try again in {minutes} min."
      this.renderMessage(message.replace("{minutes}", String(waitMinutes)))
      localStorage.setItem(
        WEATHER_REFRESH_LIMIT_KEY,
        JSON.stringify(timestamps),
      )
      return false
    }

    timestamps.push(now)
    localStorage.setItem(WEATHER_REFRESH_LIMIT_KEY, JSON.stringify(timestamps))
    return true
  }

  async loadWeather({ force = false, skipRefreshLimit = false } = {}) {
    const body = this.container.querySelector("#weather-body")
    if (!body) return

    if (force && !skipRefreshLimit && !this.canUseManualRefresh()) return

    const location = this.locationFromSettings()
    this.setLocationLabel(location)
    const refreshBtnIcon = this.container.querySelector("#weather-refresh-btn i")
    refreshBtnIcon?.classList.add("fa-spin")

    let apiConfig
    try {
      apiConfig = this.getWeatherApiConfig("forecast")
    } catch (error) {
      refreshBtnIcon?.classList.remove("fa-spin")
      body.innerHTML = `
        <div class="weather-error">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>${this.escapeHtml(error.message)}</span>
        </div>
      `
      return
    }

    const cached = this.getCachedWeather(location, apiConfig.sourceKey)
    if (!force && cached) {
      refreshBtnIcon?.classList.remove("fa-spin")
      this.renderWeather(cached)
      return
    }

    body.innerHTML = `<div class="weather-loading"><i class="fa-solid fa-circle-notch fa-spin"></i> <span>${this.escapeHtml(geti18n().weather_loading || "Loading weather...")}</span></div>`
    this.abortController?.abort()
    this.abortController = new AbortController()

    try {
      const params = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        current:
          "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m",
        daily:
          "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max",
        timezone: "auto",
        forecast_days: "8",
      })
      if (getSettings().weatherUnit === "fahrenheit") {
        params.append("temperature_unit", "fahrenheit")
      }
      const data = await this.fetchJson(
        this.withQueryParams(apiConfig.endpoint, params),
        { signal: this.abortController.signal },
      )
      const payload = {
        location,
        data,
        fetchedAt: Date.now(),
        sourceLabel: apiConfig.sourceLabel,
        sourceKey: apiConfig.sourceKey,
      }
      this.setCachedWeather(payload)
      this.renderWeather(payload)
    } catch (error) {
      if (error.name === "AbortError") return
      console.warn("Weather fetch failed:", error)
      const message = this.getFetchErrorMessage(error, "weather_error")
      body.innerHTML = `
        <div class="weather-error">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>${this.escapeHtml(message)}</span>
        </div>
      `
    } finally {
      refreshBtnIcon?.classList.remove("fa-spin")
    }
  }

  async searchLocation(query) {
    if (!query) return
    const body = this.container.querySelector("#weather-body")
    if (body) {
      body.innerHTML = `<div class="weather-loading"><i class="fa-solid fa-magnifying-glass fa-spin"></i> <span>${this.escapeHtml(geti18n().weather_searching || "Searching...")}</span></div>`
    }

    try {
      const geocodingConfig = this.getWeatherApiConfig("geocoding")
      const params = new URLSearchParams({
        name: query,
        count: "1",
        language: getSettings().language === "vi" ? "vi" : "en",
        format: "json",
      })
      const data = await this.fetchJson(
        this.withQueryParams(geocodingConfig.endpoint, params),
      )
      const first = data.results?.[0]
      if (!first) {
        this.renderMessage(
          geti18n().weather_location_not_found || "Location not found.",
        )
        return
      }
      this.saveLocation({
        name: first.name,
        latitude: first.latitude,
        longitude: first.longitude,
        country: first.country || "",
      })
      this.container.querySelector("#weather-location-input").value = ""
      this.loadWeather({ force: true, skipRefreshLimit: true })
    } catch (error) {
      console.warn("Weather location search failed:", error)
      this.renderMessage(
        this.getFetchErrorMessage(error, "weather_location_error"),
      )
    }
  }

  queueSuggestions(query) {
    window.clearTimeout(this.suggestionTimer)
    this.suggestionAbortController?.abort()

    if (query.length < 2) {
      this.clearSuggestions()
      return
    }

    this.suggestionTimer = window.setTimeout(() => {
      this.loadSuggestions(query)
    }, 1200)
  }

  async loadSuggestions(query) {
    const suggestions = this.container.querySelector("#weather-suggestions")
    if (!suggestions) return

    this.suggestionAbortController = new AbortController()

    try {
      const geocodingConfig = this.getWeatherApiConfig("geocoding")
      const params = new URLSearchParams({
        name: query,
        count: "5",
        language: getSettings().language === "vi" ? "vi" : "en",
        format: "json",
      })
      const data = await this.fetchJson(
        this.withQueryParams(geocodingConfig.endpoint, params),
        { signal: this.suggestionAbortController.signal },
      )
      this.renderSuggestions(data.results || [])
    } catch (error) {
      if (error.name === "AbortError") return
      console.warn("Weather suggestions failed:", error)
      this.clearSuggestions()
    }
  }

  renderSuggestions(results) {
    const suggestions = this.container.querySelector("#weather-suggestions")
    if (!suggestions) return

    const validResults = results
      .filter(
        (item) =>
          Number.isFinite(item.latitude) && Number.isFinite(item.longitude),
      )
      .slice(0, 5)

    if (!validResults.length) {
      this.clearSuggestions()
      return
    }

    suggestions.innerHTML = validResults
      .map((item, index) => {
        const admin = item.admin1 ? `${item.admin1}, ` : ""
        const country = item.country || ""
        const fullLabel = [item.name, admin.replace(/, $/, ""), country]
          .filter(Boolean)
          .join(", ")
        return `
          <button type="button" class="weather-suggestion-item" id="weather-suggestion-${index}" role="option" aria-selected="false" data-weather-suggestion="true"
            data-name="${this.escapeAttribute(item.name)}"
            data-country="${this.escapeAttribute(country)}"
            data-latitude="${this.escapeAttribute(item.latitude)}"
            data-longitude="${this.escapeAttribute(item.longitude)}"
            title="${this.escapeAttribute(fullLabel)}">
            <i class="fa-solid fa-location-dot"></i>
            <span title="${this.escapeAttribute(item.name)}">${this.escapeHtml(item.name)}</span>
            <small title="${this.escapeAttribute(`${admin}${country}`)}">${this.escapeHtml(`${admin}${country}`)}</small>
          </button>
        `
      })
      .join("")
    suggestions.style.display = "grid"
    this.activeSuggestionIndex = -1
    this.updateActiveSuggestion()
    this.setSuggestionsExpanded(true)
  }

  clearSuggestions() {
    window.clearTimeout(this.suggestionTimer)
    const suggestions = this.container?.querySelector("#weather-suggestions")
    if (!suggestions) return
    this.activeSuggestionIndex = -1
    suggestions.innerHTML = ""
    suggestions.style.display = "none"
    this.setSuggestionsExpanded(false)
  }

  areSuggestionsVisible() {
    const suggestions = this.container?.querySelector("#weather-suggestions")
    return Boolean(
      suggestions &&
      suggestions.style.display !== "none" &&
      suggestions.children.length,
    )
  }

  getSuggestionItems() {
    return Array.from(
      this.container?.querySelectorAll("[data-weather-suggestion]") || [],
    )
  }

  moveActiveSuggestion(direction) {
    const items = this.getSuggestionItems()
    if (!items.length) return
    this.activeSuggestionIndex =
      this.activeSuggestionIndex < 0
        ? direction > 0
          ? 0
          : items.length - 1
        : (this.activeSuggestionIndex + direction + items.length) % items.length
    this.updateActiveSuggestion()
  }

  updateActiveSuggestion() {
    const items = this.getSuggestionItems()
    const input = this.container?.querySelector("#weather-location-input")

    items.forEach((item, index) => {
      const isActive = index === this.activeSuggestionIndex
      item.classList.toggle("active", isActive)
      item.setAttribute("aria-selected", isActive ? "true" : "false")
      if (isActive) {
        item.scrollIntoView({ block: "nearest" })
      }
    })

    if (input) {
      const activeItem = items[this.activeSuggestionIndex]
      input.setAttribute("aria-activedescendant", activeItem?.id || "")
    }
  }

  selectActiveSuggestion(input) {
    const item = this.getSuggestionItems()[this.activeSuggestionIndex]
    if (!item) return false
    this.chooseSuggestionItem(item, input)
    return true
  }

  chooseSuggestionItem(item, input) {
    const location = {
      name: item.dataset.name,
      country: item.dataset.country || "",
      latitude: Number(item.dataset.latitude),
      longitude: Number(item.dataset.longitude),
    }
    if (
      !Number.isFinite(location.latitude) ||
      !Number.isFinite(location.longitude)
    )
      return
    this.saveLocation(location)
    if (input) input.value = ""
    this.clearSuggestions()
    this.loadWeather({ force: true, skipRefreshLimit: true })
  }

  setSuggestionsExpanded(isExpanded) {
    this.container
      ?.querySelector("#weather-location-input")
      ?.setAttribute("aria-expanded", isExpanded ? "true" : "false")
  }

  useCurrentLocation() {
    if (!navigator.geolocation) {
      this.renderMessage(
        geti18n().weather_geolocation_unavailable ||
          "Geolocation is not available.",
      )
      return
    }

    this.renderMessage(geti18n().weather_locating || "Getting location...")
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.saveLocation({
          name: geti18n().weather_current_location || "Current location",
          latitude: Number(position.coords.latitude.toFixed(4)),
          longitude: Number(position.coords.longitude.toFixed(4)),
          country: "",
        })
        this.loadWeather({ force: true, skipRefreshLimit: true })
      },
      () => {
        this.renderMessage(
          geti18n().weather_location_denied ||
            "Location permission was denied.",
        )
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 15 * 60 * 1000 },
    )
  }

  saveLocation(location) {
    updateSetting("weatherLocationName", location.name)
    updateSetting("weatherCountry", location.country || "")
    updateSetting("weatherLatitude", location.latitude)
    updateSetting("weatherLongitude", location.longitude)
    saveSettings(true)
  }

  setLocationLabel(location) {
    const label = this.container.querySelector("#weather-location-label")
    if (label) {
      const text = [location.name, location.country].filter(Boolean).join(", ")
      label.innerHTML = `<i class="fa-solid fa-location-dot"></i> <span>${this.escapeHtml(text)}</span>`
      label.title = text
    }
  }

  renderWeather(payload) {
    const body = this.container.querySelector("#weather-body")
    if (!body) return

    const { data, location } = payload
    const current = data.current || {}
    const units = data.current_units || {}
    const daily = data.daily || {}
    const isDay = current.is_day !== undefined ? current.is_day !== 0 : true
    const code = this.describeWeather(current.weather_code, isDay)
    this.setLocationLabel(location)

    const todayMax = Math.round(daily.temperature_2m_max?.[0] ?? current.temperature_2m ?? 0)
    const todayMin = Math.round(daily.temperature_2m_min?.[0] ?? current.temperature_2m ?? 0)
    const todayRainProb = daily.precipitation_probability_max?.[0]
    const todayUv = daily.uv_index_max?.[0]

    const i18n = geti18n()

    const forecast = (daily.time || [])
      .slice(1, 8)
      .map((date, index) => {
        const dayIdx = index + 1
        const dayCode = this.describeWeather(daily.weather_code?.[dayIdx], true)
        const label = this.formatDay(date)
        const max = Math.round(daily.temperature_2m_max?.[dayIdx] ?? 0)
        const min = Math.round(daily.temperature_2m_min?.[dayIdx] ?? 0)
        const rainProb = daily.precipitation_probability_max?.[dayIdx]
        const rainBadge =
          rainProb !== undefined && rainProb !== null && rainProb > 0
            ? `<span class="day-pop" title="${this.escapeAttribute(`${i18n.weather_rain_chance || "Rain"}: ${rainProb}%`)}"><i class="fa-solid fa-droplet"></i>${rainProb}%</span>`
            : ""
        const summary = `${label}: ${max}° / ${min}° - ${dayCode.label}`
        return `
          <div class="weather-day ${dayCode.theme}" title="${this.escapeAttribute(summary)}">
            <span class="day-name" title="${this.escapeAttribute(label)}">${this.escapeHtml(label)}</span>
            <div class="day-icon-wrap theme-${dayCode.theme}">
              <i class="fa-solid fa-${dayCode.icon}"></i>
            </div>
            ${rainBadge}
            <strong class="day-temps" title="${this.escapeAttribute(summary)}">
              <span class="day-temp-high">${max}°</span>
              <span class="day-temp-low">${min}°</span>
            </strong>
          </div>
        `
      })
      .join("")

    const tempUnit = units.temperature_2m || "°C"
    const currentTemp = Math.round(current.temperature_2m ?? 0)
    const feelsLike = `${Math.round(current.apparent_temperature ?? current.temperature_2m ?? 0)}${units.apparent_temperature || tempUnit}`
    const humidity = `${Math.round(current.relative_humidity_2m ?? 0)}${units.relative_humidity_2m || "%"}`
    const wind = `${Math.round(current.wind_speed_10m ?? 0)} ${units.wind_speed_10m || "km/h"}`

    let fourthStat = ""
    if (todayRainProb !== undefined && todayRainProb !== null) {
      const rainLabel = i18n.weather_rain_chance || "Rain chance"
      const rainVal = `${todayRainProb}%`
      fourthStat = `
        <div class="stat-card stat-rain" title="${this.escapeAttribute(`${rainLabel}: ${rainVal}`)}">
          <div class="stat-icon-wrap"><i class="fa-solid fa-cloud-showers-heavy"></i></div>
          <div class="stat-meta">
            <span class="stat-label">${this.escapeHtml(rainLabel)}</span>
            <strong class="stat-val">${this.escapeHtml(rainVal)}</strong>
          </div>
        </div>
      `
    } else if (todayUv !== undefined && todayUv !== null) {
      const uvLabel = i18n.weather_uv_index || "UV Index"
      const uvVal = String(Math.round(todayUv * 10) / 10)
      fourthStat = `
        <div class="stat-card stat-uv" title="${this.escapeAttribute(`${uvLabel}: ${uvVal}`)}">
          <div class="stat-icon-wrap"><i class="fa-solid fa-sun"></i></div>
          <div class="stat-meta">
            <span class="stat-label">${this.escapeHtml(uvLabel)}</span>
            <strong class="stat-val">${this.escapeHtml(uvVal)}</strong>
          </div>
        </div>
      `
    }

    body.innerHTML = `
      <div class="weather-current ${code.theme}">
        <div class="weather-icon-hero theme-${code.theme}">
          <i class="fa-solid fa-${code.icon}"></i>
        </div>
        <div class="weather-hero-info">
          <div class="weather-temp-row">
            <div class="weather-temp" title="${this.escapeAttribute(`${currentTemp}${tempUnit}`)}">
              <span class="temp-val">${currentTemp}</span><span class="temp-unit">${this.escapeHtml(tempUnit)}</span>
            </div>
            <div class="weather-hi-lo" title="${this.escapeAttribute(`${i18n.weather_high || "High"}: ${todayMax}°, ${i18n.weather_low || "Low"}: ${todayMin}°`)}">
              <span class="hi"><i class="fa-solid fa-arrow-up"></i> ${todayMax}°</span>
              <span class="lo"><i class="fa-solid fa-arrow-down"></i> ${todayMin}°</span>
            </div>
          </div>
          <div class="weather-condition-badge theme-${code.theme}" title="${this.escapeAttribute(code.label)}">
            <span class="condition-dot"></span>
            <span class="condition-text">${this.escapeHtml(code.label)}</span>
          </div>
        </div>
      </div>

      <div class="weather-stats-grid ${fourthStat ? "has-fourth" : ""}">
        <div class="stat-card stat-feels" title="${this.escapeAttribute(`${i18n.weather_feels_like || "Feels"}: ${feelsLike}`)}">
          <div class="stat-icon-wrap"><i class="fa-solid fa-temperature-half"></i></div>
          <div class="stat-meta">
            <span class="stat-label">${this.escapeHtml(i18n.weather_feels_like || "Feels")}</span>
            <strong class="stat-val">${this.escapeHtml(feelsLike)}</strong>
          </div>
        </div>
        <div class="stat-card stat-humidity" title="${this.escapeAttribute(`${i18n.weather_humidity || "Humidity"}: ${humidity}`)}">
          <div class="stat-icon-wrap"><i class="fa-solid fa-droplet"></i></div>
          <div class="stat-meta">
            <span class="stat-label">${this.escapeHtml(i18n.weather_humidity || "Humidity")}</span>
            <strong class="stat-val">${this.escapeHtml(humidity)}</strong>
          </div>
        </div>
        <div class="stat-card stat-wind" title="${this.escapeAttribute(`${i18n.weather_wind || "Wind"}: ${wind}`)}">
          <div class="stat-icon-wrap"><i class="fa-solid fa-wind"></i></div>
          <div class="stat-meta">
            <span class="stat-label">${this.escapeHtml(i18n.weather_wind || "Wind")}</span>
            <strong class="stat-val">${this.escapeHtml(wind)}</strong>
          </div>
        </div>
        ${fourthStat}
      </div>

      <div class="weather-forecast-header">
        <span class="forecast-title">${this.escapeHtml(i18n.weather_forecast_title || "7-Day Forecast")}</span>
      </div>
      <div class="weather-forecast">${forecast}</div>

      <div class="weather-source">
        <span><i class="fa-solid fa-satellite-dish"></i> ${this.escapeHtml(payload.sourceLabel || "Open-Meteo")}</span>
      </div>
    `
  }

  renderMessage(message) {
    const body = this.container.querySelector("#weather-body")
    if (body) {
      body.innerHTML = `<div class="weather-loading">${this.escapeHtml(message)}</div>`
    }
  }

  describeWeather(code, isDay = true) {
    const item = WEATHER_CODES[Number(code)] || WEATHER_CODES[0]
    const lang = getSettings().language || "en"
    let label = item.en
    if (lang === "vi") label = item.vi
    else if (lang === "de") label = item.de
    else if (lang === "sv") label = item.sv

    const isNight = isDay === 0 || isDay === false
    const icon = isNight && item.nightIcon ? item.nightIcon : item.icon
    let theme = item.theme || "sunny"
    if (isNight) {
      if (theme === "sunny") theme = "clear-night"
      else if (theme === "partly-cloudy") theme = "cloudy-night"
    }

    return {
      icon,
      theme,
      label,
    }
  }

  formatDay(dateValue) {
    try {
      const i18n = geti18n()
      const lang = getSettings().language || "en"
      const date = new Date(`${dateValue}T12:00:00`)
      const today = new Date()

      if (date.toDateString() === today.toDateString()) {
        return (
          i18n.calendar_today ||
          i18n.today ||
          (lang === "vi"
            ? "Hôm nay"
            : lang === "de"
              ? "Heute"
              : lang === "sv"
                ? "Idag"
                : "Today")
        )
      }

      const dayIndex = date.getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
      const weekdayKeys = [
        "calendar_weekday_sun",
        "calendar_weekday_mon",
        "calendar_weekday_tue",
        "calendar_weekday_wed",
        "calendar_weekday_thu",
        "calendar_weekday_fri",
        "calendar_weekday_sat",
      ]
      const key = weekdayKeys[dayIndex]
      if (i18n[key]) {
        return i18n[key]
      }

      const fallbackDays = {
        vi: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
        de: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
        sv: ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"],
        en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      }
      if (fallbackDays[lang]) {
        return fallbackDays[lang][dayIndex]
      }

      const locale =
        lang === "vi" ? "vi-VN" : lang === "de" ? "de-DE" : lang === "sv" ? "sv-SE" : "en-US"
      return date.toLocaleDateString(locale, { weekday: "short" })
    } catch {
      return dateValue
    }
  }

  getCachedWeather(location, sourceKey) {
    try {
      const cache = JSON.parse(
        localStorage.getItem(WEATHER_CACHE_KEY) || "null",
      )
      if (!cache || Date.now() - cache.fetchedAt > WEATHER_CACHE_TTL)
        return null
      if ((cache.data?.daily?.time?.length || 0) < 8) return null
      const sameLocation =
        Math.abs(cache.location.latitude - location.latitude) < 0.001 &&
        Math.abs(cache.location.longitude - location.longitude) < 0.001
      const sameSource = !sourceKey || cache.sourceKey === sourceKey
      return sameLocation && sameSource ? cache : null
    } catch {
      return null
    }
  }

  setCachedWeather(payload) {
    try {
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(payload))
    } catch (error) {
      console.warn("Weather cache save failed:", error)
    }
  }

  async fetchJson(url, options = {}) {
    const controller = options.signal ? null : new AbortController()
    const timeoutId = controller
      ? window.setTimeout(() => controller.abort(), WEATHER_REQUEST_TIMEOUT)
      : null

    try {
      const response = await fetch(url, {
        cache: "no-store",
        mode: "cors",
        ...options,
        signal: options.signal || controller.signal,
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }

  getFetchErrorMessage(error, fallbackKey) {
    const i18n = geti18n()
    const fallback = i18n[fallbackKey] || "Could not load weather."
    if (error?.name === "AbortError") {
      return i18n.weather_timeout || "Weather request timed out."
    }
    if (error instanceof TypeError) {
      return i18n.weather_network_hint || fallback
    }
    return error?.message ? `${fallback} (${error.message})` : fallback
  }

  escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
  }

  escapeAttribute(value) {
    return this.escapeHtml(value).replace(/`/g, "&#096;")
  }
}
