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
    translate: "Hạnh phục phụ thuộc vào chính chúng ta.",
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
      "Tốn thời gian.",
      "Dẹp đi bạn ơi.",
      "Bỏ đi mà làm người.",
      "Nghĩ cũng đừng nghĩ đến.",
      "Vũ trụ bảo không.",
    ],
    maybe: [
      "Tùy bạn thôi.",
      "Có thể.",
      "Hên xui.",
      "Hỏi lại sau đi.",
      "Mai rồi tính.",
      "Cũng hên xui à nha.",
      "Ngủ một giấc rồi tính sau.",
    ],
    wait: [
      "Đang tải dữ liệu lười... chờ tí.",
      "Cầu pha lê đang bận đi tắm, hỏi lại sau.",
      "Vũ trụ đang bận kết nối, thử lại sau 5 phút.",
      "Đợi tín hiệu từ hành tinh khác đi.",
      "Để mai tính, nay lười quá.",
      "Đang bận khịa người khác, xếp hàng đi.",
    ],
    yes: [
      "Có.",
      "Làm ngay.",
      "Chốt đơn.",
      "Không làm hơi phí.",
      "Nhích luôn cho nóng.",
      "Cơ hội ngàn năm có một.",
      "Làm đi chờ chi.",
    ],
    ironic: [
      "Không nên 🐧.",
      "Thôi, khó quá bỏ qua.",
      "Làm làm gì? 🤡",
      "Làm thì sợ mệt, không làm thì sợ nghèo, thôi chọn cái sau đi 🐧.",
      "Cầu bảo làm nhưng bạn có làm đâu mà hỏi? 🤡",
      "Thôi, ngủ tiếp đi, mơ sẽ thấy mình làm được mà 💤.",
      "Hỏi làm gì khi đằng nào cũng không làm? 🐧",
      "Thôi bỏ đi bạn ơi 🤡.",
      "Định làm thật à? Đùa đấy đừng làm ❓.",
    ],
    spam: [
      "Đã bảo là KHÔNG là KHÔNG! Đừng có spam 💢.",
      "Hỏi nữa là cầu nổ đấy! 💣",
      "Kiên trì đấy, nhưng kết quả vẫn thế thôi.",
      "Bộ không còn việc gì khác để làm à? 🙄",
      "Spam nữa là khóa nút đấy nhé! 🔒",
      "Vô ích thôi, câu trả lời vẫn là KHÔNG. 🤡",
    ],
    levels: [
      "",
      "Việc linh tinh (70% Không)",
      "Việc nhỏ (Hên xui cao)",
      "Trung bình (Có thể chờ đợi)",
      "Quan trọng (80% Có)",
      "Sống còn (Cẩn thận khịa 🤡)",
    ],
  },
  en: {
    no: [
      "No.",
      "Don't even dream about it.",
      "Absolutely not.",
      "Waste of time.",
      "Forget it, buddy.",
    ],
    maybe: [
      "It's up to you.",
      "Maybe.",
      "Fifty-fifty.",
      "Ask again later.",
    ],
    wait: [
      "Loading laziness data... wait a sec.",
      "Crystal ball is in the shower, ask later.",
      "Universe is busy connecting, try in 5 mins.",
      "Wait for signals from another planet.",
      "Let's decide tomorrow, too lazy today.",
      "Busy roasting someone else, get in line.",
    ],
    yes: [
      "Yes.",
      "Do it now.",
      "Just do it.",
      "Go for it while it's hot.",
    ],
    ironic: [
      "Better not 🐧.",
      "Too hard, just skip it.",
      "Afraid of work but afraid of being poor? Choose the latter 🐧.",
      "The ball says yes, but we both know you won't do it 🤡.",
      "Go back to sleep, you'll achieve it in your dreams 💤.",
      "Why ask when you won't do it anyway? 🐧",
      "Just give up, buddy 🤡.",
    ],
    spam: [
      "I said NO means NO! Stop spamming 💢.",
      "Ask again and I'll explode! 💣",
      "Persistent, aren't you? But the answer is still the same.",
      "Don't you have anything better to do? 🙄",
      "Stop spamming or I'll lock the button! 🔒",
    ],
    levels: [
      "",
      "Trivial (70% No)",
      "Minor (Risky)",
      "Normal (Balanced/Wait)",
      "Important (80% Yes)",
      "Critical (Expect irony 🤡)",
    ],
  },
}

export class DailyQuotes {
  constructor() {
    this.container = null
    this.isLocked = getSettings().lockedWidgets?.["daily-quotes"] || false
    this.showQuotes = getSettings().showQuotes === true
    this.crystalBallVisible = false
    this.currentPriority = 3
    this.lastQuestion = ""
    this.questionCount = 0
    this.init()
  }

  init() {
    this.render()
    this.applySettings()
    this.setupEventListeners()
    this.updateCrystalBallUI()
  }

  render() {
    this.container = document.createElement("div")
    this.container.id = "daily-quotes"
    this.container.classList.add("quotes-container")
    if (this.isLocked) {
      this.container.classList.add("locked", "is-locked")
    }

    this.container.innerHTML = `
            <div class="quote-content">
                <div class="quote-text"></div>
                <div class="quote-author"></div>
            </div>
            
            <div class="crystal-ball-trigger" title="Ask the Crystal Ball">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>

            <div class="crystal-ball-ui" style="display: none;">
                <div class="cb-input-group">
                    <input type="text" id="cb-work-input" placeholder="">
                    <div class="cb-priority-wrapper">
                        <div class="cb-priority-header">
                            <span id="cb-priority-label">Priority:</span>
                        </div>
                        <div class="cb-priority-buttons">
                            <button type="button" class="cb-prio-btn" data-level="1">1</button>
                            <button type="button" class="cb-prio-btn" data-level="2">2</button>
                            <button type="button" class="cb-prio-btn active" data-level="3">3</button>
                            <button type="button" class="cb-prio-btn" data-level="4">4</button>
                            <button type="button" class="cb-prio-btn" data-level="5">5</button>
                        </div>
                        <div id="cb-priority-desc" class="cb-priority-desc"></div>
                    </div>
                    <button id="cb-ask-btn">Ask 🔮</button>
                </div>
                <div id="cb-result-overlay" style="display: none;">
                    <div class="cb-result-text"></div>
                </div>
            </div>
        `

    document.body.appendChild(this.container)
    this.updateQuote()
  }

  updateQuote() {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 0)
    const diff = now - start
    const oneDay = 1000 * 60 * 60 * 24
    const dayOfYear = Math.floor(diff / oneDay)

    const quoteIndex = dayOfYear % QUOTES_DATA.length
    const quote = QUOTES_DATA[quoteIndex]

    const textEl = this.container.querySelector(".quote-text")
    const authorEl = this.container.querySelector(".quote-author")

    if (!textEl || !authorEl) return

    const isVietnamese = getSettings().language === "vi"
    textEl.textContent = isVietnamese ? quote.translate : quote.text
    authorEl.textContent = `- ${quote.author}`
  }

  updateCrystalBallUI() {
    const isVietnamese = getSettings().language === "vi"
    const input = this.container.querySelector("#cb-work-input")
    const askBtn = this.container.querySelector("#cb-ask-btn")
    const priorityLabel = this.container.querySelector("#cb-priority-label")
    const trigger = this.container.querySelector(".crystal-ball-trigger")

    if (input) input.placeholder = isVietnamese ? "Bạn muốn làm gì?" : "What do you want to do?"
    if (askBtn) askBtn.textContent = isVietnamese ? "Hỏi cầu pha lê 🔮" : "Ask the Crystal Ball 🔮"
    if (priorityLabel) priorityLabel.textContent = isVietnamese ? "Mức độ quan trọng:" : "Priority Level:"
    if (trigger) trigger.title = isVietnamese ? "Hỏi cầu pha lê" : "Ask the Crystal Ball"
    
    this.updatePriorityDescription(this.currentPriority)
  }

  updatePriorityDescription(val) {
    const isVietnamese = getSettings().language === "vi"
    const lang = isVietnamese ? "vi" : "en"
    const descEl = this.container.querySelector("#cb-priority-desc")
    if (descEl) descEl.textContent = CRYSTAL_BALL_ANSWERS[lang].levels[parseInt(val)]
  }

  setupEventListeners() {
    window.addEventListener("languageChanged", () => {
      this.updateQuote()
      this.updateCrystalBallUI()
    })

    const trigger = this.container.querySelector(".crystal-ball-trigger")
    const ui = this.container.querySelector(".crystal-ball-ui")
    const prioBtns = this.container.querySelectorAll(".cb-prio-btn")
    const askBtn = this.container.querySelector("#cb-ask-btn")
    const input = this.container.querySelector("#cb-work-input")

    if (trigger && ui) {
      trigger.addEventListener("click", () => {
        this.crystalBallVisible = !this.crystalBallVisible
        ui.style.display = this.crystalBallVisible ? "block" : "none"
        trigger.classList.toggle("active", this.crystalBallVisible)
      })
    }

    prioBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const level = parseInt(btn.dataset.level)
            this.currentPriority = level
            prioBtns.forEach(b => b.classList.remove("active"))
            btn.classList.add("active")
            this.updatePriorityDescription(level)
        })
    })

    if (askBtn) askBtn.addEventListener("click", () => this.askCrystalBall())
    if (input) {
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.askCrystalBall()
      })
    }
  }

  askCrystalBall() {
    const input = this.container.querySelector("#cb-work-input")
    const resultOverlay = this.container.querySelector("#cb-result-overlay")
    const resultText = this.container.querySelector(".cb-result-text")

    if (!input) return
    const currentQuestion = input.value.trim().toLowerCase()
    if (!currentQuestion) {
      input.focus()
      return
    }

    if (currentQuestion === this.lastQuestion) {
      this.questionCount++
    } else {
      this.lastQuestion = currentQuestion
      this.questionCount = 1
    }

    let answer = ""
    const lang = getSettings().language === "vi" ? "vi" : "en"
    const answers = CRYSTAL_BALL_ANSWERS[lang]

    if (this.questionCount >= 3) {
      answer = answers.spam[Math.floor(Math.random() * answers.spam.length)]
    } else {
      answer = this.generateAnswer(this.currentPriority)
    }

    this.container.classList.add("shaking")

    setTimeout(() => {
      this.container.classList.remove("shaking")
      if (resultText) resultText.textContent = answer
      if (resultOverlay) resultOverlay.style.display = "flex"

      setTimeout(() => {
        if (resultOverlay) resultOverlay.style.display = "none"
      }, 3500)
    }, 500)
  }

  generateAnswer(priority) {
    const random = Math.random() * 100
    const lang = getSettings().language === "vi" ? "vi" : "en"
    const answers = CRYSTAL_BALL_ANSWERS[lang]
    let pool = []

    if (priority <= 2) {
      if (random < 70) pool = answers.no
      else pool = answers.maybe
    } else if (priority === 3) {
      if (random < 30) pool = answers.yes
      else if (random < 60) pool = answers.maybe
      else if (random < 85) pool = answers.wait
      else pool = answers.no
    } else if (priority === 4) {
      if (random < 80) pool = answers.yes
      else pool = answers.maybe
    } else if (priority === 5) {
      pool = answers.ironic
    }

    return pool[Math.floor(Math.random() * pool.length)] || answers.maybe[0]
  }

  applySettings() {
    const settings = getSettings()
    this.isVisible = settings.showQuotes === true
    this.container.style.display = this.isVisible ? "block" : "none"
  }

  setVisibility(visible) {
    this.showQuotes = visible
    this.applySettings()
    updateSetting("showQuotes", visible)
    saveSettings()
  }
}

export function initDailyQuotes() {
  return new DailyQuotes()
}
