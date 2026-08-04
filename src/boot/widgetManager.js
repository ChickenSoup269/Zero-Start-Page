/**
 * boot/widgetManager.js
 * Manages lazy-loading and initialization of all page widgets.
 * Each widget module is imported only when needed.
 */
import { makeDraggable } from "../utils/draggable.js"
import { getSettings } from "../services/state.js"

const widgets = {
  todo: null,
  timer: null,
  music: null,
  calendar: null,
  quotes: null,
  weather: null,
  notepad: null,
  rss: null,
  habitTracker: null,
}

const widgetModuleLoaders = {
  todo:         () => import("../components/todo.js").then((m) => m.TodoList),
  timer:        () => import("../components/timer.js").then((m) => m.Timer),
  music:        () => import("../components/musicPlayer.js").then((m) => m.MusicPlayer),
  calendar:     () => import("../components/fullCalendar.js").then((m) => m.FullCalendar),
  quotes:       () => import("../components/quotes.js").then((m) => m.DailyQuotes),
  weather:      () => import("../components/weather.js").then((m) => m.Weather),
  notepad:      () => import("../components/notepad.js").then((m) => m.Notepad),
  rss:          () => import("../components/rss.js").then((m) => m.RssReader),
  habitTracker: () => import("../components/habitTracker.js").then((m) => m.HabitTracker),
}

const widgetClassPromises = {}

function loadWidgetClass(type) {
  if (!widgetClassPromises[type]) {
    widgetClassPromises[type] = widgetModuleLoaders[type]()
  }
  return widgetClassPromises[type]
}

export async function initWidget(type) {
  if (widgets[type]) return widgets[type]

  switch (type) {
    case "todo": {
      const TodoList = await loadWidgetClass("todo")
      widgets.todo = new TodoList()
      makeDraggable(widgets.todo.container, "todo")
      return widgets.todo
    }
    case "timer": {
      const Timer = await loadWidgetClass("timer")
      widgets.timer = new Timer()
      window.activeTimer = widgets.timer
      makeDraggable(widgets.timer.container, "timer")
      return widgets.timer
    }
    case "music": {
      const MusicPlayer = await loadWidgetClass("music")
      widgets.music = new MusicPlayer()
      makeDraggable(widgets.music.container, "music")
      return widgets.music
    }
    case "calendar": {
      const FullCalendar = await loadWidgetClass("calendar")
      widgets.calendar = new FullCalendar()
      makeDraggable(widgets.calendar.container, "calendar")
      return widgets.calendar
    }
    case "quotes": {
      const DailyQuotes = await loadWidgetClass("quotes")
      widgets.quotes = new DailyQuotes()
      makeDraggable(widgets.quotes.container, "daily-quotes")
      return widgets.quotes
    }
    case "weather": {
      const Weather = await loadWidgetClass("weather")
      widgets.weather = new Weather()
      makeDraggable(widgets.weather.container, "weather")
      return widgets.weather
    }
    case "notepad": {
      const Notepad = await loadWidgetClass("notepad")
      widgets.notepad = new Notepad()
      makeDraggable(widgets.notepad.container, "notepad", null, ".notepad-header")
      return widgets.notepad
    }
    case "rss": {
      const RssReader = await loadWidgetClass("rss")
      widgets.rss = new RssReader(document.getElementById("rss-container"))
      makeDraggable(widgets.rss.container, "rss", null, ".rss-header")
      return widgets.rss
    }
    case "habitTracker": {
      const HabitTracker = await loadWidgetClass("habitTracker")
      widgets.habitTracker = new HabitTracker(
        document.getElementById("habit-tracker-container"),
      )
      makeDraggable(widgets.habitTracker.container, "habitTracker")
      return widgets.habitTracker
    }
    default:
      return null
  }
}

export function getWidget(type) {
  return widgets[type] ?? null
}

export function setWidget(type, instance) {
  widgets[type] = instance
}

function hasDetachedNotepadNotes() {
  try {
    const detached = JSON.parse(localStorage.getItem("detachedNotes") || "{}")
    return Object.values(detached).some(Boolean)
  } catch {
    return false
  }
}

export function initVisibleWidgets() {
  const settings = getSettings()
  if (settings.showTodoList !== false) void initWidget("todo")
  if (settings.showNotepad !== false || hasDetachedNotepadNotes()) void initWidget("notepad")
  if (settings.showQuotes !== false) void initWidget("quotes")
  if (settings.showWeather === true) void initWidget("weather")
  if (settings.showTimer === true) void initWidget("timer")
  if (settings.showHabits === true) void initWidget("habitTracker")
  if (settings.showFullCalendar === true) void initWidget("calendar")
  if (settings.musicPlayerEnabled === true) void initWidget("music")
  if (settings.showRss === true) {
    void initWidget("rss").then((w) => {
      if (w) w.container.style.display = "flex"
    })
  }
}

/** Wire the layoutUpdated event to lazy-load widgets when toggled on */
export function setupWidgetLayoutListeners() {
  window.addEventListener("layoutUpdated", (e) => {
    if (!e.detail?.value) return
    switch (e.detail.key) {
      case "showTodoList":      void initWidget("todo"); break
      case "showNotepad":       void initWidget("notepad"); break
      case "showHabits":        void initWidget("habitTracker"); break
      case "showTimer":         void initWidget("timer"); break
      case "showFullCalendar":  void initWidget("calendar"); break
      case "showQuotes":        void initWidget("quotes"); break
      case "showWeather":       void initWidget("weather"); break
      case "showRss":
        if (e.detail.value) {
          void initWidget("rss").then((w) => { if (w) w.container.style.display = "flex" })
        } else {
          if (widgets.rss) widgets.rss.container.style.display = "none"
        }
        break
    }
  })

  window.addEventListener("settingsUpdated", async (e) => {
    if (e.detail?.key === "musicPlayerEnabled" && e.detail.value === true) {
      const music = await initWidget("music")
      music.setEnabled(true)
    } else if (
      e.detail?.key === "musicPlayerEnabled" &&
      e.detail.value !== true &&
      widgets.music
    ) {
      widgets.music.destroy?.()
      widgets.music = null
    }
  })
}
