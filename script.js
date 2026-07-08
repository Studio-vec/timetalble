const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQWDJ7viezNSqJIUyqiEads6UQyS-ziVE6MRScGAog_EgWBdYntFIKzwemdYvvH5lY3Az2-o8IQvlKk/pub?gid=2039894312&single=true&output=csv';

const DATE_MAP = {
    "09-08": { KO: "9월 8일(화)", EN: "Sep. 8th (Tue)" },
    "09-09": { KO: "9월 9일(수)", EN: "Sep. 9th (Wed)" },
    "09-10": { KO: "9월 10일(목)", EN: "Sep. 10th (Thu)" }
};

const PLACE_ORDER = ["장충아레나", "프로메테우스", "다이너스티", "에메랄드", "루비", "토파즈", "이벤트"];

const PLACE_MAP = {
    "장충아레나": { KO: "장충아레나", EN: "Jangchung Arena" },
    "프로메테우스": { KO: "프로메테우스", EN: "Prometheus" },
    "다이너스티": { KO: "다이너스티", EN: "Dynasty" },
    "에메랄드": { KO: "에메랄드", EN: "Emerald" },
    "루비": { KO: "루비", EN: "Ruby" },
    "토파즈": { KO: "토파즈", EN: "Topaz" },
    "이벤트": { KO: "이벤트", EN: "Event" }
};

const START_HOUR = 8; 
const END_HOUR = 20;
const TOTAL_HOURS = END_HOUR - START_HOUR;

const PALETTE = [
    { bg: '#fce4ec', border: '#ec407a' }, { bg: '#e3f2fd', border: '#42a5f5' },
    { bg: '#e8f5e9', border: '#66bb6a' }, { bg: '#fff3e0', border: '#ffa726' },
    { bg: '#f3e5f5', border: '#ab47bc' }, { bg: '#e0f7fa', border: '#26c6da' },
    { bg: '#fafafa', border: '#9e9e9e' }
];

let currentLang = 'KO';
let globalRawData = [];

function timeToPosition(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const timeInHours = hours + (minutes / 60);
    return ((timeInHours - START_HOUR) / TOTAL_HOURS) * 100;
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function loadGoogleSheetData() {
    try {
        const response = await fetch(GOOGLE_SHEET_URL + '&t=' + new Date().getTime());
        const csvText = await response.text();
        
        Papa.parse(csvText, {
            header: false,
            skipEmptyLines: true,
            complete: function(results) {
                const rows = results.data;
                // 🚀 빈 줄이나 제목/안내문 행을 건너뛰고 '날짜'나 'Date'가 정확히 들어간 진짜 헤더 행 찾기
                // (예: "Date / Place / Startime / ..." 같은 안내 문구 셀은 includes로는 오탐되므로 정확히 일치하는 셀만 인정)
                const isHeaderCell = (cell) => {
                    if (!cell || typeof cell !== 'string') return false;
                    const c = cell.trim();
                    return c === 'Date' || c === '날짜' || c === 'Place' || c === '장소';
                };
                let headerIndex = rows.findIndex(row => row.some(isHeaderCell));
                
                if (headerIndex === -1) headerIndex = 0;

                const headers = rows[headerIndex].map(h => h ? h.trim() : "");
                const dataRows = rows.slice(headerIndex + 1);

                globalRawData = dataRows.map(row => {
                    let obj = {};
                    headers.forEach((h, i) => { if(h) obj[h] = row[i]; });
                    return obj;
                });

                console.log("불러온 데이터 양:", globalRawData.length);
                renderTimetable();
            }
        });
    } catch (e) { console.error("데이터 로드 실패", e); }
}

function renderTimetable() {
    const wrapper = document.getElementById('timetable-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = ''; 
    
    let validData = [];
    globalRawData.forEach(item => {
        const keys = Object.keys(item);
        const findValue = (keywords) => {
            const key = keys.find(k => {
                const cleanKey = k.toLowerCase().replace(/[^a-z0-9ㄱ-ㅎㅏ-ㅣ가-힣]/g, '');
                return keywords.some(kw => {
                    const cleanKw = kw.toLowerCase().replace(/[^a-z0-9ㄱ-ㅎㅏ-ㅣ가-힣]/g, '');
                    return cleanKey.includes(cleanKw);
                });
            });
            return key ? item[key] : '';
        };

        // 🚀 "Time" 컬럼(시작-종료 통합)이 있으면 우선 사용하고, 없으면 기존 StartTime/EndTime 방식으로 대체
        const findExactValue = (keywords) => {
            const key = keys.find(k => {
                const cleanKey = k.toLowerCase().replace(/[^a-z0-9ㄱ-ㅎㅏ-ㅣ가-힣]/g, '');
                return keywords.some(kw => cleanKey === kw.toLowerCase().replace(/[^a-z0-9ㄱ-ㅎㅏ-ㅣ가-힣]/g, ''));
            });
            return key ? item[key] : '';
        };

        const timeVal = String(findExactValue(['time', '타임']) || '').trim();
        let startTime, endTime, timeDisplay;
        if (timeVal) {
            const match = timeVal.match(/(\d{1,2}:\d{2})\s*[-~–—]\s*(\d{1,2}:\d{2})/);
            if (match) {
                startTime = match[1];
                endTime = match[2];
            } else {
                startTime = timeVal;
                endTime = timeVal;
            }
            timeDisplay = timeVal;
        } else {
            startTime = String(findValue(['starttime', '시작시간']) || '').trim();
            endTime = String(findValue(['endtime', '종료시간']) || '').trim();
            timeDisplay = `${startTime} - ${endTime}`;
        }

        const dateVal = findValue(['date', '날짜']);

        if (startTime && dateVal && dateVal !== "날짜" && dateVal !== "Date") {
            validData.push({
                Date: String(dateVal).trim(),
                Place: String(findValue(['place', '장소']) || "").trim(),
                StartTime: startTime,
                EndTime: endTime,
                Time: timeDisplay,
                Session_KOR: findValue(['sessionkor', '세션국']),
                Session_ENG: findValue(['sessioneng', '세션영']),
                Speaker_KOR: findValue(['speakerkor', '연사국']),
                Speaker_ENG: findValue(['speakereng', '연사영']),
                Moderator_KOR: findValue(['moderatorkor', '좌장국', '모더국']),
                Moderator_ENG: findValue(['moderatoreng', '좌장영', '모더영'])
            });
        }
    });

    // 정렬: 날짜 -> 장소 -> 시간
    validData.sort((a, b) => {
        if (a.Date !== b.Date) return a.Date.localeCompare(b.Date);
        const idxA = PLACE_ORDER.indexOf(a.Place);
        const idxB = PLACE_ORDER.indexOf(b.Place);
        const placeCompare = (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
        if (placeCompare !== 0) return placeCompare;
        return a.StartTime.localeCompare(b.StartTime);
    });

    if (validData.length === 0) {
        wrapper.innerHTML = '<div style="text-align:center; width:100%; padding:50px; font-weight:bold;">데이터를 찾을 수 없습니다. 구글 시트의 헤더명(날짜, 장소, 시작시간 등)을 확인해주세요.</div>';
        return;
    }

    const dates = [...new Set(validData.map(d => d.Date))];
    const allPlaces = [...new Set(validData.map(d => d.Place))].sort((a, b) => {
        return PLACE_ORDER.indexOf(a) - PLACE_ORDER.indexOf(b);
    });

    dates.forEach(date => {
        const dateGroup = document.createElement('div');
        dateGroup.className = 'date-group';
        const displayDate = DATE_MAP[date] ? DATE_MAP[date][currentLang] : date;
        dateGroup.innerHTML = `<div class="date-header">${displayDate}</div>`;

        const placesContainer = document.createElement('div');
        placesContainer.className = 'places-container';

        const timeAxis = document.createElement('div');
        timeAxis.className = 'time-axis';
        timeAxis.innerHTML = '<div class="place-header" style="visibility:hidden">Time</div><div class="track-area"></div>';
        const timeTrack = timeAxis.querySelector('.track-area');
        timeTrack.style.backgroundImage = 'none';

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
        placesContainer.appendChild(timeAxis);

        allPlaces.forEach((place, idx) => {
            const color = PALETTE[idx % PALETTE.length];
            const col = document.createElement('div');
            col.className = 'place-column';
            const displayPlace = PLACE_MAP[place] ? PLACE_MAP[place][currentLang] : place;
            col.innerHTML = `<div class="place-header">${displayPlace}</div><div class="track-area"></div>`;
            const track = col.querySelector('.track-area');

            validData.filter(d => d.Date === date && d.Place === place).forEach(s => {
                const startPos = timeToPosition(s.StartTime);
                const endPos = timeToPosition(s.EndTime || s.StartTime);
                const block = document.createElement('div');
                block.className = 'session-block';
                block.style.top = `${startPos}%`;
                block.style.height = `${Math.max(endPos - startPos, 4)}%`; 
                block.style.backgroundColor = color.bg;
                block.style.borderTop = `5px solid ${color.border}`;

                const t = currentLang === 'KO' ? (s.Session_KOR || s.Session_ENG) : (s.Session_ENG || s.Session_KOR);
                const spk = currentLang === 'KO' ? s.Speaker_KOR : s.Speaker_ENG;
                const mod = currentLang === 'KO' ? s.Moderator_KOR : s.Moderator_ENG;

                block.innerHTML = `
                    <div class="session-title">${escapeHTML(t)}</div>
                    <div class="session-time">${s.Time}</div>
                    <div class="session-speakers">
                        ${spk ? `<span class="speaker">${escapeHTML(spk)}</span>` : ''}
                        ${mod ? `<span class="moderator">${escapeHTML(mod)}</span>` : ''}
                    </div>
                `;
                track.appendChild(block);
            });
            placesContainer.appendChild(col);
        });
        dateGroup.appendChild(placesContainer);
        wrapper.appendChild(dateGroup);
    });
}

// 버튼 설정
document.getElementById('btn-ko').onclick = function() {
    currentLang = 'KO';
    this.classList.add('active');
    document.getElementById('btn-en').classList.remove('active');
    renderTimetable();
};

document.getElementById('btn-en').onclick = function() {
    currentLang = 'EN';
    this.classList.add('active');
    document.getElementById('btn-ko').classList.remove('active');
    renderTimetable();
};

// PDF 다운로드 (백지 방지 및 중앙 정렬)
document.getElementById('download-pdf-btn').onclick = () => {
    const btn = document.getElementById('download-pdf-btn');
    const el = document.getElementById('timetable-content');
    if (!el) return;

    btn.innerText = "PDF 생성 중...";
    btn.disabled = true;

    const opt = {
        margin: 0,
        filename: 'timetable_A3.pdf',
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { 
            scale: 2, 
            useCORS: true, 
            logging: false,
            onclone: (clonedDoc) => {
                // 🚀 백지 방지: 클론된 문서의 스타일을 강제로 '보임' 상태로 고정
                const clonedEl = clonedDoc.getElementById('timetable-content');
                clonedEl.style.margin = "0";
                clonedEl.style.boxShadow = "none";
            }
        },
        jsPDF: { unit: 'mm', format: 'a3', orientation: 'landscape', compress: true }
    };

    html2pdf().from(el).set(opt).save().then(() => {
        btn.innerText = "PDF 다운로드 (A3 가로)";
        btn.disabled = false;
    }).catch(err => {
        console.error(err);
        btn.innerText = "실패 (재시도)";
        btn.disabled = false;
    });
};

loadGoogleSheetData();
