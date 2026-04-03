// 1. 구글 시트 CSV 링크
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS7LCmxR31uqR0rOOw9xE0smFQnEa7WTGHUJyQXtyHu6Ru1e3Ca32u9b-hL5qFhlu0S5d-rIvQu7d3b/pub?gid=528506633&single=true&output=csv';

// 2. 날짜 및 장소 이름 매핑
const DATE_MAP = {
    "09-08": { KO: "9월 8일(화)", EN: "Sep. 8th (Tue)" },
    "09-09": { KO: "9월 9일(수)", EN: "Sep. 9th (Wed)" },
    "09-10": { KO: "9월 10일(목)", EN: "Sep. 10th (Thu)" }
};

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
    { bg: '#f3e5f5', border: '#ab47bc' }, { bg: '#e0f7fa', border: '#26c6da' }
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
    wrapper.innerHTML = ''; 
    
    const validData = [];
    globalRawData.forEach(item => {
        const keys = Object.keys(item);
        const findValue = (keywords) => {
            const key = keys.find(k => keywords.some(kw => k.toLowerCase().replace(/[^a-z]/g, '').includes(kw)));
            return key ? item[key] : '';
        };

        const startTime = findValue(['starttime', '시작시간']);
        if (startTime) {
            validData.push({
                Date: findValue(['date', '날짜']).trim(),
                Place: findValue(['place', '장소']).trim(),
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

    const dates = [...new Set(validData.map(d => d.Date))].sort();
    const allPlaces = [...new Set(validData.map(d => d.Place))].sort();

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

        // 30분 간격 숫자 생성 로직
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
                
                // 🚀 왼쪽 선을 없애고 다시 상단 굵은 선으로 복구
                block.style.borderTop = `5px solid ${color.border}`;
                block.style.borderLeft = `none`;

                const t = currentLang === 'KO' ? (s.Session_KOR || s.Session_ENG) : (s.Session_ENG || s.Session_KOR);
                const spk = currentLang === 'KO' ? s.Speaker_KOR : s.Speaker_ENG;
                const mod = currentLang === 'KO' ? s.Moderator_KOR : s.Moderator_ENG;

                // 🚀 아이콘 삭제
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
    const el = document.getElementById('timetable-content');
    html2pdf().set({
        margin: 0,
        filename: 'timetable.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a3', orientation: 'landscape' }
    }).from(el).save();
};

loadGoogleSheetData();
