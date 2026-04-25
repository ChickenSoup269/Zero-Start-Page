import { getSettings, updateSetting, saveSettings } from "../services/state.js"
import { makeDraggable } from "../utils/draggable.js"

const QUOTES_DATA = [
  // 1. Giá trị cuộc sống
  {
    author: "Albert Einstein",
    text: "Try not to become a man of success, but rather try to become a man of value.",
    translate:
      "Đừng cố trở thành người thành công, hãy cố trở thành người có giá trị.",
  },
  {
    author: "Ralph Waldo Emerson",
    text: "The purpose of life is not to be happy. It is to be useful, to be honorable, to be compassionate.",
    translate:
      "Mục đích của cuộc sống không chỉ là hạnh phúc, mà là sống có ích, có nhân cách và biết yêu thương.",
  },
  {
    author: "Leo Tolstoy",
    text: "The sole meaning of life is to serve humanity.",
    translate: "Ý nghĩa duy nhất của đời người là phụng sự nhân loại.",
  },
  {
    author: "Martin Luther King Jr.",
    text: "Life’s most persistent and urgent question is, ‘What are you doing for others?’",
    translate:
      "Câu hỏi dai dẳng và cấp bách nhất của cuộc sống là: ‘Bạn đang làm gì cho người khác?’",
  },
  {
    author: "Mahatma Gandhi",
    text: "The best way to find yourself is to lose yourself in the service of others.",
    translate:
      "Cách tốt nhất để tìm thấy chính mình là quên mình khi phục vụ người khác.",
  },
  {
    author: "Viktor Frankl",
    text: "Life is never made unbearable by circumstances, but only by lack of meaning and purpose.",
    translate:
      "Cuộc sống không trở nên không thể chịu đựng vì hoàn cảnh, mà vì thiếu ý nghĩa và mục đích.",
  },
  {
    author: "Dalai Lama",
    text: "The purpose of our lives is to be happy.",
    translate: "Mục đích của cuộc sống là hạnh phúc.",
  },
  {
    author: "Steve Jobs",
    text: "Your work is going to fill a large part of your life… the only way to be truly satisfied is to do what you believe is great work.",
    translate:
      "Công việc chiếm phần lớn cuộc đời bạn… cách duy nhất để thật sự hài lòng là làm điều bạn tin là có giá trị.",
  },
  {
    author: "Confucius (Khổng Tử)",
    text: "Wherever you go, go with all your heart.",
    translate: "Dù đi đâu, hãy đi bằng cả trái tim.",
  },
  {
    author: "Vô danh",
    text: "A meaningful life is not being rich, but being remembered for the good you did.",
    translate:
      "Một cuộc sống có giá trị không phải là giàu có, mà là được nhớ đến vì những điều tốt đẹp bạn đã làm.",
  },
  // 2. Sống là trải nghiệm
  {
    author: "Eleanor Roosevelt",
    text: "The purpose of life is to live it, to taste experience to the utmost...",
    translate:
      "Mục đích của cuộc sống là sống trọn vẹn, nếm trải trải nghiệm đến tận cùng...",
  },
  {
    author: "Oscar Wilde",
    text: "To live is the rarest thing in the world. Most people exist, that is all.",
    translate:
      "Sống là điều hiếm nhất trên đời. Nhiều người chỉ tồn tại, vậy thôi.",
  },
  {
    author: "George Bernard Shaw",
    text: "Life isn’t about finding yourself. Life is about creating yourself.",
    translate:
      "Cuộc đời không phải là đi tìm chính mình. Cuộc đời là tự tạo nên chính mình.",
  },
  {
    author: "Thoreau (Henry David Thoreau)",
    text: "Go confidently in the direction of your dreams. Live the life you have imagined.",
    translate:
      "Hãy tự tin đi theo hướng những giấc mơ. Sống cuộc đời bạn đã tưởng tượng.",
  },
  {
    author: "Ralph Waldo Emerson",
    text: "Life is a journey, not a destination.",
    translate: "Cuộc đời là hành trình, không phải đích đến.",
  },
  // 3. Sâu sắc, đáng suy ngẫm
  {
    author: "William Shakespeare",
    text: "All the world’s a stage, and all the men and women merely players.",
    translate:
      "Cả thế giới là một sân khấu, và con người chỉ là những vai diễn.",
  },
  {
    author: "Charlie Chaplin",
    text: "Life is a tragedy when seen in close-up, but a comedy in long-shot.",
    translate:
      "Cuộc đời là bi kịch khi nhìn cận cảnh, nhưng là hài kịch khi nhìn toàn cảnh.",
  },
  {
    author: "Mark Twain",
    text: "The two most important days in your life are the day you are born and the day you find out why.",
    translate:
      "Hai ngày quan trọng nhất của đời người là ngày bạn sinh ra và ngày bạn hiểu vì sao mình tồn tại.",
  },
  {
    author: "Jean-Paul Sartre",
    text: "Life begins on the other side of despair.",
    translate: "Cuộc sống bắt đầu từ phía bên kia bờ tuyệt vọng.",
  },
  {
    author: "Albert Einstein",
    text: "Life is like riding a bicycle. To keep your balance, you must keep moving.",
    translate:
      "Cuộc đời giống như đi xe đạp, muốn giữ thăng bằng bạn phải tiếp tục tiến về phía trước.",
  },
  {
    author: "Victor Hugo",
    text: "Life is the flower for which love is the honey.",
    translate: "Cuộc đời là bông hoa, còn tình yêu là mật ngọt.",
  },
  {
    author: "Paulo Coelho",
    text: "One day you will wake up and there won’t be any more time to do the things you’ve always wanted. Do it now.",
    translate:
      "Một ngày nào đó bạn sẽ thức dậy và không còn thời gian để làm điều mình từng muốn. Hãy làm ngay bây giờ.",
  },
  {
    author: "Haruki Murakami",
    text: "Once the storm is over, you won’t remember how you made it through.",
    translate:
      "Khi cơn bão đi qua, bạn sẽ không nhớ mình đã vượt qua nó bằng cách nào... Nhưng có một điều chắc chắn: bạn sẽ không còn là người đã bước vào cơn bão đó nữa.",
  },
  {
    author: "Khổng Tử (Confucius)",
    text: "Life is really simple, but we insist on making it complicated.",
    translate:
      "Cuộc đời vốn rất đơn giản, chỉ là con người tự làm nó phức tạp lên.",
  },
  {
    author: "Fyodor Dostoevsky",
    text: "The mystery of human existence lies not in just staying alive, but in finding something to live for.",
    translate:
      "Bí ẩn của đời người không phải là sống sót, mà là tìm được điều để sống vì nó.",
  },
  {
    author: "Vô danh",
    text: "Life doesn’t get easier, you just get stronger.",
    translate: "Cuộc đời không dễ hơn, chỉ là bạn mạnh mẽ hơn.",
  },
  {
    author: "Seneca",
    text: "Life is long, if you know how to use it.",
    translate: "Cuộc đời là dài, nếu bạn biết cách sử dụng nó.",
  },
  // 4. Cho bản thân
  {
    author: "Oscar Wilde",
    text: "Be yourself; everyone else is already taken.",
    translate: "Hãy là chính mình; vì những vai khác đều đã có người chọn rồi.",
  },
  {
    author: "Paulo Coelho (Popularized by The Rock)",
    text: "One day or day one. You decide.",
    translate: "Một ngày nào đó hay là hôm nay. Quyền quyết định là ở bạn.",
  },
  {
    author: "Eleanor Roosevelt",
    text: "No one can make you feel inferior without your consent.",
    translate:
      "Không ai có thể khiến bạn thấy thấp kém nếu bạn không cho phép.",
  },
  {
    author: "Marcus Aurelius",
    text: "You have power over your mind — not outside events. Realize this, and you will find strength.",
    translate:
      "Bạn có quyền lực với tâm trí mình — không phải với sự kiện bên ngoài. Nhận ra điều đó, bạn sẽ có sức mạnh.",
  },
  {
    author: "Steve Jobs",
    text: "Your time is limited, so don’t waste it living someone else’s life.",
    translate:
      "Thời gian của bạn có hạn, đừng lãng phí nó để sống cuộc đời của người khác.",
  },
  // 5. Thái độ sống
  {
    author: "Mother Teresa",
    text: "Peace begins with a smile.",
    translate: "Bình an bắt đầu từ một nụ cười.",
  },
  {
    author: "Aristotle",
    text: "Happiness depends upon ourselves.",
    translate: "Hạnh phúc phụ thuộc vào chính chúng ta.",
  },
  {
    author: "Lao Tzu",
    text: "A journey of a thousand miles begins with a single step.",
    translate: "Hành trình ngàn dặm bắt đầu từ một bước chân.",
  },
  {
    author: "Leonardo da Vinci",
    text: "Simplicity is the ultimate sophistication.",
    translate: "Đơn giản là đỉnh cao của tinh tế.",
  },
]

const CRYSTAL_BALL_ANSWERS = {
  vi: {
    no: [
      "Không.",
      "Đừng mơ.",
      "Tuyệt đối không.",
      "Quên đi nhé.",
      "Không đời nào.",
      "Hỏi câu khác đi.",
      "Trong giấc mơ của bạn.",
      "Tỉ lệ thành công là 0%.",
      "Dừng lại ngay.",
    ],
    maybe: [
      "Tùy bạn thôi.",
      "Có thể.",
      "Hên xui.",
      "Để xem đã.",
      "Khả năng cao là có.",
      "Hơi khó nói.",
      "Cứ thử xem sao.",
      "Gieo quẻ lại đi.",
      "Chắc là vậy.",
      "Chưa chắc đâu.",
    ],
    wait: [
      "Đang tải dữ liệu...",
      "Cầu pha lê bận.",
      "Thử lại sau.",
      "Đợi tí, đang suy nghĩ...",
      "Đang kết nối với vũ trụ...",
    ],
    yes: [
      "Có.",
      "Làm ngay.",
      "Chốt đơn.",
      "Tất nhiên rồi.",
      "Làm luôn cho nóng.",
      "Vận may đang đến.",
      "Ông trời bảo có.",
      "Quá chuẩn luôn.",
      "Ngại gì không thử.",
      "Triển luôn!",
    ],
    ironic: [
      "Không nên 🐧.",
      "Lười quá 🐧.",
      "Định làm thật à? 🤡",
      "Thôi xong rồi 💀.",
      "Đừng làm màu nữa 🤡.",
      "Cạn lời với bạn 🗿.",
      "Sáng suốt lên đi 🧠.",
      "Bạn đang đùa à? 😂",
    ],
    spam: [
      "Đừng có spam 💢.",
      "Hỏi nữa là cầu nổ! 💣",
      "Bình tĩnh nào!",
      "Spam nữa là nghỉ chơi.",
    ],
    levels: [
      "",
      "Linh tinh",
      "Việc nhỏ",
      "Trung bình",
      "Quan trọng",
      "Sống còn",
    ],
  },
  en: {
    no: [
      "No.",
      "Don't dream.",
      "Absolutely not.",
      "Not a chance.",
      "Forget about it.",
      "In your dreams.",
      "Better luck next time.",
      "Success rate: 0%.",
      "Stop now.",
    ],
    maybe: [
      "Up to you.",
      "Maybe.",
      "50/50.",
      "Wait and see.",
      "Signs point to maybe.",
      "Ask again later.",
      "Concentrate and ask again.",
      "It is uncertain.",
      "Hard to say.",
      "Possibly.",
    ],
    wait: [
      "Loading...",
      "Busy.",
      "Wait.",
      "Thinking...",
      "Connecting to the universe...",
    ],
    yes: [
      "Yes.",
      "Do it.",
      "Just do it.",
      "Without a doubt.",
      "Definitively yes.",
      "You may rely on it.",
      "As I see it, yes.",
      "Outlook good.",
      "It is certain.",
      "Go for it!",
    ],
    ironic: [
      "Better not 🐧.",
      "Too lazy 🐧.",
      "Really? 🤡",
      "RIP 💀.",
      "Stop clowning around 🤡.",
      "Bruh 🗿.",
      "Use your brain 🧠.",
      "Are you kidding me? 😂",
    ],
    spam: [
      "No spam 💢.",
      "Boom! 💣",
      "Calm down!",
      "Stop spamming or I'll explode.",
    ],
    levels: ["", "Trivial", "Minor", "Normal", "Important", "Critical"],
  },
}

export class DailyQuotes {
  constructor() {
    this.container = null
    this.isLocked = getSettings().lockedWidgets?.["daily-quotes"] || false
    this.currentPriority = 3
    this.lastQuestion = ""
    this.questionCount = 0
    this.currentIndex = -1
    this.init()
  }

  init() {
    this.render()
    this.setupEventListeners()
    this.updateCrystalBallUI()
    this.applySettings()
  }

  render() {
    this.container = document.createElement("div")
    this.container.id = "daily-quotes"
    this.container.className = "quotes-container"
    if (this.isLocked) this.container.classList.add("is-locked")

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
    `
    document.body.appendChild(this.container)
    this.applySkin()
    this.updateQuote()
    this.updatePriorityUI()
  }

  updatePriorityUI() {
    this.container.querySelectorAll(".cb-prio-btn").forEach((btn) => {
      const level = parseInt(btn.dataset.level)
      btn.classList.toggle("active", level === this.currentPriority)
    })
  }

  applySkin() {
    const skin = getSettings().quotesSkin || "default"
    this.container.classList.remove("skin-white-blur")
    if (skin === "white-blur") {
      this.container.classList.add("skin-white-blur")
    }
  }

  updateQuote(isManual = false) {
    if (this.currentIndex === -1 || isManual) {
      if (isManual) {
        let newIndex
        do {
          newIndex = Math.floor(Math.random() * QUOTES_DATA.length)
        } while (newIndex === this.currentIndex && QUOTES_DATA.length > 1)
        this.currentIndex = newIndex
      } else {
        const now = new Date()
        const day = Math.floor(
          (now - new Date(now.getFullYear(), 0, 0)) / 8.64e7,
        )
        this.currentIndex = day % QUOTES_DATA.length
      }
    }

    const quote = QUOTES_DATA[this.currentIndex]
    const isVi = getSettings().language === "vi"
    const textEl = this.container.querySelector(".quote-text")
    const authEl = this.container.querySelector(".quote-author")

    if (textEl) {
      textEl.style.opacity = 0
      setTimeout(() => {
        textEl.textContent = isVi ? quote.translate : quote.text
        textEl.style.opacity = 1
      }, 200)
    }
    if (authEl) {
      authEl.style.opacity = 0
      setTimeout(() => {
        authEl.textContent = `- ${quote.author}`
        authEl.style.opacity = 1
      }, 200)
    }
  }

  updateCrystalBallUI() {
    const isVi = getSettings().language === "vi"
    const input = this.container.querySelector("#cb-work-input")
    const askBtn = this.container.querySelector("#cb-ask-btn")
    const prioLabel = this.container.querySelector("#cb-priority-label")

    if (input) input.placeholder = isVi ? "Bạn muốn làm gì?" : "What to do?"
    if (askBtn) askBtn.textContent = isVi ? "Hỏi" : "Ask"
    if (prioLabel) prioLabel.textContent = isVi ? "Mức độ:" : "Priority:"

    this.updatePriorityDescription(this.currentPriority)
  }

  updatePriorityDescription(val) {
    const lang = getSettings().language === "vi" ? "vi" : "en"
    const descEl = this.container.querySelector("#cb-priority-desc")
    if (descEl) descEl.textContent = CRYSTAL_BALL_ANSWERS[lang].levels[val]
  }

  setupEventListeners() {
    const trigger = this.container.querySelector(".crystal-ball-trigger")
    const refreshBtn = this.container.querySelector(".quote-refresh-btn")
    const ui = this.container.querySelector(".crystal-ball-ui")

    trigger?.addEventListener("click", (e) => {
      e.stopPropagation()
      const isHidden = ui.style.display === "none"
      ui.style.display = isHidden ? "block" : "none"
      trigger.classList.toggle("active", isHidden)
    })

    refreshBtn?.addEventListener("click", (e) => {
      e.stopPropagation()
      this.updateQuote(true)
      const icon = refreshBtn.querySelector("i")
      if (icon) {
        icon.classList.add("fa-spin")
        setTimeout(() => icon.classList.remove("fa-spin"), 600)
      }
    })

    this.container.querySelectorAll(".cb-prio-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation()
        this.currentPriority = parseInt(btn.dataset.level)
        this.updatePriorityUI()
        this.updatePriorityDescription(this.currentPriority)
      })
    })

    this.container
      .querySelector("#cb-ask-btn")
      ?.addEventListener("click", (e) => {
        e.stopPropagation()
        this.askCrystalBall()
      })

    const input = this.container.querySelector("#cb-work-input")
    input?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.askCrystalBall()
    })
    input?.addEventListener("click", (e) => e.stopPropagation())

    const resultOverlay = this.container.querySelector("#cb-result-overlay")
    resultOverlay?.addEventListener("click", (e) => {
      e.stopPropagation()
      resultOverlay.style.display = "none"
    })

    window.addEventListener("languageChanged", () => {
      this.updateQuote()
      this.updateCrystalBallUI()
    })

    window.addEventListener("layoutUpdated", (e) => {
      if (e.detail.key === "showQuotes") {
        this.applySettings()
      }
      if (e.detail.key === "quotesSkin") {
        this.applySkin()
      }
    })
  }

  askCrystalBall() {
    const input = this.container.querySelector("#cb-work-input")
    const overlay = this.container.querySelector("#cb-result-overlay")
    const resText = this.container.querySelector(".cb-result-text")

    if (!input || !input.value.trim()) return
    const question = input.value.trim().toLowerCase()
    if (question === this.lastQuestion) this.questionCount++
    else {
      this.lastQuestion = question
      this.questionCount = 1
    }

    const lang = getSettings().language === "vi" ? "vi" : "en"
    const answers = CRYSTAL_BALL_ANSWERS[lang]
    let answer =
      this.questionCount >= 3
        ? answers.spam[Math.floor(Math.random() * answers.spam.length)]
        : this.generateAnswer(this.currentPriority)

    const triggerBtnIcon = this.container.querySelector(
      ".crystal-ball-trigger i",
    )
    if (triggerBtnIcon) triggerBtnIcon.classList.add("icon-up-down")

    this.container.classList.add("shaking")
    setTimeout(() => {
      this.container.classList.remove("shaking")
      if (triggerBtnIcon) triggerBtnIcon.classList.remove("icon-up-down")

      if (resText) resText.textContent = answer
      if (overlay) {
        overlay.style.display = "flex"
        setTimeout(() => {
          overlay.style.display = "none"
        }, 3500)
      }
    }, 600)
  }

  generateAnswer(priority) {
    const lang = getSettings().language === "vi" ? "vi" : "en"
    const ans = CRYSTAL_BALL_ANSWERS[lang]

    // Priority 1-2: Lean towards No/Maybe
    if (priority <= 2) {
      const pool = Math.random() < 0.7 ? ans.no : ans.maybe
      return pool[Math.floor(Math.random() * pool.length)]
    }

    // Priority 5: High stakes/Critical, use ironic answers
    if (priority === 5) {
      const pool = Math.random() < 0.4 ? ans.yes : ans.ironic
      return pool[Math.floor(Math.random() * pool.length)]
    }

    // Priority 3-4: Normal/Important, balanced pool
    const pool = [...ans.yes, ...ans.maybe, ...ans.wait]
    return pool[Math.floor(Math.random() * pool.length)]
  }

  applySettings() {
    const settings = getSettings()
    this.container.style.display =
      settings.showQuotes !== false ? "block" : "none"
  }

  get showQuotes() {
    return getSettings().showQuotes !== false
  }

  setVisibility(visible) {
    updateSetting("showQuotes", visible)
    saveSettings()
    this.applySettings()
    window.dispatchEvent(
      new CustomEvent("layoutUpdated", {
        detail: { key: "showQuotes", value: visible },
      }),
    )
  }
}

export function initDailyQuotes() {
  return new DailyQuotes()
}
