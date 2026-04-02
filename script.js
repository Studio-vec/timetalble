const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS7LCmxR31uqR0rOOw9xE0smFQnEa7WTGHUJyQXtyHu6Ru1e3Ca32u9b-hL5qFhlu0S5d-rIvQu7d3b/pub?output=csv';

const START_HOUR = 8; 
const END_HOUR = 20;
const TOTAL_HOURS = END_HOUR - START_HOUR;

const PALETTE = [
    { bg: '#fce4ec', border: '#ec407a' }, { bg: '#e3f2fd', border: '#42a5f5' },
    { bg: '#e8f5e9', border: '#66bb6a' }, { bg: '#fff3e0', border: '#ffa726' },
    { bg: '#f3e5f5', border: '#ab47bc' }, { bg: '#e0f7fa', border: '#26c6da' },
    { bg: '#fbe9e7', border: '#ff7043' }
];

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

function fitToScreen() {
    const container = document.querySelector('.a3-container');
    if(window.matchMedia("print").matches) { container.style.transform = 'none'; return; }
    const mmToPx = 3.7795275591;
    const scale = Math.min(window.innerWidth / (420 * mmToPx), window.innerHeight / (297 * mmToPx)) * 0.96; 
    container.style.transform = `scale(${scale})`;
}
window.addEventListener('resize', fitToScreen);

async function loadGoogleSheetData() {
    try {
        const response = await fetch(GOOGLE_SHEET_URL + '&t=' + new Date().getTime());
        const csvText = await response.text();
        Papa.parse(csvText, {
            header: true, skipEmptyLines: true, 
            complete: function(results) { renderTimetable(results.data); setTimeout(fitToScreen, 100); }
        });
    } catch (e) { console.error(e); }
}

function renderTimetable(rawData) {
    const wrapper = document.getElementById('timetable-wrapper');
    wrapper.innerHTML = ''; 
    
    // 데이터 추출 로직 (유령 문자 방어 포함)
    const validData = [];
    rawData.forEach(item => {
        const keys = Object.keys(item);
        const normalize = (str) => str ? str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';
        const findKey = (target) => keys.find(k => normalize(k) === target);
        const startKey = findKey('starttime');
        if (startKey && item[startKey]) {
            validData.push({
                Date: item[findKey('date')] || '오류',
                Place: item[findKey('place')] || '오류',
                StartTime: item[startKey].trim(),
                EndTime: item[findKey('endtime')] || '',
                Session_ENG: item[findKey('sessioneng')] || '',
                Session_KOR: item[findKey('sessionkor')] || '',
                Speaker: item[findKey('speaker')] || '',
                Moderator: item[findKey('moderator')] || ''
            });
        }
    });

    const dates = [...new Set(validData.map(item => item.Date))].sort();

    dates.forEach(date => {
        const dateGroup = document.createElement('div');
        dateGroup.className = 'date-group';
        dateGroup.innerHTML = `<div class="date-header">${date}</div>`;

        const placesContainer = document.createElement('div');
        placesContainer.className = 'places-container';

        // ✨ 30분 간격 시간 축 생성 (날짜 그룹 왼쪽마다 추가)
        const timeAxis = document.createElement('div');
        timeAxis.className = 'time-axis';
        for (let h = START_HOUR; h <= END_HOUR; h++) {
            [0, 30].forEach(m => {
                if (h === END_HOUR && m > 0) return;
                const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                const label = document.createElement('div');
                label.className = 'time-label';
                label.style.top = `${timeToPosition(timeStr)}%`;
                label.innerText = timeStr;
                timeAxis.appendChild(label);
            });
        }
        placesContainer.appendChild(timeAxis);

        const dateData = validData.filter(item => item.Date === date);
        const places = [...new Set(dateData.map(item => item.Place))].sort();
        
        places.forEach((place, index) => {
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
                
                // ✨ 텍스트 수정: 제목-시간-이름나열 (설명 생략)
                block.innerHTML = `
                    <div class="session-title-ko fs-7pt-ko">${escapeHTML(session.Session_KOR)}</div>
                    <div class="session-title-en fs-7pt-en">${escapeHTML(session.Session_ENG)}</div>
                    <div class="session-time fs-5pt">${escapeHTML(session.StartTime)} - ${escapeHTML(session.EndTime)}</div>
                    <div class="session-speakers fs-6pt">
                        ${escapeHTML(session.Speaker)} ${escapeHTML(session.Moderator)}
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

loadGoogleSheetData();
