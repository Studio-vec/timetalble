// 1. 구글 시트에서 복사한 CSV 링크를 아래 따옴표 안에 붙여넣으세요.
const GOOGLE_SHEET_URL = '여기에_구글시트_CSV_링크를_붙여넣으세요';

// 2. 시간표 렌더링 설정 (08:00 ~ 19:00 기준, 총 11시간)
const START_HOUR = 8; 
const END_HOUR = 19;
const TOTAL_HOURS = END_HOUR - START_HOUR;

// 3. 장소별 배경색 팔레트 (파스텔 톤)
const PLACE_COLORS = [
    '#fce4ec', // 연한 핑크
    '#e3f2fd', // 연한 블루
    '#e8f5e9', // 연한 그린
    '#fff3e0', // 연한 오렌지
    '#f3e5f5', // 연한 퍼플
    '#e0f7fa', // 연한 시안
    '#fbe9e7'  // 연한 코랄
];

// 시간을 분 단위로 변환 후, Y좌표 퍼센티지(%)로 계산하는 함수
function timeToPosition(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const timeInHours = hours + (minutes / 60);
    return ((timeInHours - START_HOUR) / TOTAL_HOURS) * 100;
}

// 꺾쇠괄호 등 특수문자를 일반 문자로 안전하게 바꿔주는 함수 (HTML 깨짐 방지)
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
}

// 구글 시트 데이터(CSV) 불러오기
async function loadGoogleSheetData() {
    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        const csvText = await response.text();
        
        // PapaParse를 이용해 CSV 텍스트를 JSON 배열로 변환
        Papa.parse(csvText, {
            header: true,         // 첫 줄을 헤더(Key)로 사용
            skipEmptyLines: true, // 빈 줄 무시
            complete: function(results) {
                renderTimetable(results.data);
            }
        });
    } catch (error) {
        console.error('구글 시트 데이터를 불러오는데 실패했습니다.', error);
    }
}

// 타임테이블 화면에 그리기
function renderTimetable(data) {
    const wrapper = document.getElementById('timetable-wrapper');
    wrapper.innerHTML = ''; 
    
    // 장소(Place)별로 중복 없는 배열 생성
    const places = [...new Set(data.map(item => item.Place).filter(Boolean))];
    
    places.forEach((place, index) => {
        // 장소 인덱스에 따라 색상 순차 배정
        const placeColor = PLACE_COLORS[index % PLACE_COLORS.length];

        // 장소별 칼럼 생성
        const column = document.createElement('div');
        column.className = 'place-column';
        
        // 장소 헤더 생성
        const header = document.createElement('div');
        header.className = 'place-header';
        header.innerText = place;
        column.appendChild(header);
        
        // 해당 장소의 세션 필터링
        const sessions = data.filter(item => item.Place === place);
        
        sessions.forEach(session => {
            if(!session.StartTime || !session.EndTime) return;

            const startPos = timeToPosition(session.StartTime);
            const endPos = timeToPosition(session.EndTime);
            const height = endPos - startPos;
            
            // 개별 세션 블록 생성
            const block = document.createElement('div');
            block.className = 'session-block';
            
            // 위치와 높이 지정 (장소 헤더 공간 높이를 고려하여 여유 공간 확보)
            block.style.top = `calc(50px + ${startPos}%)`; 
            block.style.height = `${height}%`;
            block.style.backgroundColor = placeColor;
            
            // 데이터 삽입 (escapeHTML 함수를 거쳐 안전하게 렌더링)
            block.innerHTML = `
                <div class="session-time">${escapeHTML(session.StartTime)} - ${escapeHTML(session.EndTime)}</div>
                <div class="session-title-ko">${escapeHTML(session.Session_KOR)}</div>
                <div class="session-title-en">${escapeHTML(session.Session_ENG)}</div>
                <div class="session-speakers">
                    ${session.Speaker ? `연사: ${escapeHTML(session.Speaker)}\n` : ''}
                    ${session.Moderator ? `모더레이터: ${escapeHTML(session.Moderator)}` : ''}
                </div>
            `;
            column.appendChild(block);
        });
        
        wrapper.appendChild(column);
    });
}

// 스크립트 실행
loadGoogleSheetData();
