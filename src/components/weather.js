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

const WEATHER_CODES = {
  0: ["sun", "Clear sky", "Trời quang"],
  1: ["cloud-sun", "Mainly clear", "Ít mây"],
  2: ["cloud-sun", "Partly cloudy", "Có mây"],
  3: ["cloud", "Overcast", "Nhiều mây"],
  45: ["smog", "Fog", "Sương mù"],
  48: ["smog", "Depositing rime fog", "Sương mù đóng băng"],
  51: ["cloud-rain", "Light drizzle", "Mưa phùn nhẹ"],
  53: ["cloud-rain", "Drizzle", "Mưa phùn"],
  55: ["cloud-rain", "Dense drizzle", "Mưa phùn dày"],
  61: ["cloud-showers-heavy", "Light rain", "Mưa nhẹ"],
  63: ["cloud-showers-heavy", "Rain", "Mưa"],
  65: ["cloud-showers-heavy", "Heavy rain", "Mưa lớn"],
  71: ["snowflake", "Light snow", "Tuyết nhẹ"],
  73: ["snowflake", "Snow", "Tuyết"],
  75: ["snowflake", "Heavy snow", "Tuyết lớn"],
  80: ["cloud-sun-rain", "Light showers", "Mưa rào nhẹ"],
  81: ["cloud-sun-rain", "Showers", "Mưa rào"],
  82: ["cloud-showers-heavy", "Heavy showers", "Mưa rào lớn"],
  95: ["cloud-bolt", "Thunderstorm", "Dông"],
  96: ["cloud-bolt", "Thunderstorm with hail", "Dông kèm mưa đá"],
  99: ["cloud-bolt", "Heavy thunderstorm with hail", "Dông mạnh kèm mưa đá"],
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
        <div>
          <h3>${this.escapeHtml(i18n.weather_title || "Weather")}</h3>
          <div class="weather-location" id="weather-location-label" title="${this.escapeAttribute(currentLocationLabel)}">${this.escapeHtml(currentLocationLabel)}</div>
        </div>
        <div class="weather-actions">
          <button class="icon-btn" id="weather-locate-btn" title="${this.escapeAttribute(i18n.weather_use_current || "Use current location")}"><i class="fa-solid fa-location-crosshairs"></i></button>
          <button class="icon-btn" id="weather-refresh-btn" title="${this.escapeAttribute(i18n.weather_refresh || "Refresh")}"><i class="fa-solid fa-rotate"></i></button>
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
    this.container.querySelector("#weather-refresh-btn")?.addEventListener("click", () => {
      this.loadWeather({ force: true })
    })

    this.container.querySelector("#weather-locate-btn")?.addEventListener("click", () => {
      this.useCurrentLocation()
    })

    const input = this.container.querySelector("#weather-location-input")
    const runSearch = () => {
      this.clearSuggestions()
      this.searchLocation(input?.value.trim() || "")
    }

    this.container.querySelector("#weather-search-btn")?.addEventListener("click", runSearch)

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

    this.container.querySelector("#weather-suggestions")?.addEventListener("click", (event) => {
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
      if (
        event.detail?.key === "weatherApiMode" ||
        event.detail?.key === "weatherForecastEndpoint" ||
        event.detail?.key === "weatherGeocodingEndpoint"
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
    const isWhiteMode = settings.showQuickAccessBg === true
    const skin =
      settings.widgetUseM3Accent === true
        ? "m3-accent"
        : isWhiteMode
          ? "white-blur"
          : settings.weatherSkin || "default"

    this.container.classList.toggle("skin-white-blur", skin === "white-blur")
    this.container.classList.toggle("skin-m3-accent", skin === "m3-accent")
    this.container.classList.toggle("skin-transparent", skin === "transparent")
    this.container.classList.toggle("skin-light-transparent", skin === "light-transparent")
    this.container.classList.toggle("widget-border-hidden", settings.weatherHideBorder === true)
    this.container.classList.toggle("weather-expanded", settings.weatherExpanded === true)
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

  isCustomWeatherApi() {
    const settings = getSettings()
    return (
      settings.weatherApiMode === "custom" &&
      this.isValidHttpUrl(settings.weatherForecastEndpoint)
    )
  }

  getForecastEndpoint() {
    const settings = getSettings()
    return this.isCustomWeatherApi()
      ? settings.weatherForecastEndpoint.trim()
      : DEFAULT_FORECAST_ENDPOINT
  }

  getGeocodingEndpoint() {
    const settings = getSettings()
    return settings.weatherApiMode === "custom" &&
      this.isValidHttpUrl(settings.weatherGeocodingEndpoint)
      ? settings.weatherGeocodingEndpoint.trim()
      : DEFAULT_GEOCODING_ENDPOINT
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

  canUseManualRefresh() {
    if (this.isCustomWeatherApi()) return true

    const now = Date.now()
    let timestamps = []
    try {
      timestamps = JSON.parse(localStorage.getItem(WEATHER_REFRESH_LIMIT_KEY) || "[]")
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
      localStorage.setItem(WEATHER_REFRESH_LIMIT_KEY, JSON.stringify(timestamps))
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

    const cached = this.getCachedWeather(location)
    if (!force && cached) {
      this.renderWeather(cached)
      return
    }

    body.innerHTML = `<div class="weather-loading">${this.escapeHtml(geti18n().weather_loading || "Loading weather...")}</div>`
    this.abortController?.abort()
    this.abortController = new AbortController()

    try {
      const params = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
        timezone: "auto",
        forecast_days: "4",
      })
      const data = await this.fetchJson(
        this.withQueryParams(this.getForecastEndpoint(), params),
        { signal: this.abortController.signal },
      )
      const payload = { location, data, fetchedAt: Date.now() }
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
    }
  }

  async searchLocation(query) {
    if (!query) return
    const body = this.container.querySelector("#weather-body")
    if (body) {
      body.innerHTML = `<div class="weather-loading">${this.escapeHtml(geti18n().weather_searching || "Searching...")}</div>`
    }

    try {
      const params = new URLSearchParams({
        name: query,
        count: "1",
        language: getSettings().language === "vi" ? "vi" : "en",
        format: "json",
      })
      const data = await this.fetchJson(
        this.withQueryParams(this.getGeocodingEndpoint(), params),
      )
      const first = data.results?.[0]
      if (!first) {
        this.renderMessage(geti18n().weather_location_not_found || "Location not found.")
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
      this.renderMessage(this.getFetchErrorMessage(error, "weather_location_error"))
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
      const params = new URLSearchParams({
        name: query,
        count: "5",
        language: getSettings().language === "vi" ? "vi" : "en",
        format: "json",
      })
      const data = await this.fetchJson(
        this.withQueryParams(this.getGeocodingEndpoint(), params),
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
      .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
      .slice(0, 5)

    if (!validResults.length) {
      this.clearSuggestions()
      return
    }

    suggestions.innerHTML = validResults
      .map((item, index) => {
        const admin = item.admin1 ? `${item.admin1}, ` : ""
        const country = item.country || ""
        const fullLabel = [item.name, admin.replace(/, $/, ""), country].filter(Boolean).join(", ")
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
    return Boolean(suggestions && suggestions.style.display !== "none" && suggestions.children.length)
  }

  getSuggestionItems() {
    return Array.from(this.container?.querySelectorAll("[data-weather-suggestion]") || [])
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
    if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return
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
      this.renderMessage(geti18n().weather_geolocation_unavailable || "Geolocation is not available.")
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
        this.renderMessage(geti18n().weather_location_denied || "Location permission was denied.")
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
      label.textContent = text
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
    const code = this.describeWeather(current.weather_code)
    this.setLocationLabel(location)

    const forecast = (daily.time || [])
      .slice(1, 4)
      .map((date, index) => {
        const dayCode = this.describeWeather(daily.weather_code?.[index + 1])
        const label = this.formatDay(date)
        const max = Math.round(daily.temperature_2m_max?.[index + 1] ?? 0)
        const min = Math.round(daily.temperature_2m_min?.[index + 1] ?? 0)
        const unit = data.daily_units?.temperature_2m_max || "°C"
        const summary = `${label}: ${max}/${min}${unit}`
        return `
          <div class="weather-day" title="${this.escapeAttribute(summary)}">
            <span title="${this.escapeAttribute(label)}">${this.escapeHtml(label)}</span>
            <i class="fa-solid fa-${dayCode.icon}"></i>
            <strong title="${this.escapeAttribute(summary)}">${max}/${min}${this.escapeHtml(unit)}</strong>
          </div>
        `
      })
      .join("")

    const temperature = `${Math.round(current.temperature_2m ?? 0)}${units.temperature_2m || "°C"}`
    const feelsLike = `${Math.round(current.apparent_temperature ?? current.temperature_2m ?? 0)}${units.apparent_temperature || "°C"}`
    const humidity = `${Math.round(current.relative_humidity_2m ?? 0)}${units.relative_humidity_2m || "%"}`
    const wind = `${Math.round(current.wind_speed_10m ?? 0)} ${units.wind_speed_10m || "km/h"}`

    body.innerHTML = `
      <div class="weather-current">
        <div class="weather-icon"><i class="fa-solid fa-${code.icon}"></i></div>
        <div class="weather-temp" title="${this.escapeAttribute(temperature)}">${Math.round(current.temperature_2m ?? 0)}<span>${this.escapeHtml(units.temperature_2m || "°C")}</span></div>
        <div class="weather-condition" title="${this.escapeAttribute(code.label)}">${this.escapeHtml(code.label)}</div>
      </div>
      <div class="weather-stats">
        <div title="${this.escapeAttribute(`${geti18n().weather_feels_like || "Feels"}: ${feelsLike}`)}"><span>${this.escapeHtml(geti18n().weather_feels_like || "Feels")}</span><strong title="${this.escapeAttribute(feelsLike)}">${this.escapeHtml(feelsLike)}</strong></div>
        <div title="${this.escapeAttribute(`${geti18n().weather_humidity || "Humidity"}: ${humidity}`)}"><span>${this.escapeHtml(geti18n().weather_humidity || "Humidity")}</span><strong title="${this.escapeAttribute(humidity)}">${this.escapeHtml(humidity)}</strong></div>
        <div title="${this.escapeAttribute(`${geti18n().weather_wind || "Wind"}: ${wind}`)}"><span>${this.escapeHtml(geti18n().weather_wind || "Wind")}</span><strong title="${this.escapeAttribute(wind)}">${this.escapeHtml(wind)}</strong></div>
      </div>
      <div class="weather-forecast">${forecast}</div>
      <div class="weather-source">Open-Meteo</div>
    `
  }

  renderMessage(message) {
    const body = this.container.querySelector("#weather-body")
    if (body) {
      body.innerHTML = `<div class="weather-loading">${this.escapeHtml(message)}</div>`
    }
  }

  describeWeather(code) {
    const item = WEATHER_CODES[Number(code)] || WEATHER_CODES[0]
    return {
      icon: item[0],
      label: getSettings().language === "vi" ? item[2] : item[1],
    }
  }

  formatDay(dateValue) {
    try {
      return new Date(`${dateValue}T12:00:00`).toLocaleDateString(
        getSettings().language === "vi" ? "vi-VN" : undefined,
        { weekday: "short" },
      )
    } catch {
      return dateValue
    }
  }

  getCachedWeather(location) {
    try {
      const cache = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || "null")
      if (!cache || Date.now() - cache.fetchedAt > WEATHER_CACHE_TTL) return null
      const sameLocation =
        Math.abs(cache.location.latitude - location.latitude) < 0.001 &&
        Math.abs(cache.location.longitude - location.longitude) < 0.001
      return sameLocation ? cache : null
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
