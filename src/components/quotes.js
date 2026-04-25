import { getSettings, updateSetting, saveSettings } from "../services/state.js"
import { makeDraggable } from "../utils/draggable.js"

const QUOTES_DATA = [
  { author: "Steve Jobs", text: "Your work is going to fill a large part of your life… the only way to be truly satisfied is to do what you believe is great work.", translate: "Công việc chiếm phần lớn cuộc đời bạn… cách duy nhất để thật sự hài lòng là làm điều bạn tin là có giá trị." },
  { author: "Confucius", text: "Wherever you go, go with all your heart.", translate: "Dù đi đâu, hãy đi bằng cả trái tim." },
  { author: "Albert Einstein", text: "Life is like riding a bicycle. To keep your balance, you must keep moving.", translate: "Cuộc đời giống như đi xe đạp, muốn giữ thăng bằng bạn phải tiếp tục tiến về phía trước." },
  { author: "Vô danh", text: "A meaningful life is not being rich, but being remembered for the good you did.", translate: "Một cuộc sống có giá trị không phải là giàu có, mà là được nhớ đến vì những điều tốt đẹp bạn đã làm." },
  { author: "Oscar Wilde", text: "To live is the rarest thing in the world. Most people exist, that is all.", translate: "Sống là điều hiếm nhất trên đời. Nhiều người chỉ tồn tại, vậy thôi." },
  { author: "Mahatma Gandhi", text: "Be the change that you wish to see in the world.", translate: "Hãy là chính sự thay đổi mà bạn muốn thấy trên thế giới này." },
  { author: "Lao Tzu", text: "The journey of a thousand miles begins with one step.", translate: "Hành trình vạn dặm bắt đầu từ một bước chân." },
  { author: "Walt Disney", text: "The way to get started is to quit talking and begin doing.", translate: "Cách để bắt đầu là ngừng nói và bắt đầu làm." },
  { author: "Eleanor Roosevelt", text: "The future belongs to those who believe in the beauty of their dreams.", translate: "Tương lai thuộc về những ai tin vào vẻ đẹp của những giấc mơ." },
  { author: "Nelson Mandela", text: "It always seems impossible until it's done.", translate: "Mọi thứ dường như là không thể cho đến khi nó được hoàn thành." }
]

const CRYSTAL_BALL_ANSWERS = {
  vi: {
    no: ["Không.", "Đừng mơ.", "Tuyệt đối không."],
    maybe: ["Tùy bạn thôi.", "Có thể.", "Hên xui."],
    wait: ["Đang tải dữ liệu...", "Cầu pha lê bận.", "Thử lại sau."],
    yes: ["Có.", "Làm ngay.", "Chốt đơn."],
    ironic: ["Không nên 🐧.", "Lười quá 🐧.", "Định làm thật à? 🤡"],
    spam: ["Đừng có spam 💢.", "Hỏi nữa là cầu nổ! 💣"],
    levels: ["", "Linh tinh", "Việc nhỏ", "Trung bình", "Quan trọng", "Sống còn"],
  },
  en: {
    no: ["No.", "Don't dream.", "Absolutely not."],
    maybe: ["Up to you.", "Maybe.", "50/50."],
    wait: ["Loading...", "Busy.", "Wait."],
    yes: ["Yes.", "Do it.", "Just do it."],
    ironic: ["Better not 🐧.", "Too lazy 🐧.", "Really? 🤡"],
    spam: ["No spam 💢.", "Boom! 💣"],
    levels: ["", "Trivial", "Minor", "Normal", "Important", "Critical"],
  }
}

export class DailyQuotes {
  constructor() {
    this.container = null;
    this.isLocked = getSettings().lockedWidgets?.["daily-quotes"] || false;
    this.currentPriority = 3;
    this.lastQuestion = "";
    this.questionCount = 0;
    this.currentIndex = -1;
    this.init();
  }

  init() {
    this.render();
    this.setupEventListeners();
    this.updateCrystalBallUI();
    this.applySettings();
  }

  render() {
    this.container = document.createElement("div");
    this.container.id = "daily-quotes";
    this.container.className = "quotes-container";
    if (this.isLocked) this.container.classList.add("is-locked");

    this.container.innerHTML = `
      <div id="cb-result-overlay" style="display: none;">
          <div class="cb-result-text"></div>
      </div>
      <div class="quotes-content-wrap">
        <div class="quote-content">
          <div class="quote-text"></div>
          <div class="quote-footer">
            <div class="quote-author"></div>
            <div class="quotes-actions">
              <div class="quote-refresh-btn" title="Refresh Quote"><i class="fa-solid fa-rotate"></i></div>
              <div class="crystal-ball-trigger" title="Crystal Ball"><i class="fa-solid fa-chevron-up"></i></div>
            </div>
          </div>
        </div>

        <div class="crystal-ball-ui" style="display: none;">
            <div class="cb-input-group">
                <input type="text" id="cb-work-input" spellcheck="false" autocomplete="off">
                <div class="cb-priority-row">
                    <span id="cb-priority-label" class="cb-prio-label-inline"></span>
                    <div class="cb-priority-buttons">
                        <button type="button" class="cb-prio-btn" data-level="1">1</button>
                        <button type="button" class="cb-prio-btn" data-level="2">2</button>
                        <button type="button" class="cb-prio-btn" data-level="3">3</button>
                        <button type="button" class="cb-prio-btn" data-level="4">4</button>
                        <button type="button" class="cb-prio-btn" data-level="5">5</button>
                    </div>
                    <div id="cb-priority-desc" class="cb-priority-desc"></div>
                </div>
                <button id="cb-ask-btn">Ask</button>
            </div>
        </div>
      </div>
    `;
    document.body.appendChild(this.container);
    this.applySkin();
    this.updateQuote();
    this.updatePriorityUI();
  }

  updatePriorityUI() {
    this.container.querySelectorAll(".cb-prio-btn").forEach(btn => {
      const level = parseInt(btn.dataset.level);
      btn.classList.toggle("active", level === this.currentPriority);
    });
  }

  applySkin() {
    const skin = getSettings().quotesSkin || "default";
    this.container.classList.remove("skin-white-blur");
    if (skin === "white-blur") {
      this.container.classList.add("skin-white-blur");
    }
  }

  updateQuote(isManual = false) {
    if (this.currentIndex === -1 || isManual) {
      if (isManual) {
        let newIndex;
        do {
          newIndex = Math.floor(Math.random() * QUOTES_DATA.length);
        } while (newIndex === this.currentIndex && QUOTES_DATA.length > 1);
        this.currentIndex = newIndex;
      } else {
        const now = new Date();
        const day = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 8.64e7);
        this.currentIndex = day % QUOTES_DATA.length;
      }
    }

    const quote = QUOTES_DATA[this.currentIndex];
    const isVi = getSettings().language === "vi";
    const textEl = this.container.querySelector(".quote-text");
    const authEl = this.container.querySelector(".quote-author");
    
    if (textEl) {
      textEl.style.opacity = 0;
      setTimeout(() => {
        textEl.textContent = isVi ? quote.translate : quote.text;
        textEl.style.opacity = 1;
      }, 200);
    }
    if (authEl) {
      authEl.style.opacity = 0;
      setTimeout(() => {
        authEl.textContent = `- ${quote.author}`;
        authEl.style.opacity = 1;
      }, 200);
    }
  }

  updateCrystalBallUI() {
    const isVi = getSettings().language === "vi";
    const input = this.container.querySelector("#cb-work-input");
    const askBtn = this.container.querySelector("#cb-ask-btn");
    const prioLabel = this.container.querySelector("#cb-priority-label");

    if (input) input.placeholder = isVi ? "Bạn muốn làm gì?" : "What to do?";
    if (askBtn) askBtn.textContent = isVi ? "Hỏi" : "Ask";
    if (prioLabel) prioLabel.textContent = isVi ? "Mức độ:" : "Priority:";

    this.updatePriorityDescription(this.currentPriority);
  }

  updatePriorityDescription(val) {
    const lang = getSettings().language === "vi" ? "vi" : "en";
    const descEl = this.container.querySelector("#cb-priority-desc");
    if (descEl) descEl.textContent = CRYSTAL_BALL_ANSWERS[lang].levels[val];
  }

  setupEventListeners() {
    const trigger = this.container.querySelector(".crystal-ball-trigger");
    const refreshBtn = this.container.querySelector(".quote-refresh-btn");
    const ui = this.container.querySelector(".crystal-ball-ui");

    trigger?.addEventListener("click", (e) => {
        e.stopPropagation();
        const isHidden = ui.style.display === "none";
        ui.style.display = isHidden ? "block" : "none";
        trigger.classList.toggle("active", isHidden);
    });

    refreshBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.updateQuote(true);
      const icon = refreshBtn.querySelector("i");
      if (icon) {
        icon.classList.add("fa-spin");
        setTimeout(() => icon.classList.remove("fa-spin"), 600);
      }
    });

    this.container.querySelectorAll(".cb-prio-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.currentPriority = parseInt(btn.dataset.level);
        this.updatePriorityUI();
        this.updatePriorityDescription(this.currentPriority);
      });
    });

    this.container.querySelector("#cb-ask-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.askCrystalBall();
    });

    const input = this.container.querySelector("#cb-work-input");
    input?.addEventListener("keypress", (e) => { if (e.key === "Enter") this.askCrystalBall(); });
    input?.addEventListener("click", (e) => e.stopPropagation());

    const resultOverlay = this.container.querySelector("#cb-result-overlay");
    resultOverlay?.addEventListener("click", (e) => {
        e.stopPropagation();
        resultOverlay.style.display = "none";
    });

    window.addEventListener("languageChanged", () => { this.updateQuote(); this.updateCrystalBallUI(); });
    
    window.addEventListener("layoutUpdated", (e) => {
      if (e.detail.key === "showQuotes") {
        this.applySettings();
      }
      if (e.detail.key === "quotesSkin") {
        this.applySkin();
      }
    });
  }

  askCrystalBall() {
    const input = this.container.querySelector("#cb-work-input");
    const overlay = this.container.querySelector("#cb-result-overlay");
    const resText = this.container.querySelector(".cb-result-text");

    if (!input || !input.value.trim()) return;
    const question = input.value.trim().toLowerCase();
    if (question === this.lastQuestion) this.questionCount++;
    else { this.lastQuestion = question; this.questionCount = 1; }

    const lang = getSettings().language === "vi" ? "vi" : "en";
    const answers = CRYSTAL_BALL_ANSWERS[lang];
    let answer = this.questionCount >= 3 ? answers.spam[Math.floor(Math.random() * answers.spam.length)] : this.generateAnswer(this.currentPriority);

    const triggerBtnIcon = this.container.querySelector(".crystal-ball-trigger i");
    if (triggerBtnIcon) triggerBtnIcon.classList.add("icon-up-down");

    this.container.classList.add("shaking");
    setTimeout(() => {
      this.container.classList.remove("shaking");
      if (triggerBtnIcon) triggerBtnIcon.classList.remove("icon-up-down");
      
      if (resText) resText.textContent = answer;
      if (overlay) {
          overlay.style.display = "flex";
          setTimeout(() => { overlay.style.display = "none"; }, 3500);
      }
    }, 600);
  }

  generateAnswer(priority) {
    const lang = getSettings().language === "vi" ? "vi" : "en";
    const ans = CRYSTAL_BALL_ANSWERS[lang];
    if (priority <= 2) return Math.random() < 0.7 ? ans.no[0] : ans.maybe[0];
    if (priority === 5) return ans.ironic[Math.floor(Math.random() * ans.ironic.length)];
    const pool = [...ans.yes, ...ans.maybe, ...ans.wait];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  applySettings() {
    const settings = getSettings();
    this.container.style.display = settings.showQuotes !== false ? "block" : "none";
  }

  get showQuotes() {
    return getSettings().showQuotes !== false;
  }

  setVisibility(visible) {
    updateSetting("showQuotes", visible);
    saveSettings();
    this.applySettings();
    window.dispatchEvent(new CustomEvent("layoutUpdated", { detail: { key: "showQuotes", value: visible } }));
  }
}

export function initDailyQuotes() { return new DailyQuotes(); }
