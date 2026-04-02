// 1. 구글 시트 '수정절대금지' 탭의 CSV 링크를 넣으세요
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS7LCmxR31uqR0rOOw9xE0smFQnEa7WTGHUJyQXtyHu6Ru1e3Ca32u9b-hL5qFhlu0S5d-rIvQu7d3b/pub?gid=528506633&single=true&output=csv';

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

// 시간 -> 위치 계산
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

// 데이터 로드
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
                Date: findValue(['date', '날짜']),
                Place: findValue(['place', '장소']),
                StartTime: startTime.trim(),
                EndTime: findValue(['endtime', '종료시간']),
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
        dateGroup.innerHTML = `<div class="date-header">${date}</div>`;

        const placesContainer = document.createElement('div');
        placesContainer.className = 'places-container';

        // 시간축 생성
        const timeAxis = document.createElement('div');
        timeAxis.className = 'time-axis';
        timeAxis.innerHTML = '<div class="place-header" style="visibility:hidden">Time</div>';
        const timeTrack = document.createElement('div');
        timeTrack.className = 'track-area'; 
        timeTrack.style.backgroundImage = 'none'; // 시간축엔 배경선 제외
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

        // 장소별 컬럼 생성
        allPlaces.forEach((place, idx) => {
            const color = PALETTE[idx % PALETTE.length];
            const col = document.createElement('div');
            col.className = 'place-column';
            col.innerHTML = `<div class="place-header">${place}</div><div class="track-area"></div>`;
            const track = col.querySelector('.track-area');

            validData.filter(d => d.Date === date && d.Place === place).forEach(s => {
                const startPos = timeToPosition(s.StartTime);
                const endPos = timeToPosition(s.EndTime);
                const block = document.createElement('div');
                block.className = 'session-block';
                block.style.top = `${startPos}%`;
                block.style.height = `${endPos - startPos}%`;
                block.style.backgroundColor = color.bg;
                block.style.borderTop = `5px solid ${color.border}`; // 상단 선 두께

                let t = currentLang === 'KO' ? s.Session_KOR : s.Session_ENG;
                let spk = currentLang === 'KO' ? s.Speaker_KOR : s.Speaker_ENG;
                let mod = currentLang === 'KO' ? s.Moderator_KOR : s.Moderator_ENG;

                block.innerHTML = `
                    <div class="session-title">${escapeHTML(t || s.Session_KOR)}</div>
                    <div class="session-time">${s.StartTime} - ${s.EndTime}</div>
                    <div class="session-speakers">
                        ${spk ? `<div class="speaker">${escapeHTML(spk)}</div>` : ''}
                        ${mod ? `<div class="moderator">${escapeHTML(mod)}</div>` : ''}
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

// 이벤트 리스너
document.getElementById('btn-ko').onclick = () => { currentLang = 'KO'; document.getElementById('btn-ko').classList.add('active'); document.getElementById('btn-en').classList.remove('active'); renderTimetable(); };
document.getElementById('btn-en').onclick = () => { currentLang = 'EN'; document.getElementById('btn-en').classList.add('active'); document.getElementById('btn-ko').classList.remove('active'); renderTimetable(); };
document.getElementById('download-pdf-btn').onclick = () => {
    const el = document.getElementById('timetable-content');
    html2pdf().set({ margin: 0, filename: 'timetable.pdf', jsPDF: { format: 'a3', orientation: 'landscape' } }).from(el).save();
};

loadGoogleSheetData();
