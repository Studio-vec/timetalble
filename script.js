const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS7LCmxR31uqR0rOOw9xE0smFQnEa7WTGHUJyQXtyHu6Ru1e3Ca32u9b-hL5qFhlu0S5d-rIvQu7d3b/pub?gid=528506633&single=true&output=csv';

const DATE_MAP = {
    "09-08": { KO: "9월 8일(화)", EN: "Sep. 8th (Tue)" },
    "09-09": { KO: "9월 9일(수)", EN: "Sep. 9th (Wed)" },
    "09-10": { KO: "9월 10일(목)", EN: "Sep. 10th (Thu)" }
};

const PLACE_ORDER = ["장충", "다이너A", "다이너B", "에메랄드", "루비", "토파즈", "이벤트"];

const PLACE_MAP = {
    "장충": { KO: "장충", EN: "Jangchung" },
    "다이너A": { KO: "다이너스티 A", EN: "Dynasty A" },
    "다이너B": { KO: "다이너스티 B", EN: "Dynasty B" },
    "에메랄드": { KO: "에메랄드", EN: "Emerald" },
    "루비": { KO: "루비", EN: "Ruby" },
    "토파즈": { KO: "토파즈", EN: "Topaz" },
    "이벤트": { KO: "이벤트", EN: "Event" }
};

const START_HOUR = 8; 
const END_HOUR = 20;
const TOTAL_HOURS = END_HOUR - START_HOUR;

const PALETTE = [
    { bg: '#fce4ec', border: '#ec407a' }, { bg: '#e3f2fd', border: '#42a5f5' },
    { bg: '#e8f5e9', border: '#66bb6a' }, { bg: '#fff3e0', border: '#ffa726' },
    { bg: '#f3e5f5', border: '#ab47bc' }, { bg: '#e0f7fa', border: '#26c6da' },
    { bg: '#fafafa', border: '#9e9e9e' }
];

let currentLang = 'KO';
let globalRawData = [];

function timeToPosition(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const timeInHours = hours + (minutes / 60);
    return ((timeInHours - START_HOUR) / TOTAL_HOURS) * 100;
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function loadGoogleSheetData() {
    try {
        const response = await fetch(GOOGLE_SHEET_URL + '&t=' + new Date().getTime());
        const csvText = await response.text();
        Papa.parse(csvText, {
            header: true, skipEmptyLines: true,
            complete: function(results) {
                globalRawData = results.data;
                renderTimetable();
            }
        });
    } catch (e) { console.error("데이터 로드 실패", e); }
}

function renderTimetable() {
    const wrapper = document.getElementById('timetable-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = ''; 
    
    const validData = [];
    globalRawData.forEach(item => {
        const keys = Object.keys(item);
        
        // [복구 완료] 한글, 영문, 특수문자 대응 검색 로직
        const findValue = (keywords) => {
            const key = keys.find(k => {
                // 헤더와 키워드 모두에서 공백, 언더바, 특수문자를 제거하고 비교
                const cleanKey = k.toLowerCase().replace(/[^a-z0-9ㄱ-ㅎㅏ-ㅣ가-힣]/g, '');
                return keywords.some(kw => {
                    const cleanKw = kw.toLowerCase().replace(/[^a-z0-9ㄱ-ㅎㅏ-ㅣ가-힣]/g, '');
                    return cleanKey.includes(cleanKw);
                });
            });
            return key ? item[key] : '';
        };

        const startTime = findValue(['starttime', '시작시간']);
        if (startTime) {
            validData.push({
                Date: (findValue(['date', '날짜']) || "").trim(),
                Place: (findValue(['place', '장소']) || "").trim(),
                StartTime: startTime.trim(),
                EndTime: (findValue(['endtime', '종료시간']) || "").trim(),
                Session_KOR: findValue(['sessionkor', '세션국']),
                Session_ENG: findValue(['sessioneng', '세션영']),
                Speaker_KOR: findValue(['speakerkor', '연사국']),
                Speaker_ENG: findValue(['speakereng', '연사영']),
                Moderator_KOR: findValue(['moderatorkor', '좌장국', '모더국']),
                Moderator_ENG: findValue(['moderatoreng', '좌장영', '모더영'])
            });
        }
    });

    const dates = [...new Set(validData.map(d => d.Date))].filter(d => d).sort();
    const allPlaces = [...new Set(validData.map(d => d.Place))].filter(p => p).sort((a, b) => {
        const idxA = PLACE_ORDER.indexOf(a);
        const idxB = PLACE_ORDER.indexOf(b);
        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });

    dates.forEach(date => {
        const dateGroup = document.createElement('div');
        dateGroup.className = 'date-group';
        const displayDate = DATE_MAP[date] ? DATE_MAP[date][currentLang] : date;
        dateGroup.innerHTML = `<div class="date-header">${displayDate}</div>`;

        const placesContainer = document.createElement('div');
        placesContainer.className = 'places-container';

        const timeAxis = document.createElement('div');
        timeAxis.className = 'time-axis';
        timeAxis.innerHTML = '<div class="place-header" style="visibility:hidden">Time</div>';
        const timeTrack = document.createElement('div');
        timeTrack.className = 'track-area'; 
        timeTrack.style.backgroundImage = 'none';

        for (let h = START_HOUR; h <= END_HOUR; h++) {
            [0, 30].forEach(m => {
                if (h === END_HOUR && m > 0) return;
                const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                const label = document.createElement('div');
                label.className = 'time-label';
                label.style.top = `${timeToPosition(timeStr)}%`;
                label.innerText = timeStr;
                timeTrack.appendChild(label);
            });
        }
        timeAxis.appendChild(timeTrack);
        placesContainer.appendChild(timeAxis);

        allPlaces.forEach((place, idx) => {
            const color = PALETTE[idx % PALETTE.length];
            const col = document.createElement('div');
            col.className = 'place-column';
            const displayPlace = PLACE_MAP[place] ? PLACE_MAP[place][currentLang] : place;
            col.innerHTML = `<div class="place-header">${displayPlace}</div><div class="track-area"></div>`;
            const track = col.querySelector('.track-area');

            validData.filter(d => d.Date === date && d.Place === place).forEach(s => {
                const startPos = timeToPosition(s.StartTime);
                const endPos = timeToPosition(s.EndTime || s.StartTime);
                const block = document.createElement('div');
                block.className = 'session-block';
                block.style.top = `${startPos}%`;
                block.style.height = `${Math.max(endPos - startPos, 4)}%`; 
                block.style.backgroundColor = color.bg;
                block.style.borderTop = `5px solid ${color.border}`;

                const t = currentLang === 'KO' ? (s.Session_KOR || s.Session_ENG) : (s.Session_ENG || s.Session_KOR);
                const spk = currentLang === 'KO' ? s.Speaker_KOR : s.Speaker_ENG;
                const mod = currentLang === 'KO' ? s.Moderator_KOR : s.Moderator_ENG;

                block.innerHTML = `
                    <div class="session-title">${escapeHTML(t)}</div>
                    <div class="session-time">${s.StartTime} - ${s.EndTime}</div>
                    <div class="session-speakers">
                        ${spk ? `<span class="speaker">${escapeHTML(spk)}</span>` : ''}
                        ${mod ? `<span class="moderator">${escapeHTML(mod)}</span>` : ''}
                    </div>
                `;
                track.appendChild(block);
            });
            placesContainer.appendChild(col);
        });
        dateGroup.appendChild(placesContainer);
        wrapper.appendChild(dateGroup);
    });
}

document.getElementById('btn-ko').onclick = () => { currentLang = 'KO'; updateBtn('btn-ko', 'btn-en'); renderTimetable(); };
document.getElementById('btn-en').onclick = () => { currentLang = 'EN'; updateBtn('btn-en', 'btn-ko'); renderTimetable(); };
function updateBtn(activeId, inactiveId) {
    document.getElementById(activeId).classList.add('active');
    document.getElementById(inactiveId).classList.remove('active');
}

document.getElementById('download-pdf-btn').onclick = () => {
    const btn = document.getElementById('download-pdf-btn');
    const el = document.getElementById('timetable-content');
    if (!el) return;

    const originalText = btn.innerText;
    btn.innerText = "PDF 생성 중...";
    btn.disabled = true;

    const opt = {
        margin: 0,
        filename: 'timetable_A3.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, windowWidth: 1600 },
        jsPDF: { unit: 'mm', format: 'a3', orientation: 'landscape', compress: true }
    };

    html2pdf().from(el).set(opt).save().then(() => {
        btn.innerText = originalText;
        btn.disabled = false;
    }).catch(err => {
        console.error("PDF 에러:", err);
        btn.innerText = "실패 (재시도)";
        btn.disabled = false;
    });
};

loadGoogleSheetData();
