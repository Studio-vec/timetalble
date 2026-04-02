// 1단계에서 복사한 구글 시트 CSV 링크를 아래 따옴표 안에 붙여넣으세요.
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1v.../pub?output=csv';

// 시간표 렌더링 설정 (08:00 ~ 19:00 기준)
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

// 구글 시트 데이터 불러오기
async function loadGoogleSheetData() {
    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        const csvText = await response.text();
        
        // PapaParse를 이용해 CSV 텍스트를 JSON 배열로 변환
        Papa.parse(csvText, {
            header: true,         // 첫 줄을 헤더(Key)로 사용
            skipEmptyLines: true, // 빈 줄 무시
            complete: function(results) {
                // 변환된 데이터(results.data)를 렌더링 함수로 전달
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
    
    // 장소(Place)별로 중복 없는 배열 생성
    const places = [...new Set(data.map(item => item.Place).filter(Boolean))];
    
    places.forEach((place, index) => {
        const placeColor = PLACE_COLORS[index % PLACE_COLORS.length];

        const column = document.createElement('div');
        column.className = 'place-column';
        
        const header = document.createElement('div');
        header.className = 'place-header';
        header.innerText = place;
        column.appendChild(header);
        
        const sessions = data.filter(item => item.Place === place);
        
        sessions.forEach(session => {
            if(!session.StartTime || !session.EndTime) return;

            const startPos = timeToPosition(session.StartTime);
            const endPos = timeToPosition(session.EndTime);
            const height = endPos - startPos;
            
            const block = document.createElement('div');
            block.className = 'session-block';
            
            block.style.top = `calc(40px + ${startPos}%)`; 
            block.style.height = `${height}%`;
            block.style.backgroundColor = placeColor;
            
            block.innerHTML = `
                <div class="session-time">${session.StartTime} - ${session.EndTime}</div>
                <div class="session-title-ko">${session.Session_KOR || ''}</div>
                <div class="session-title-en">${session.Session_ENG || ''}</div>
                <div class="session-speakers">
                    ${session.Speaker ? `연사: ${session.Speaker}<br>` : ''}
                    ${session.Moderator ? `모더레이터: ${session.Moderator}` : ''}
                </div>
            `;
            column.appendChild(block);
        });
        
        wrapper.appendChild(column);
    });
}

// 스크립트 실행
loadGoogleSheetData();
