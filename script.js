// 시간표 렌더링 설정 (08:00 ~ 19:00 기준, 총 11시간)
const START_HOUR = 8; 
const END_HOUR = 19;
const TOTAL_HOURS = END_HOUR - START_HOUR;

// 장소별 배경색 팔레트 (원하시는 색상 코드로 자유롭게 변경 가능합니다)
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
    const position = ((timeInHours - START_HOUR) / TOTAL_HOURS) * 100;
    return position;
}

async function loadExcelData() {
    try {
        const response = await fetch('timetable.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        renderTimetable(data);
    } catch (error) {
        console.error('엑셀 파일을 불러오는데 실패했습니다.', error);
    }
}

function renderTimetable(data) {
    const wrapper = document.getElementById('timetable-wrapper');
    wrapper.innerHTML = ''; // 초기화
    
    // 장소(Place)별로 중복 없는 배열 생성
    const places = [...new Set(data.map(item => item.Place).filter(Boolean))];
    
    places.forEach((place, index) => {
        // 장소 인덱스에 따라 색상 순차 배정 (색상 개수를 초과하면 다시 처음부터)
        const placeColor = PLACE_COLORS[index % PLACE_COLORS.length];

        // 장소별 칼럼 생성
        const column = document.createElement('div');
        column.className = 'place-column';
        
        // 장소 헤더
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
            
            const block = document.createElement('div');
            block.className = 'session-block';
            
            block.style.top = `calc(40px + ${startPos}%)`; 
            block.style.height = `${height}%`;
            // 장소별 배정된 색상 적용 (엑셀에 Color 열이 있다면 우선 적용)
            block.style.backgroundColor = session.Color || placeColor;
            
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
loadExcelData();
