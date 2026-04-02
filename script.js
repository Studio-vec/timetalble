// 1. 구글 시트 링크
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS7LCmxR31uqR0rOOw9xE0smFQnEa7WTGHUJyQXtyHu6Ru1e3Ca32u9b-hL5qFhlu0S5d-rIvQu7d3b/pub?output=csv';

// 2. 시간표 설정 (08:00 ~ 19:00)
const START_HOUR = 8; 
const END_HOUR = 19;
const TOTAL_HOURS = END_HOUR - START_HOUR;

const PLACE_COLORS = [
    '#fce4ec', '#e3f2fd', '#e8f5e9', '#fff3e0', '#f3e5f5', '#e0f7fa', '#fbe9e7'
];

function timeToPosition(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const timeInHours = hours + (minutes / 60);
    return ((timeInHours - START_HOUR) / TOTAL_HOURS) * 100;
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

async function loadGoogleSheetData() {
    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        const csvText = await response.text();
        
        Papa.parse(csvText, {
            header: true,         
            skipEmptyLines: true, 
            complete: function(results) {
                renderTimetable(results.data);
            }
        });
    } catch (error) {
        console.error('구글 시트 데이터를 불러오는데 실패했습니다.', error);
    }
}

function renderTimetable(data) {
    const wrapper = document.getElementById('timetable-wrapper');
    wrapper.innerHTML = ''; 
    
    // 데이터 보정: 날짜나 장소가 비어있으면 '미지정'으로 처리하여 겹침 방지
    const safeData = data.map(item => ({
        ...item,
        Date: item.Date ? item.Date.trim() : '날짜 미지정',
        Place: item.Place ? item.Place.trim() : '장소 미지정'
    }));

    // 1단계: 날짜 추출
    const dates = [...new Set(safeData.map(item => item.Date))].sort();

    dates.forEach(date => {
        const dateGroup = document.createElement('div');
        dateGroup.className = 'date-group';

        const dateHeader = document.createElement('div');
        dateHeader.className = 'date-header';
        dateHeader.innerText = date;
        dateGroup.appendChild(dateHeader);

        const placesContainer = document.createElement('div');
        placesContainer.className = 'places-container';

        const dateData = safeData.filter(item => item.Date === date);
        const places = [...new Set(dateData.map(item => item.Place))];
        
        places.forEach((place, index) => {
            const placeColor = PLACE_COLORS[index % PLACE_COLORS.length];

            const column = document.createElement('div');
            column.className = 'place-column';
            
            const header = document.createElement('div');
            header.className = 'place-header';
            header.innerText = place;
            column.appendChild(header);
            
            const trackArea = document.createElement('div');
            trackArea.className = 'track-area';
            column.appendChild(trackArea);

            const sessions = dateData.filter(item => item.Place === place);
            
            sessions.forEach(session => {
                // 시작/종료 시간이 없으면 그리지 않음
                if(!session.StartTime || !session.EndTime) return;

                const startPos = timeToPosition(session.StartTime);
                const endPos = timeToPosition(session.EndTime);
                const height = endPos - startPos;
                
                const block = document.createElement('div');
                block.className = 'session-block';
                
                block.style.top = `${startPos}%`; 
                block.style.height = `${height}%`;
                block.style.backgroundColor = placeColor;
                
                block.innerHTML = `
                    <div class="session-time">${escapeHTML(session.StartTime)} - ${escapeHTML(session.EndTime)}</div>
                    <div class="session-title-ko">${escapeHTML(session.Session_KOR || '')}</div>
                    <div class="session-title-en">${escapeHTML(session.Session_ENG || '')}</div>
                    <div class="session-speakers">
                        ${session.Speaker ? `연사: ${escapeHTML(session.Speaker)}\n` : ''}
                        ${session.Moderator ? `모더레이터: ${escapeHTML(session.Moderator)}` : ''}
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

// 스크립트 실행
loadGoogleSheetData();
