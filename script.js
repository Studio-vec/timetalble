const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS7LCmxR31uqR0rOOw9xE0smFQnEa7WTGHUJyQXtyHu6Ru1e3Ca32u9b-hL5qFhlu0S5d-rIvQu7d3b/pub?output=csv';

const START_HOUR = 8; 
const END_HOUR = 20;
const TOTAL_HOURS = END_HOUR - START_HOUR;

const PALETTE = [
    { bg: '#999999', border: '#777777' }, { bg: '#999999', border: '#777777' },
    { bg: '#999999', border: '#777777' }, { bg: '#999999', border: '#777777' },
    { bg: '#999999', border: '#777777' }, { bg: '#999999', border: '#777777' },
    { bg: '#999999', border: '#777777' }
];

const urlParams = new URLSearchParams(window.location.search);
let currentLang = (urlParams.get('lang') === 'en') ? 'EN' : 'KO';
let globalRawData = [];

if (currentLang === 'EN') {
    document.getElementById('btn-en').classList.add('active');
    document.getElementById('btn-ko').classList.remove('active');
}

function timeToPosition(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const timeInHours = hours + (minutes / 60);
    return ((timeInHours - START_HOUR) / TOTAL_HOURS) * 100;
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
            header: true, skipEmptyLines: true, 
            complete: function(results) { 
                globalRawData = results.data; 
                renderTimetable(); 
            }
        });
    } catch (e) { console.error(e); }
}

function renderTimetable() {
    const wrapper = document.getElementById('timetable-wrapper');
    wrapper.innerHTML = ''; 
    
    const validData = [];
    globalRawData.forEach(item => {
        const keys = Object.keys(item);
        const normalize = (str) => str ? str.replace(/[^a-zA-Z0-9가-힣]/g, '').toLowerCase() : '';
        const findKey = (target) => keys.find(k => normalize(k).includes(target));

        const startKey = findKey('starttime');
        const statusKey = findKey('status') || findKey('공개');

        if (startKey && item[startKey]) {
            const statusValue = statusKey ? item[statusKey].trim() : '공개';
            
            if (statusValue === '공개') {
                validData.push({
                    Date: item[findKey('date')] || '오류',
                    Place: item[findKey('place')] || '오류',
                    StartTime: item[startKey].trim(),
                    EndTime: item[findKey('endtime')] || '',
                    Session_ENG: item[findKey('sessioneng')] || '',
                    Session_KOR: item[findKey('sessionkor')] || '',
                    // ✨ 연사 및 모더레이터 국/영문 분리
                    Speaker_KOR: item[findKey('speakerkor')] || '',
                    Speaker_ENG: item[findKey('speakereng')] || '',
                    Moderator_KOR: item[findKey('moderatorkor')] || '',
                    Moderator_ENG: item[findKey('moderatoreng')] || ''
                });
            }
        }
    });

    const dates = [...new Set(validData.map(item => item.Date))].sort();
    const allPlaces = [...new Set(validData.map(item => item.Place))].sort();

    dates.forEach(date => {
        const dateGroup = document.createElement('div');
        dateGroup.className = 'date-group';
        dateGroup.innerHTML = `<div class="date-header">${date}</div>`;

        const placesContainer = document.createElement('div');
        placesContainer.className = 'places-container';

        const timeAxis = document.createElement('div');
        timeAxis.className = 'time-axis';
        
        const dummyHeader = document.createElement('div');
        dummyHeader.className = 'place-header';
        dummyHeader.style.visibility = 'hidden'; 
        dummyHeader.innerHTML = '시간';
        timeAxis.appendChild(dummyHeader);

        const timeTrack = document.createElement('div');
        timeTrack.style.position = 'relative';
        timeTrack.style.flex = '1';

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
                
                // 세션 제목 토글
                let displayTitle = currentLang === 'KO' ? session.Session_KOR : session.Session_ENG;
                if (!displayTitle || displayTitle.trim() === '') displayTitle = currentLang === 'KO' ? session.Session_ENG : session.Session_KOR;
                
                // ✨ 연사 이름 토글 (빈칸이면 다른 언어로 대체)
                let displaySpeaker = currentLang === 'KO' ? session.Speaker_KOR : session.Speaker_ENG;
                if (!displaySpeaker || displaySpeaker.trim() === '') displaySpeaker = currentLang === 'KO' ? session.Speaker_ENG : session.Speaker_KOR;
                
                // ✨ 모더레이터 이름 토글 (빈칸이면 다른 언어로 대체)
                let displayModerator = currentLang === 'KO' ? session.Moderator_KOR : session.Moderator_ENG;
                if (!displayModerator || displayModerator.trim() === '') displayModerator = currentLang === 'KO' ? session.Moderator_ENG : session.Moderator_KOR;
                
                block.innerHTML = `
                    <div class="session-title fs-7pt-title">${escapeHTML(displayTitle)}</div>
                    <div class="session-time fs-5pt">${escapeHTML(session.StartTime)} - ${escapeHTML(session.EndTime)}</div>
                    <div class="session-speakers fs-6pt">
                        ${escapeHTML(displaySpeaker)} ${escapeHTML(displayModerator)}
                    </div>
                `;
                trackArea.appendChild(block);
            });
            placesContainer.appendChild(column);
        });
        dateGroup.appendChild(placesContainer);
        wrapper.appendChild(dateGroup);
    });
}

document.getElementById('btn-ko').addEventListener('click', () => {
    currentLang = 'KO';
    document.getElementById('btn-ko').classList.add('active');
    document.getElementById('btn-en').classList.remove('active');
    renderTimetable(); 
});

document.getElementById('btn-en').addEventListener('click', () => {
    currentLang = 'EN';
    document.getElementById('btn-en').classList.add('active');
    document.getElementById('btn-ko').classList.remove('active');
    renderTimetable(); 
});

document.getElementById('download-pdf-btn').addEventListener('click', () => {
    const btn = document.getElementById('download-pdf-btn');
    const originalText = btn.innerText;
    btn.innerText = "PDF 생성 중...";
    btn.disabled = true;

    const element = document.getElementById('timetable-content');
    const opt = {
        margin:       0,
        filename:     currentLang === 'KO' ? 'Timetable_KOR.pdf' : 'Timetable_ENG.pdf',
        image:        { type: 'jpeg', quality: 1 }, 
        html2canvas:  { scale: 2, useCORS: true }, 
        jsPDF:        { unit: 'mm', format: 'a3', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        btn.innerText = originalText;
        btn.disabled = false;
    });
});

loadGoogleSheetData();
