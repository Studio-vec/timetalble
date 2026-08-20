const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQWDJ7viezNSqJIUyqiEads6UQyS-ziVE6MRScGAog_EgWBdYntFIKzwemdYvvH5lY3Az2-o8IQvlKk/pub?gid=2039894312&single=true&output=csv';

// 🚀 날짜가 "2026-09-08"처럼 연도까지 들어오므로 월-일(MM-DD)로 정규화해서 조회
const DATE_MAP = {
    "09-08": { KO: "9월 8일(화)", EN: "Sep. 8th (Tue)" },
    "09-09": { KO: "9월 9일(수)", EN: "Sep. 9th (Wed)" },
    "09-10": { KO: "9월 10일(목)", EN: "Sep. 10th (Thu)" }
};

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKDAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_EN = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];

// 🚀 장소명이 "장충아레나" → "장충"처럼 축약되어 들어와도 같은 열로 묶이도록 별칭 처리
const PLACE_ALIAS = {
    "장충아레나": "장충",
    "장충체육관": "장충",
    "jangchung": "장충",
    "jangchungarena": "장충"
};

const PLACE_ORDER = ["장충", "프로메테우스", "다이너스티", "에메랄드", "루비", "토파즈", "이벤트"];

const PLACE_MAP = {
    "장충": { KO: "장충아레나", EN: "Jangchung Arena" },
    "프로메테우스": { KO: "프로메테우스", EN: "Prometheus" },
    "다이너스티": { KO: "다이너스티", EN: "Dynasty" },
    "에메랄드": { KO: "에메랄드", EN: "Emerald" },
    "루비": { KO: "루비", EN: "Ruby" },
    "토파즈": { KO: "토파즈", EN: "Topaz" },
    "이벤트": { KO: "이벤트", EN: "Event" }
};

// 🚀 시간축은 데이터의 최초 시작/최종 종료 시각에 맞춰 자동 계산 (데이터가 없으면 8~20시)
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 20;
let START_HOUR = DEFAULT_START_HOUR;
let END_HOUR = DEFAULT_END_HOUR;

const PLACE_COLOR = {
    "장충": { bg: '#fdecea', border: '#c62828' },
    "이벤트": { bg: '#efebe9', border: '#795548' }
};
const DEFAULT_COLOR = { bg: '#f5f5f5', border: '#9e9e9e' };

let currentLang = 'KO';
let globalRawData = [];

function timeToMinutes(timeStr) {
    if (!timeStr || !String(timeStr).includes(':')) return null;
    const [hours, minutes] = String(timeStr).split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;
    return hours * 60 + minutes;
}

function timeToPosition(timeStr) {
    const mins = timeToMinutes(timeStr);
    if (mins === null) return 0;
    const totalHours = END_HOUR - START_HOUR;
    return ((mins / 60 - START_HOUR) / totalHours) * 100;
}

// "2026-09-08", "2026.9.8", "09-08" → "09-08"
function normalizeDateKey(value) {
    const s = String(value || '').trim();
    const withYear = s.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
    if (withYear) return `${withYear[2].padStart(2, '0')}-${withYear[3].padStart(2, '0')}`;
    const noYear = s.match(/^(\d{1,2})[-./](\d{1,2})$/);
    if (noYear) return `${noYear[1].padStart(2, '0')}-${noYear[2].padStart(2, '0')}`;
    return s;
}

function formatDateLabel(value, lang) {
    const key = normalizeDateKey(value);
    if (DATE_MAP[key]) return DATE_MAP[key][lang];

    // 🚀 DATE_MAP에 없는 날짜는 연도가 포함된 데이터에서 요일까지 직접 만들어 표시
    const withYear = String(value || '').trim().match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
    if (withYear) {
        const y = Number(withYear[1]);
        const m = Number(withYear[2]);
        const d = Number(withYear[3]);
        const day = new Date(y, m - 1, d).getDay();
        if (lang === 'KO') return `${m}월 ${d}일(${WEEKDAY_KO[day]})`;
        const suffix = (d % 10 === 1 && d !== 11) ? 'st'
            : (d % 10 === 2 && d !== 12) ? 'nd'
            : (d % 10 === 3 && d !== 13) ? 'rd' : 'th';
        return `${MONTH_EN[m - 1]} ${d}${suffix} (${WEEKDAY_EN[day]})`;
    }
    return value;
}

function isDateLike(value) {
    const s = String(value || '').trim();
    return /\d{4}[-./]\d{1,2}[-./]\d{1,2}/.test(s) || /^\d{1,2}[-./]\d{1,2}$/.test(s);
}

function cleanKey(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9ㄱ-ㅎㅏ-ㅣ가-힣]/g, '');
}

function normalizePlace(value) {
    const raw = String(value || '').trim();
    return PLACE_ALIAS[raw] || PLACE_ALIAS[cleanKey(raw)] || raw;
}

function placeRank(place) {
    const idx = PLACE_ORDER.indexOf(place);
    return idx === -1 ? 99 : idx;
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
                    // __raw: 헤더 이름 없이 위치로만 읽어야 하는 '이어지는 행'을 위해 원본 배열도 보관
                    let obj = { __raw: row };
                    headers.forEach((h, i) => { if(h) obj[h] = row[i]; });
                    return obj;
                });

                console.log("불러온 데이터 양:", globalRawData.length);
                renderTimetable();
            }
        });
    } catch (e) { console.error("데이터 로드 실패", e); }
}

// 시트 한 줄을 표준 형태로 변환
function extractRow(item) {
    const keys = Object.keys(item).filter(k => k !== '__raw');

    const findValue = (keywords) => {
        const key = keys.find(k => keywords.some(kw => cleanKey(k).includes(cleanKey(kw))));
        return key ? String(item[key] || '').trim() : '';
    };
    const findExactValue = (keywords) => {
        const key = keys.find(k => keywords.some(kw => cleanKey(k) === cleanKey(kw)));
        return key ? String(item[key] || '').trim() : '';
    };

    // 🚀 "Time" 컬럼(시작-종료 통합, 예: 08:30-09:20)이 있으면 우선 사용하고,
    //    없으면 기존 StartTime/EndTime 방식으로 대체
    const timeVal = findExactValue(['time', '타임']);
    let startTime = '', endTime = '', timeDisplay = '';
    if (timeVal) {
        const match = timeVal.match(/(\d{1,2}:\d{2})\s*[-~–—]\s*(\d{1,2}:\d{2})/);
        if (match) {
            startTime = match[1];
            endTime = match[2];
            timeDisplay = `${startTime} ~ ${endTime}`;
        } else if (/\d{1,2}:\d{2}/.test(timeVal)) {
            startTime = timeVal;
            endTime = timeVal;
            timeDisplay = timeVal;
        }
    } else {
        startTime = findValue(['starttime', '시작시간']);
        endTime = findValue(['endtime', '종료시간']);
        if (startTime) timeDisplay = `${startTime} ~ ${endTime}`;
    }

    const dateVal = findValue(['date', '날짜']);

    return {
        isSession: !!(startTime && dateVal && dateVal !== '날짜' && dateVal !== 'Date'),
        Date: dateVal,
        Place: normalizePlace(findValue(['place', '장소'])),
        StartTime: startTime,
        EndTime: endTime,
        Time: timeDisplay,
        Session_KOR: findValue(['sessionkor', '세션국']),
        Session_ENG: findValue(['sessioneng', '세션영']),
        Speaker_ENG: findValue(['speakereng', '연사영']),
        Speaker_KOR: findValue(['speakerkor', '연사국']),
        Moderator_ENG: findValue(['moderatoreng', '좌장영', '모더영']),
        Moderator_KOR: findValue(['moderatorkor', '좌장국', '모더국'])
    };
}

// 🚀 연사·좌장이 여러 명이면 날짜/장소/시간이 비어 있는 행으로 이어진다.
//    이때 4개 칸이 연사·좌장 열에 그대로 오는 경우와, 앞쪽 열(A~D)로 밀려 들어오는 경우를 모두 처리.
function extractContinuation(item, row) {
    let people = [row.Speaker_ENG, row.Speaker_KOR, row.Moderator_ENG, row.Moderator_KOR];
    if (people.every(v => !v)) {
        const cells = (item.__raw || []).map(c => String(c || '').trim());
        people = [cells[0] || '', cells[1] || '', cells[2] || '', cells[3] || ''];
    }
    return people.some(v => v) ? people : null;
}

function buildSessions() {
    const sessions = [];
    let current = null;

    globalRawData.forEach(item => {
        const row = extractRow(item);

        if (row.isSession) {
            current = {
                Date: row.Date,
                Place: row.Place,
                StartTime: row.StartTime,
                EndTime: row.EndTime,
                Time: row.Time,
                Session_KOR: row.Session_KOR,
                Session_ENG: row.Session_ENG,
                Speaker_ENG: row.Speaker_ENG ? [row.Speaker_ENG] : [],
                Speaker_KOR: row.Speaker_KOR ? [row.Speaker_KOR] : [],
                Moderator_ENG: row.Moderator_ENG ? [row.Moderator_ENG] : [],
                Moderator_KOR: row.Moderator_KOR ? [row.Moderator_KOR] : []
            };
            sessions.push(current);
            return;
        }

        // 세션 행이 아니면, 바로 위 세션에 붙는 추가 연사/좌장 행인지 확인
        // (칸이 앞으로 밀려 이름이 Date 열에 들어오는 경우가 있어 '날짜 형식'인지로 판별)
        if (!current || row.StartTime || isDateLike(row.Date)) return;
        const extra = extractContinuation(item, row);
        if (!extra) return;

        const [spkEn, spkKo, modEn, modKo] = extra;
        if (spkEn) current.Speaker_ENG.push(spkEn);
        if (spkKo) current.Speaker_KOR.push(spkKo);
        if (modEn) current.Moderator_ENG.push(modEn);
        if (modKo) current.Moderator_KOR.push(modKo);
    });

    return sessions;
}

function updateTimeRange(sessions) {
    let min = null, max = null;
    sessions.forEach(s => {
        const start = timeToMinutes(s.StartTime);
        const end = timeToMinutes(s.EndTime);
        if (start !== null) min = (min === null) ? start : Math.min(min, start);
        const last = (end === null) ? start : end;
        if (last !== null) max = (max === null) ? last : Math.max(max, last);
    });

    if (min === null || max === null || max <= min) {
        START_HOUR = DEFAULT_START_HOUR;
        END_HOUR = DEFAULT_END_HOUR;
        return;
    }
    START_HOUR = Math.floor(min / 60);
    END_HOUR = Math.ceil(max / 60);
    if (END_HOUR - START_HOUR < 4) END_HOUR = START_HOUR + 4;
}

function renderTimetable() {
    const wrapper = document.getElementById('timetable-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = '';

    const validData = buildSessions();

    // 정렬: 날짜 -> 장소 -> 시간
    validData.sort((a, b) => {
        if (a.Date !== b.Date) return a.Date.localeCompare(b.Date);
        const placeCompare = placeRank(a.Place) - placeRank(b.Place);
        if (placeCompare !== 0) return placeCompare;
        return a.StartTime.localeCompare(b.StartTime);
    });

    if (validData.length === 0) {
        wrapper.innerHTML = '<div style="text-align:center; width:100%; padding:50px; font-weight:bold;">데이터를 찾을 수 없습니다. 구글 시트의 헤더명(Date, Place, Time, Session (KOR) 등)을 확인해주세요.</div>';
        return;
    }

    updateTimeRange(validData);
    const halfHourSlots = (END_HOUR - START_HOUR) * 2;

    const dates = [...new Set(validData.map(d => d.Date))];
    const allPlaces = [...new Set(validData.map(d => d.Place))].sort((a, b) => placeRank(a) - placeRank(b));

    dates.forEach(date => {
        const dateGroup = document.createElement('div');
        dateGroup.className = 'date-group';
        dateGroup.innerHTML = `<div class="date-header">${escapeHTML(formatDateLabel(date, currentLang))}</div>`;

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

        allPlaces.forEach((place) => {
            const color = PLACE_COLOR[place] || DEFAULT_COLOR;
            const col = document.createElement('div');
            col.className = 'place-column';
            const displayPlace = PLACE_MAP[place] ? PLACE_MAP[place][currentLang] : place;
            col.innerHTML = `<div class="place-header">${escapeHTML(displayPlace)}</div><div class="track-area"></div>`;
            const track = col.querySelector('.track-area');
            // 🚀 시간축 범위가 바뀌어도 가로 눈금선이 30분 간격을 유지하도록 계산
            track.style.backgroundSize = `100% calc(100% / ${halfHourSlots})`;

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
                // 🚀 연사·좌장이 여러 명이면 쉼표로 이어 붙여 한 줄로 표시
                const spk = (currentLang === 'KO' ? s.Speaker_KOR : s.Speaker_ENG).filter(Boolean).join(', ');
                const mod = (currentLang === 'KO' ? s.Moderator_KOR : s.Moderator_ENG).filter(Boolean).join(', ');

                block.innerHTML = `
                    <div class="session-title">${escapeHTML(t)}</div>
                    <div class="session-time">${escapeHTML(s.Time)}</div>
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
document.getElementById('download-pdf-btn').onclick = async () => {
    const btn = document.getElementById('download-pdf-btn');
    const el = document.getElementById('timetable-content');
    if (!el) return;

    btn.innerText = "PDF 생성 중...";
    btn.disabled = true;

    try {
        const canvas = await html2canvas(el, {
            scale: 2,
            useCORS: true,
            logging: false,
            onclone: (clonedDoc) => {
                // 🚀 백지 방지: 클론된 문서의 스타일을 강제로 '보임' 상태로 고정
                const clonedEl = clonedDoc.getElementById('timetable-content');
                clonedEl.style.margin = "0";
                clonedEl.style.boxShadow = "none";
            }
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ unit: 'mm', format: 'a3', orientation: 'landscape', compress: true });
        // 🚀 캔버스를 페이지 크기에 정확히 맞춰 한 장에만 그려서 반올림 오차로 인한 2페이지 분할 방지
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
        pdf.save('timetable_A3.pdf');
        btn.innerText = "PDF 다운로드 (A3 가로)";
    } catch (err) {
        console.error(err);
        btn.innerText = "실패 (재시도)";
    } finally {
        btn.disabled = false;
    }
};

loadGoogleSheetData();
