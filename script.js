const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS7LCmxR31uqR0rOOw9xE0smFQnEa7WTGHUJyQXtyHu6Ru1e3Ca32u9b-hL5qFhlu0S5d-rIvQu7d3b/pub?gid=528506633&single=true&output=csv';

const START_HOUR = 8; 
const END_HOUR = 20;
const TOTAL_HOURS = END_HOUR - START_HOUR;

const PALETTE = [
    { bg: '#fce4ec', border: '#ec407a' }, { bg: '#e3f2fd', border: '#42a5f5' },
    { bg: '#e8f5e9', border: '#66bb6a' }, { bg: '#fff3e0', border: '#ffa726' },
    { bg: '#f3e5f5', border: '#ab47bc' }, { bg: '#e0f7fa', border: '#26c6da' },
    { bg: '#fbe9e7', border: '#ff7043' }
];

const urlParams = new URLSearchParams(window.location.search);
let currentLang = (urlParams.get('lang') === 'en') ? 'EN' : 'KO';
let globalRawData = [];

// 초기 버튼 스타일
window.onload = () => {
    if (currentLang === 'EN') {
        document.getElementById('btn-en')?.classList.add('active');
        document.getElementById('btn-ko')?.classList.remove('active');
    }
};

function timeToPosition(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const timeInHours = hours + (minutes / 60);
    return Math.max(0, Math.min(100, ((timeInHours - START_HOUR) / TOTAL_HOURS) * 100));
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

async function loadGoogleSheetData() {
    try {
        const response = await fetch(GOOGLE_SHEET_URL + '&t=' + new Date().getTime());
        const csvText = await response.text();
        
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                if (results.data && results.data.length > 0) {
                    globalRawData = results.data;
                    renderTimetable();
                } else {
                    console.error("데이터가 비어있습니다.");
                }
            }
        });
    } catch (e) { console.error("데이터 로드 실패:", e); }
}

function renderTimetable() {
    const wrapper = document.getElementById('timetable-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = ''; 
    
    const validData = [];
    
    globalRawData.forEach(item => {
        const keys = Object.keys(item);
        // ✨ 어떤 이름으로 되어있든 키워드만 있으면 찾아내는 로직
        const findValue = (keywords) => {
            const key = keys.find(k => keywords.some(kw => k.toLowerCase().replace(/[^a-z]/g, '').includes(kw)));
            return key ? item[key] : '';
        };

        const startTime = findValue(['start', '시작']);
        
        if (startTime && startTime.trim() !== '') {
            validData.push({
                Date: findValue(['date', '날짜']) || '미지정',
                Place: findValue(['place', '장소']) || '미지정',
                StartTime: startTime.trim(),
                EndTime: findValue(['end', '종료']) || '',
                Session_ENG: findValue(['sessioneng', '세션영']) || '',
                Session_KOR: findValue(['sessionkor', '세션국']) || '',
                Speaker_KOR: findValue(['speakerkor', '연사국']) || '',
                Speaker_ENG: findValue(['speakereng', '연사영']) || '',
                Moderator_KOR: findValue(['moderatorkor', '모더국']) || '',
                Moderator_ENG: findValue(['moderatoreng', '모더영']) || ''
            });
        }
    });

    if (validData.length === 0) {
        wrapper.innerHTML = '<div style="padding: 20px;">표시할 "공개" 데이터가 없습니다.</div>';
        return;
    }

    const dates = [...new Set(validData.map(item => item.Date))].sort();
    const allPlaces = [...new Set(validData.map(item => item.Place))].sort();

    dates.forEach(date => {
        const dateGroup = document.createElement('div');
        dateGroup.className = 'date-group';
        dateGroup.innerHTML = `<div class="date-header">${date}</div>`;

        const placesContainer = document.createElement('div');
        placesContainer.className = 'places-container';

        // 시간 축
        const timeAxis = document.createElement('div');
        timeAxis.className = 'time-axis';
        const dummyHeader = document.createElement('div');
        dummyHeader.className = 'place-header';
        dummyHeader.style.visibility = 'hidden'; dummyHeader.innerHTML = '시간';
        timeAxis.appendChild(dummyHeader);
        const timeTrack = document.createElement('div');
        timeTrack.style.position = 'relative'; timeTrack.style.flex = '1';
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

        const dateData = validData.filter(item => item.Date === date);
        
        allPlaces.forEach((place, index) => {
            const colorSet = PALETTE[index % PALETTE.length];
            const column = document.createElement('div');
            column.className = 'place-column';
            column.innerHTML = `<div class="place-header">${place}</div><div class="track-area"></div>`;
            const trackArea = column.querySelector('.track-area');

            dateData.filter(d => d.Place === place).forEach(session => {
                const startPos = timeToPosition(session.StartTime);
                const endPos = timeToPosition(session.EndTime);
                const block = document.createElement('div');
                block.className = 'session-block';
                block.style.top = `${startPos}%`; 
                block.style.height = `${endPos - startPos}%`;
                block.style.backgroundColor = colorSet.bg;
                block.style.borderTop = `5px solid ${colorSet.border}`;
                
                let title = currentLang === 'KO' ? session.Session_KOR : session.Session_ENG;
                if (!title) title = session.Session_KOR || session.Session_ENG;
                
                let speaker = currentLang === 'KO' ? session.Speaker_KOR : session.Speaker_ENG;
                if (!speaker) speaker = session.Speaker_KOR || session.Speaker_ENG;
                
                let mod = currentLang === 'KO' ? session.Moderator_KOR : session.Moderator_ENG;
                if (!mod) mod = session.Moderator_KOR || session.Moderator_ENG;

                block.innerHTML = `
                    <div class="session-title fs-7pt-title">${escapeHTML(title)}</div>
                    <div class="session-time fs-5pt">${escapeHTML(session.StartTime)} - ${escapeHTML(session.EndTime)}</div>
                    <div class="session-speakers fs-6pt">${escapeHTML(speaker)} ${escapeHTML(mod)}</div>
                `;
                trackArea.appendChild(block);
            });
            placesContainer.appendChild(column);
        });
        dateGroup.appendChild(placesContainer);
        wrapper.appendChild(dateGroup);
    });
}

// 버튼 리스너
document.getElementById('btn-ko')?.addEventListener('click', () => { currentLang = 'KO'; renderTimetable(); document.getElementById('btn-ko').classList.add('active'); document.getElementById('btn-en').classList.remove('active'); });
document.getElementById('btn-en')?.addEventListener('click', () => { currentLang = 'EN'; renderTimetable(); document.getElementById('btn-en').classList.add('active'); document.getElementById('btn-ko').classList.remove('active'); });

document.getElementById('download-pdf-btn')?.addEventListener('click', () => {
    const element = document.getElementById('timetable-content');
    const opt = { margin: 0, filename: 'timetable.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a3', orientation: 'landscape' } };
    html2pdf().set(opt).from(element).save();
});

loadGoogleSheetData();
