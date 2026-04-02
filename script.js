// 시간표 렌더링 설정 (08:00 ~ 19:00 기준, 총 11시간)
const START_HOUR = 8; 
const END_HOUR = 19;
const TOTAL_HOURS = END_HOUR - START_HOUR;

// 시간을 분 단위로 변환 후, Y좌표 퍼센티지(%)로 계산하는 함수
function timeToPosition(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const timeInHours = hours + (minutes / 60);
    const position = ((timeInHours - START_HOUR) / TOTAL_HOURS) * 100;
    return position;
}

async function loadExcelData() {
    try {
        // GitHub에 올라간 엑셀 파일 가져오기
        const response = await fetch('timetable.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        
        // SheetJS로 엑셀 파싱
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
    
    // 장소(Place)별로 데이터 그룹화
    const places = [...new Set(data.map(item => item.Place))];
    
    places.forEach(place => {
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
            const startPos = timeToPosition(session.StartTime);
            const endPos = timeToPosition(session.EndTime);
            const height = endPos - startPos;
            
            const block = document.createElement('div');
            block.className = 'session-block';
            
            // 높이와 위치를 % 단위로 절대 지정 (가변형 대응)
            // 헤더 공간(약 40px)을 고려한 계산 로직 필요 시 calc() 활용
            block.style.top = `calc(40px + ${startPos}%)`; 
            block.style.height = `${height}%`;
            block.style.backgroundColor = session.Color || '#ffffff';
            
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
