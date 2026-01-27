import { getSettings } from "../services/state.js";

export class FullCalendar {
    constructor() {
        this.container = document.getElementById("full-calendar-container");
        this.isVisible = getSettings().showFullCalendar === true;
        this.viewDate = new Date();
        this.init();
    }

    init() {
        this.render();
        this.setupEventListeners();
        this.updateVisibility();
    }

    setupEventListeners() {
        window.addEventListener("layoutUpdated", (e) => {
            if (e.detail.key === "showFullCalendar") {
                this.isVisible = e.detail.value;
                this.updateVisibility();
            }
        });

        this.container.addEventListener("click", (e) => {
            if (e.target.closest("#prev-month")) {
                this.navigateMonth(-1);
            } else if (e.target.closest("#next-month")) {
                this.navigateMonth(1);
            } else if (e.target.classList.contains("day-item") && e.target.textContent.trim() !== "") {
                this.selectDay(e.target);
            }
        });
    }

    selectDay(dayElement) {
        this.container.querySelectorAll(".day-item").forEach(d => d.classList.remove("selected"));
        dayElement.classList.add("selected");
    }

    navigateMonth(offset) {
        this.viewDate.setMonth(this.viewDate.getMonth() + offset);
        this.render();
    }

    updateVisibility() {
        if (this.container) {
            this.container.style.display = this.isVisible ? "block" : "none";
        }
    }

    render() {
        if (!this.container) return;
        
        const year = this.viewDate.getFullYear();
        const month = this.viewDate.getMonth();
        const now = new Date();

        this.container.innerHTML = "";
        this.container.className = "calendar-card glass-panel drag-handle";

        const monthName = this.viewDate.toLocaleString('default', { month: 'long' });
        
        const header = document.createElement("div");
        header.className = "calendar-header";
        header.innerHTML = `
            <button id="prev-month" class="icon-btn"><i class="fa-solid fa-chevron-left"></i></button>
            <h3 class="month-title">${monthName} ${year}</h3>
            <button id="next-month" class="icon-btn"><i class="fa-solid fa-chevron-right"></i></button>
        `;
        this.container.appendChild(header);

        const daysGrid = document.createElement("div");
        daysGrid.className = "days-grid";
        
        // Weekday headers
        const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        weekdays.forEach(wd => {
            const wdDiv = document.createElement("div");
            wdDiv.className = "weekday-header";
            wdDiv.textContent = wd;
            daysGrid.appendChild(wdDiv);
        });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Empty slots for padding
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement("div");
            daysGrid.appendChild(empty);
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const dayDiv = document.createElement("div");
            dayDiv.className = "day-item";
            if (day === now.getDate() && month === now.getMonth() && year === now.getFullYear()) {
                dayDiv.classList.add("today");
            }
            dayDiv.textContent = day;
            daysGrid.appendChild(dayDiv);
        }

        this.container.appendChild(daysGrid);
    }
}
