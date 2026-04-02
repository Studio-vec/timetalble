// 1. 구글 시트 링크 (복사해주신 링크 그대로 적용했습니다)
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS7LCmxR31uqR0rOOw9xE0smFQnEa7WTGHUJyQXtyHu6Ru1e3Ca32u9b-hL5qFhlu0S5d-rIvQu7d3b/pub?output=csv';

// 2. 시간표 설정 (08:00 ~ 20:00, 총 12시간)
const START_HOUR = 8; 
const END_HOUR = 20;
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
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

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
            }
        });
    } catch (error) {
        console.error('구글 시트 데이터를 불러오는데 실패했습니다.', error);
    }
}

function renderTimetable(rawData) {
    const wrapper = document.getElementById('timetable-wrapper');
    wrapper.innerHTML = ''; 
    
    // ✨ 핵심 보완: 눈에 보이지 않는 유령 문자, 공백, 대소문자를 모두 무시하는 강력한 추출기
    const validData = [];
    
    rawData.forEach(item => {
        const keys = Object.keys(item);
        // 알파벳과 숫자만 추출해 소문자로 변환 (예: "[유령문자] Date " -> "date")
        const normalize = (str) => str ? str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';
        
        // 정확한 알파벳 키워드가 포함된 열을 강제로 찾는 함수
        const findKey = (target) => keys.find(k => normalize(k) === target);

        const dateKey = findKey('date');
        const placeKey = findKey('place');
        const startKey = findKey('starttime');
        const endKey = findKey('endtime');

        // 시작 시간이 비어있지 않은 정상적인 행만 취합합니다.
        if (startKey && item[startKey] && item[startKey].trim() !== '') {
            validData.push({
                Date: (dateKey && item[dateKey]) ? item[dateKey].trim() : '날짜 오류',
                Place: (placeKey && item[placeKey]) ? item[placeKey].trim() : '장소 오류',
                StartTime: item[startKey].trim(),
                EndTime: (endKey && item[endKey]) ? item[endKey].trim() : '',
                Session_ENG: item[findKey('sessioneng')] || '',
                Session_KOR: item[findKey('sessionkor')] || '',
                Speaker: item[findKey('speaker')] || '',
                Moderator: item[findKey('moderator')] || ''
            });
        }
    });

    // 1단계: 전체 데이터에서 중복 없는 '날짜(Date)' 배열 추출 및 오름차순 정렬
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
        
        // 2단계: 장소(Place) 배열 추출 및 정렬 (가나다/알파벳 순으로 예쁘게 배치)
        const places = [...new Set(dateData.map(item => item.Place))].sort();
        
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
