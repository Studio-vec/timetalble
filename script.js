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

// ✨ 언어 상태 변수 (기본값 KOR)
let currentLang = 'KO';
// 구글 시트 데이터를 저장해둘 전역 변수 (언어 전환 시 다시 다운받지 않기 위함)
let globalRawData = [];

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
        const response = await fetch(GOOGLE_SHEET_URL + '&t=' + new Date().getTime());
        const csvText = await response.text();
        Papa.parse(csvText, {
            header: true, skipEmptyLines: true, 
            complete: function(results) { 
                globalRawData = results.data; // 데이터 저장
                renderTimetable(); // 최초 렌더링
            }
        });
    } catch (e) { console.error(e); }
}

function renderTimetable() {
    const wrapper = document.getElementById('timetable-wrapper');
    wrapper.innerHTML = ''; 
    
    const validData = [];
    globalRawData.forEach(item => {
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
    const allPlaces = [...new Set(validData.map(item => item.Place))].sort();

    dates.forEach(date => {
        const dateGroup = document.createElement('div');
        dateGroup.className = 'date-group';
        dateGroup.innerHTML = `<div class="date-header">${date}</div>`;

        const placesContainer = document.createElement('div');
        placesContainer.className = 'places-container';

        // 30분 간격 시간 축 생성
        const timeAxis = document.createElement('div');
        timeAxis.className = 'time-axis';
        
        const dummyHeader = document.createElement('div');
        dummyHeader.className = 'place-header';
        dummyHeader.style.visibility = 'hidden'; 
        dummyHeader.innerHTML = '시간';
        timeAxis.appendChild(dummyHeader);

        const timeTrack = document.createElement('div');
        timeTrack.style.position = 'relative';
        timeTrack.style.flex = '1';

        for (let h = START_HOUR; h <= END_HOUR; h++) {
            [0, 30].forEach(m => {
                if (h === END_HOUR && m > 0) return;
                const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                const label = document.createElement('div');
                label.className = 'time-label';
                label.style.top = `${timeToPosition(timeStr)}%`;
                label.innerText = timeStr;
                timeTrack.appendChild(label);
            });
        }
        
        timeAxis.appendChild(timeTrack);
        placesContainer.appendChild(timeAxis);

        const dateData = validData.filter(item => item.Date === date);
        
        allPlaces.forEach((place, index) => {
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
                
                // ✨ 언어에 따른 타이틀 선택 로직
                let displayTitle = currentLang === 'KO' ? session.Session_KOR : session.Session_ENG;
                // 만약 선택한 언어의 제목이 비어있다면, 다른 언어 제목으로 대체 (빈칸 방지)
                if (!displayTitle || displayTitle.trim() === '') {
                    displayTitle = currentLang === 'KO' ? session.Session_ENG : session.Session_KOR;
                }
                
                block.innerHTML = `
                    <div class="session-title fs-7pt-title">${escapeHTML(displayTitle)}</div>
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

// ✨ 언어 토글 버튼 이벤트
document.getElementById('btn-ko').addEventListener('click', () => {
    currentLang = 'KO';
    document.getElementById('btn-ko').classList.add('active');
    document.getElementById('btn-en').classList.remove('active');
    renderTimetable(); // 화면 즉시 업데이트
});

document.getElementById('btn-en').addEventListener('click', () => {
    currentLang = 'EN';
    document.getElementById('btn-en').classList.add('active');
    document.getElementById('btn-ko').classList.remove('active');
    renderTimetable(); // 화면 즉시 업데이트
});

// PDF 다운로드 버튼 이벤트
document.getElementById('download-pdf-btn').addEventListener('click', () => {
    const btn = document.getElementById('download-pdf-btn');
    const originalText = btn.innerText;
    btn.innerText = "PDF 생성 중...";
    btn.disabled = true;

    const element = document.getElementById('timetable-content');
    const opt = {
        margin:       0,
        filename:     currentLang === 'KO' ? 'Timetable_KOR.pdf' : 'Timetable_ENG.pdf', // 파일명도 언어별로 다르게 지정
        image:        { type: 'jpeg', quality: 1 }, 
        html2canvas:  { scale: 2, useCORS: true }, 
        jsPDF:        { unit: 'mm', format: 'a3', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        btn.innerText = originalText;
        btn.disabled = false;
    });
});

loadGoogleSheetData();
