// 1. 구글 시트 링크
const GOOGLE_SHEET_URL = '여기에_구글시트_CSV_링크를_붙여넣으세요';

// 2. 시간표 설정 (08:00 ~ 20:00, 총 12시간)
const START_HOUR = 8; 
const END_HOUR = 20;
const TOTAL_HOURS = END_HOUR - START_HOUR;

// 장소별 배경색 팔레트 (파스텔 톤)
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

    // 1단계: 전체 데이터에서 중복 없는 '날짜(Date)' 배열 추출 및 정렬
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
        // 2단계: 해당 날짜에 존재하는 '장소(Place)' 배열 추출
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
                
                // ✨ 요청하신 pt 단위 폰트 클래스 적용
                block.innerHTML = `
                    <div class="session-time fs-5pt">${escapeHTML(session.StartTime)} - ${escapeHTML(session.EndTime)}</div>
                    <div class="session-title-ko fs-7pt-ko">${escapeHTML(session.Session_KOR || '')}</div>
                    <div class="session-title-en fs-7pt-en">${escapeHTML(session.Session_ENG || '')}</div>
                    <div class="session-speakers fs-6pt">
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
