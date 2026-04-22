import { getSettings, updateSetting, saveSettings } from "../services/state.js"
import { makeDraggable } from "../utils/draggable.js"

const QUOTES_DATA = [
    // 1. Giá trị cuộc sống
    {
        author: "Albert Einstein",
        text: "Try not to become a man of success, but rather try to become a man of value.",
        translate: "Đừng cố trở thành người thành công, hãy cố trở thành người có giá trị."
    },
    {
        author: "Ralph Waldo Emerson",
        text: "The purpose of life is not to be happy. It is to be useful, to be honorable, to be compassionate.",
        translate: "Mục đích của cuộc sống không chỉ là hạnh phúc, mà là sống có ích, có nhân cách và biết yêu thương."
    },
    {
        author: "Leo Tolstoy",
        text: "The sole meaning of life is to serve humanity.",
        translate: "Ý nghĩa duy nhất của cuộc sống là phục vụ con người."
    },
    {
        author: "Martin Luther King Jr.",
        text: "Life’s most persistent and urgent question is, ‘What are you doing for others?’",
        translate: "Câu hỏi dai dẳng và cấp bách nhất của cuộc sống là: ‘Bạn đang làm gì cho người khác?’"
    },
    {
        author: "Mahatma Gandhi",
        text: "The best way to find yourself is to lose yourself in the service of others.",
        translate: "Cách tốt nhất để tìm thấy chính mình là cống hiến cho người khác."
    },
    {
        author: "Viktor Frankl",
        text: "Life is never made unbearable by circumstances, but only by lack of meaning and purpose.",
        translate: "Cuộc sống không trở nên không thể chịu đựng vì hoàn cảnh, mà vì thiếu ý nghĩa và mục đích."
    },
    {
        author: "Dalai Lama",
        text: "The purpose of our lives is to be happy.",
        translate: "Mục đích của cuộc sống là hạnh phúc."
    },
    {
        author: "Steve Jobs",
        text: "Your work is going to fill a large part of your life… the only way to be truly satisfied is to do what you believe is great work.",
        translate: "Công việc chiếm phần lớn cuộc đời bạn… cách duy nhất để thật sự hài lòng là làm điều bạn tin là có giá trị."
    },
    {
        author: "Confucius (Khổng Tử)",
        text: "Wherever you go, go with all your heart.",
        translate: "Dù đi đâu, hãy đi bằng cả trái tim."
    },
    {
        author: "Vô danh",
        text: "A meaningful life is not being rich, but being remembered for the good you did.",
        translate: "Một cuộc sống có giá trị không phải là giàu có, mà là được nhớ đến vì những điều tốt đẹp bạn đã làm."
    },
    // 2. Sống là trải nghiệm
    {
        author: "Eleanor Roosevelt",
        text: "The purpose of life is to live it, to taste experience to the utmost...",
        translate: "Mục đích của cuộc sống là sống trọn vẹn, nếm trải trải nghiệm đến tận cùng..."
    },
    {
        author: "Oscar Wilde",
        text: "To live is the rarest thing in the world. Most people exist, that is all.",
        translate: "Sống là điều hiếm nhất trên đời. Nhiều người chỉ tồn tại, vậy thôi."
    },
    {
        author: "George Bernard Shaw",
        text: "Life isn’t about finding yourself. Life is about creating yourself.",
        translate: "Cuộc đời không phải để tìm ra bạn là ai, mà là để tạo nên chính bạn."
    },
    {
        author: "Thoreau (Henry David Thoreau)",
        text: "Go confidently in the direction of your dreams. Live the life you have imagined.",
        translate: "Hãy tự tin đi theo hướng những giấc mơ. Sống cuộc đời bạn đã tưởng tượng."
    },
    {
        author: "Ralph Waldo Emerson",
        text: "Life is a journey, not a destination.",
        translate: "Cuộc đời là hành trình, không phải đích đến."
    },
    // 3. Sâu sắc, đáng suy ngẫm
    {
        author: "William Shakespeare",
        text: "All the world’s a stage, and all the men and women merely players.",
        translate: "Cả thế giới là một sân khấu, và con người chỉ là những vai diễn."
    },
    {
        author: "Charlie Chaplin",
        text: "Life is a tragedy when seen in close-up, but a comedy in long-shot.",
        translate: "Cuộc đời là bi kịch khi nhìn gần, nhưng là hài kịch khi nhìn xa."
    },
    {
        author: "Mark Twain",
        text: "The two most important days in your life are the day you are born and the day you find out why.",
        translate: "Hai ngày quan trọng nhất của đời người là ngày bạn sinh ra và ngày bạn hiểu vì sao mình tồn tại."
    },
    {
        author: "Jean-Paul Sartre",
        text: "Life begins on the other side of despair.",
        translate: "Cuộc đời bắt đầu ở phía bên kia của tuyệt vọng."
    },
    {
        author: "Albert Einstein",
        text: "Life is like riding a bicycle. To keep your balance, you must keep moving.",
        translate: "Cuộc đời giống như đi xe đạp, muốn giữ thăng bằng bạn phải tiếp tục tiến về phía trước."
    },
    {
        author: "Victor Hugo",
        text: "Life is the flower for which love is the honey.",
        translate: "Cuộc đời là bông hoa, còn tình yêu là mật ngọt."
    },
    {
        author: "Paulo Coelho",
        text: "One day you will wake up and there won’t be any more time to do the things you’ve always wanted. Do it now.",
        translate: "Một ngày nào đó bạn sẽ thức dậy và không còn thời gian để làm điều mình từng muốn. Hãy làm ngay bây giờ."
    },
    {
        author: "Haruki Murakami",
        text: "Once the storm is over, you won’t remember how you made it through.",
        translate: "Khi cơn bão qua đi, bạn sẽ không nhớ mình đã vượt qua nó thế nào – chỉ biết rằng bạn đã mạnh mẽ hơn."
    },
    {
        author: "Khổng Tử (Confucius)",
        text: "Life is really simple, but we insist on making it complicated.",
        translate: "Cuộc đời vốn rất đơn giản, chỉ là con người tự làm nó phức tạp lên."
    },
    {
        author: "Fyodor Dostoevsky",
        text: "The mystery of human existence lies not in just staying alive, but in finding something to live for.",
        translate: "Bí ẩn của đời người không phải là sống sót, mà là tìm được điều để sống vì nó."
    },
    {
        author: "Vô danh",
        text: "Life doesn’t get easier, you just get stronger.",
        translate: "Cuộc đời không dễ hơn, chỉ là bạn mạnh mẽ hơn."
    },
    {
        author: "Seneca",
        text: "Life is long, if you know how to use it.",
        translate: "Cuộc đời là dài, nếu bạn biết cách sử dụng nó."
    },
    // 4. Cho bản thân
    {
        author: "Oscar Wilde",
        text: "Be yourself; everyone else is already taken.",
        translate: "Hãy là chính mình; ai khác cũng đã có người đóng rồi."
    },
    {
        author: "Eleanor Roosevelt",
        text: "No one can make you feel inferior without your consent.",
        translate: "Không ai có thể khiến bạn thấy thấp kém nếu bạn không cho phép."
    },
    {
        author: "Marcus Aurelius",
        text: "You have power over your mind — not outside events. Realize this, and you will find strength.",
        translate: "Bạn có quyền lực với tâm trí mình — không phải với sự kiện bên ngoài. Nhận ra điều đó, bạn sẽ có sức mạnh."
    },
    {
        author: "Steve Jobs",
        text: "Your time is limited, so don’t waste it living someone else’s life.",
        translate: "Thời gian của bạn có hạn, đừng lãng phí nó để sống cuộc đời của người khác."
    },
    // 5. Thái độ sống
    {
        author: "Mother Teresa",
        text: "Peace begins with a smile.",
        translate: "Bình an bắt đầu từ một nụ cười."
    },
    {
        author: "Aristotle",
        text: "Happiness depends upon ourselves.",
        translate: "Hạnh phúc phụ thuộc vào chính chúng ta."
    },
    {
        author: "Lao Tzu",
        text: "A journey of a thousand miles begins with a single step.",
        translate: "Hành trình ngàn dặm bắt đầu từ một bước chân."
    },
    {
        author: "Leonardo da Vinci",
        text: "Simplicity is the ultimate sophistication.",
        translate: "Đơn giản là đỉnh cao của tinh tế."
    }
];

export class DailyQuotes {
    constructor() {
        this.container = null;
        this.isLocked = getSettings().quotesLocked || false;
        this.showQuotes = getSettings().showQuotes === true; // Default to false
        this.init();
    }

    init() {
        this.render();
        this.updateQuote();
        this.applySettings();
        this.setupEventListeners();
    }

    render() {
        this.container = document.createElement('div');
        this.container.id = 'daily-quotes';
        this.container.className = `quotes-container ${this.isLocked ? 'locked' : ''}`;
        
        this.container.innerHTML = `
            <div class="quote-text"></div>
            <div class="quote-author"></div>
        `;

        document.body.appendChild(this.container);

        // Khôi phục vị trí
        const pos = getSettings().componentPositions?.['daily-quotes'];
        if (pos) {
            this.container.style.top = pos.top;
            this.container.style.left = pos.left;
            this.container.style.transform = 'none';
        }

        if (!this.isLocked) {
            this.enableDraggable();
        }
    }

    updateQuote() {
        // Chọn câu nói dựa trên ngày (Day of the year)
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now - start;
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);
        
        const quoteIndex = dayOfYear % QUOTES_DATA.length;
        const quote = QUOTES_DATA[quoteIndex];

        const textEl = this.container.querySelector('.quote-text');
        const authorEl = this.container.querySelector('.quote-author');

        const isVietnamese = getSettings().language === 'vi';
        textEl.textContent = isVietnamese ? quote.translate : quote.text;
        authorEl.textContent = `- ${quote.author}`;
    }

    setupEventListeners() {
        // Lắng nghe thay đổi ngôn ngữ
        window.addEventListener('languageChanged', () => this.updateQuote());
    }

    toggleLock() {
        this.isLocked = !this.isLocked;
        updateSetting('quotesLocked', this.isLocked);
        saveSettings();

        if (this.isLocked) {
            this.container.classList.add('locked');
            this.disableDraggable();
        } else {
            this.container.classList.remove('locked');
            this.enableDraggable();
        }
    }

    enableDraggable() {
        makeDraggable(this.container, {
            handle: this.container,
            onStop: (pos) => {
                const positions = getSettings().componentPositions || {};
                positions['daily-quotes'] = pos;
                updateSetting('componentPositions', positions);
                saveSettings();
            }
        });
    }

    disableDraggable() {
        // Draggable utility should handle this, or we just rely on CSS cursor: default
        // and the fact that we don't re-init draggable.
    }

    applySettings() {
        this.container.style.display = this.showQuotes ? 'block' : 'none';
    }

    setVisibility(visible) {
        this.showQuotes = visible;
        this.applySettings();
        updateSetting('showQuotes', visible);
        saveSettings();
    }
}

export function initDailyQuotes() {
    return new DailyQuotes();
}
