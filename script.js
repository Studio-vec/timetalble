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
    
    // 1단계: 전체 데이터에서 중복 없는 '날짜(Date)' 배열 추출 및 정렬
    const dates = [...new Set(data.map(item => item.Date).filter(Boolean))].sort();

    // 각 날짜별로 컨테이너 생성
    dates.forEach(date => {
        const dateGroup = document.createElement('div');
        dateGroup.className = 'date-group';

        // 날짜 헤더 생성 (예: 09-09)
        const dateHeader = document.createElement('div');
        dateHeader.className = 'date-header';
        dateHeader.innerText = date;
        dateGroup.appendChild(dateHeader);

        // 해당 날짜의 장소들을 묶을 컨테이너 생성
        const placesContainer = document.createElement('div');
        placesContainer.className = 'places-container';

        // 해당 날짜의 데이터만 필터링
        const dateData = data.filter(item => item.Date === date);
        
        // 2단계: 해당 날짜에 존재하는 '장소(Place)' 배열 추출
        const places = [...new Set(dateData.map(item => item.Place).filter(Boolean))];
        
        places.forEach((place, index) => {
            const placeColor = PLACE_COLORS[index % PLACE_COLORS.length];

            const column = document.createElement('div');
            column.className = 'place-column';
            
            // 장소 헤더
            const header = document.createElement('div');
            header.className = 'place-header';
            header.innerText = place;
            column.appendChild(header);
            
            // ✨ 3단계: 세션이 배치될 타임라인 트랙 영역 생성
            const trackArea = document.createElement('div');
            trackArea.className = 'track-area';
            column.appendChild(trackArea);

            // 해당 날짜 + 해당 장소의 세션만 필터링
            const sessions = dateData.filter(item => item.Place === place);
            
            sessions.forEach(session => {
                if(!session.StartTime || !session.EndTime) return;

                const startPos = timeToPosition(session.StartTime);
                const endPos = timeToPosition(session.EndTime);
                const height = endPos - startPos;
                
                const block = document.createElement('div');
                block.className = 'session-block';
                
                // trackArea 컨테이너를 기준으로 하므로 %만 쓰면 완벽하게 들어맞습니다.
                block.style.top = `${startPos}%`; 
                block.style.height = `${height}%`;
                block.style.backgroundColor = placeColor;
                
                block.innerHTML = `
                    <div class="session-time">${escapeHTML(session.StartTime)} - ${escapeHTML(session.EndTime)}</div>
                    <div class="session-title-ko">${escapeHTML(session.Session_KOR)}</div>
                    <div class="session-title-en">${escapeHTML(session.Session_ENG)}</div>
                    <div class="session-speakers">
                        ${session.Speaker ? `연사: ${escapeHTML(session.Speaker)}\n` : ''}
                        ${session.Moderator ? `모더레이터: ${escapeHTML(session.Moderator)}` : ''}
                    </div>
                `;
                // 트랙 영역 안에 세션 추가
                trackArea.appendChild(block);
            });
            
            placesContainer.appendChild(column);
        });

        // 날짜 그룹 안에 장소 컨테이너 삽입, 전체 래퍼에 날짜 그룹 삽입
        dateGroup.appendChild(placesContainer);
        wrapper.appendChild(dateGroup);
    });
}

// 스크립트 실행
loadGoogleSheetData();
