// 1. 구글 시트 링크
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS7LCmxR31uqR0rOOw9xE0smFQnEa7WTGHUJyQXtyHu6Ru1e3Ca32u9b-hL5qFhlu0S5d-rIvQu7d3b/pub?output=csv';

// 2. 시간표 설정 (08:00 ~ 20:00, 총 12시간)
const START_HOUR = 8; 
const END_HOUR = 20;
const TOTAL_HOURS = END_HOUR - START_HOUR;

// ✨ 요청사항: 배경색(bg)과 5px 상단 띠의 색상(border - 명도 낮고 채도 높은 선명한 색) 페어링
const PALETTE = [
    { bg: '#fce4ec', border: '#ec407a' }, // 핑크
    { bg: '#e3f2fd', border: '#42a5f5' }, // 블루
    { bg: '#e8f5e9', border: '#66bb6a' }, // 그린
    { bg: '#fff3e0', border: '#ffa726' }, // 오렌지
    { bg: '#f3e5f5', border: '#ab47bc' }, // 퍼플
    { bg: '#e0f7fa', border: '#26c6da' }, // 시안
    { bg: '#fbe9e7', border: '#ff7043' }  // 코랄
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

// ✨ 추가 로직: 브라우저 창 크기에 맞춰 A3 사이즈를 찌그러짐 없이 '이미지처럼' 확대/축소
function fitToScreen() {
    const container = document.querySelector('.a3-container');
    if(window.matchMedia("print").matches) {
        container.style.transform = 'none';
        return;
    }
    // A3 크기(420mm x 297mm)를 픽셀로 환산 (약 1587px x 1122px)
    const mmToPx = 3.7795275591;
    const a3Width = 420 * mmToPx;
    const a3Height = 297 * mmToPx;

    const scaleX = window.innerWidth / a3Width;
    const scaleY = window.innerHeight / a3Height;
    // 가로, 세로 중 더 꽉 차는 쪽을 기준으로 96% 비율로 스케일링 (살짝 여백 두기)
    const scale = Math.min(scaleX, scaleY) * 0.96; 

    container.style.transform = `scale(${scale})`;
}
// 창 크기가 바뀔 때마다 스케일링 재설정
window.addEventListener('resize', fitToScreen);

async function loadGoogleSheetData() {
    try {
        const noCacheUrl = GOOGLE_SHEET_URL + '&t=' + new Date().getTime();
        const response = await fetch(noCacheUrl);
        const csvText = await response.text();
        
        Papa.parse(csvText, {
            header: true,         
            skipEmptyLines: true, 
            complete: function(results) {
                renderTimetable(results.data);
                // 렌더링 완료 후 스케일링 즉시 적용
                setTimeout(fitToScreen, 100); 
            }
        });
    } catch (error) {
        console.error('구글 시트 데이터를 불러오는데 실패했습니다.', error);
    }
}

function renderTimetable(rawData) {
    const wrapper = document.getElementById('timetable-wrapper');
    wrapper.innerHTML = ''; 
    
    const validData = [];
    
    rawData.forEach(item => {
        const keys = Object.keys(item);
        const normalize = (str) => str ? str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';
        const findKey = (target) => keys.find(k => normalize(k) === target);

        const dateKey = findKey('date');
        const placeKey = findKey('place');
        const startKey = findKey('starttime');
        const endKey = findKey('endtime');

        if (startKey && item[startKey] && item[startKey].trim() !== '') {
            validData.push({
                Date: (dateKey && item[dateKey]) ? item[dateKey].trim() : '오류',
                Place: (placeKey && item[placeKey]) ? item[placeKey].trim() : '오류',
                StartTime: item[startKey].trim(),
                EndTime: (endKey && item[endKey]) ? item[endKey].trim() : '',
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

        const dateHeader = document.createElement('div');
        dateHeader.className = 'date-header';
        dateHeader.innerText = date;
        dateGroup.appendChild(dateHeader);

        const placesContainer = document.createElement('div');
        placesContainer.className = 'places-container';

        const dateData = validData.filter(item => item.Date === date);
        const places = [...new Set(dateData.map(item => item.Place))].sort();
        
        places.forEach((place, index) => {
            // 장소 순서에 맞는 팔레트 쌍(배경색, 테두리색) 추출
            const colorSet = PALETTE[index % PALETTE.length];

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
                if(!session.StartTime || !session.EndTime) return;

                const startPos = timeToPosition(session.StartTime);
                const endPos = timeToPosition(session.EndTime);
                const height = endPos - startPos;
                
                const block = document.createElement('div');
                block.className = 'session-block';
                
                block.style.top = `${startPos}%`; 
                block.style.height = `${height}%`;
                // 연한 배경색
                block.style.backgroundColor = colorSet.bg;
                // ✨ 상단 5px 진한 포인트 컬러 선 추가
                block.style.borderTop = `5px solid ${colorSet.border}`;
                
                // ✨ 텍스트 순서 변경: 제목 -> 시간 -> 연사 -> 모더레이터 (세션 번호 제외)
                block.innerHTML = `
                    <div class="session-title-ko fs-7pt-ko">${escapeHTML(session.Session_KOR)}</div>
                    <div class="session-title-en fs-7pt-en">${escapeHTML(session.Session_ENG)}</div>
                    <div class="session-time fs-5pt">${escapeHTML(session.StartTime)} - ${escapeHTML(session.EndTime)}</div>
                    <div class="session-speakers fs-6pt">
                        ${session.Speaker ? `연사: ${escapeHTML(session.Speaker)}<br>` : ''}
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
