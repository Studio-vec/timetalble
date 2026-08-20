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
// 데이터가 비었을 때 원인을 구분해 안내하기 위한 로드 상태
let loadState = { fetched: false, headerFound: false, headers: [], dataRowCount: 0, error: null };

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

// 🚀 시트의 QUERY()를 거치면 날짜 열이 "2026. 9. 8" / "9/8/2026" 처럼 다시 서식이 매겨져 나올 수 있어
//    여러 표기를 모두 받아 연/월/일로 분해한다. (연도가 없으면 y = null)
function parseDateParts(value) {
    const s = String(value || '').trim();
    let m = s.match(/^(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})/);      // 2026-09-08, 2026. 9. 8
    if (m) return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
    m = s.match(/^(\d{1,2})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{4})/);          // 9/8/2026 (월/일/연 순서로 해석)
    if (m) return { y: Number(m[3]), m: Number(m[1]), d: Number(m[2]) };
    m = s.match(/^(\d{1,2})\s*[-./]\s*(\d{1,2})\s*$/);                        // 09-08
    if (m) return { y: null, m: Number(m[1]), d: Number(m[2]) };
    return null;
}

const pad2 = (n) => String(n).padStart(2, '0');

function normalizeDateKey(value) {
    const parts = parseDateParts(value);
    return parts ? `${pad2(parts.m)}-${pad2(parts.d)}` : String(value || '').trim();
}

// 날짜를 시간순으로 정렬하기 위한 키 (문자열 비교로는 "9/10"이 "9/8"보다 앞서는 문제가 생김)
function dateSortKey(value) {
    const parts = parseDateParts(value);
    if (!parts) return String(value || '');
    return `${parts.y === null ? '0000' : parts.y}-${pad2(parts.m)}-${pad2(parts.d)}`;
}

function formatDateLabel(value, lang) {
    const key = normalizeDateKey(value);
    if (DATE_MAP[key]) return DATE_MAP[key][lang];

    // 🚀 DATE_MAP에 없는 날짜는 연도가 포함된 데이터에서 요일까지 직접 만들어 표시
    const parts = parseDateParts(value);
    if (parts && parts.y !== null) {
        const { y, m, d } = parts;
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
    return parseDateParts(value) !== null;
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

// 🚀 이름 목록을 한 명씩 분리한다.
//    행이 나뉘어 들어온 경우와, 한 칸에 "A, B" 처럼 몰아 넣은 경우를 모두 한 명 단위로 쪼갠다.
function splitNames(list) {
    return (list || [])
        .flatMap(v => String(v || '').split(/[,\n]/))
        .map(v => v.trim())
        .filter(Boolean);
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function loadGoogleSheetData() {
    try {
        const response = await fetch(GOOGLE_SHEET_URL + '&t=' + new Date().getTime());
        if (!response.ok) throw new Error(`시트 응답 오류 (HTTP ${response.status})`);
        const csvText = await response.text();
        loadState.fetched = true;

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

                loadState.headerFound = headerIndex !== -1;
                if (headerIndex === -1) headerIndex = 0;

                const headers = (rows[headerIndex] || []).map(h => h ? h.trim() : "");
                const dataRows = rows.slice(headerIndex + 1);
                loadState.headers = headers.filter(Boolean);
                loadState.dataRowCount = dataRows.length;

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
    } catch (e) {
        console.error("데이터 로드 실패", e);
        loadState.error = e && e.message ? e.message : String(e);
        renderTimetable();
    }
}

// 🚀 데이터가 안 보일 때 원인을 나눠서 알려준다.
// (헤더명 문제 / 시트에서 넘어온 행이 0개 / 행은 있는데 날짜·시간을 못 읽음 은 서로 다른 문제)
function buildEmptyMessage() {
    const detail = loadState.headers.length
        ? `<div style="margin-top:10px; font-weight:400; font-size:13px; color:#555;">읽어들인 헤더: ${escapeHTML(loadState.headers.join(' / '))}</div>`
        : '';

    let msg;
    if (loadState.error) {
        msg = `구글 시트를 불러오지 못했습니다.<div style="margin-top:10px; font-weight:400; font-size:13px; color:#555;">${escapeHTML(loadState.error)}</div>`;
    } else if (!loadState.fetched) {
        msg = '구글 시트를 불러오는 중입니다.';
    } else if (loadState.dataRowCount === 0) {
        msg = `시트에서 넘어온 데이터 행이 <b>0개</b>입니다. 헤더는 정상이니 시트 쪽을 확인해주세요.`
            + `<div style="margin-top:10px; font-weight:400; font-size:13px; color:#555; line-height:1.6;">`
            + `· 원본 탭(TT(웹)) 4행 아래에 세션 데이터가 들어가 있는지<br>`
            + `· QUERY 조건에 걸려 전부 걸러지고 있지는 않은지<br>`
            + `· 시트를 고쳤다면 [파일 → 웹에 게시]에서 다시 게시했는지`
            + `</div>`;
    } else {
        msg = `${loadState.dataRowCount}개 행을 받았지만 날짜·시간을 읽을 수 있는 행이 없습니다. 헤더명(Date, Place, Time 등)을 확인해주세요.`;
    }
    return `<div style="text-align:center; width:100%; padding:50px; font-weight:bold; line-height:1.5;">${msg}${detail}</div>`;
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

// 🚀 시트 필터(공개여부)를 통과시키려고 이어지는 행에도 날짜·장소·시간을 그대로 채워 넣는 경우가 있다.
//    세션명이 비어 있고 앞 세션과 날짜·장소·시작시간이 같으면 새 세션이 아니라 연사가 이어진 행으로 본다.
function isRepeatOfSession(row, current) {
    if (!current) return false;
    if (row.Session_KOR || row.Session_ENG) return false;
    return row.Date === current.Date
        && row.Place === current.Place
        && row.StartTime === current.StartTime;
}

function addPeople(current, spkEn, spkKo, modEn, modKo) {
    if (spkEn) current.Speaker_ENG.push(spkEn);
    if (spkKo) current.Speaker_KOR.push(spkKo);
    if (modEn) current.Moderator_ENG.push(modEn);
    if (modKo) current.Moderator_KOR.push(modKo);
}

function buildSessions() {
    const sessions = [];
    let current = null;

    globalRawData.forEach(item => {
        const row = extractRow(item);

        if (row.isSession) {
            if (isRepeatOfSession(row, current)) {
                addPeople(current, row.Speaker_ENG, row.Speaker_KOR, row.Moderator_ENG, row.Moderator_KOR);
                return;
            }
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

        addPeople(current, extra[0], extra[1], extra[2], extra[3]);
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
        const dateCompare = dateSortKey(a.Date).localeCompare(dateSortKey(b.Date));
        if (dateCompare !== 0) return dateCompare;
        const placeCompare = placeRank(a.Place) - placeRank(b.Place);
        if (placeCompare !== 0) return placeCompare;
        return a.StartTime.localeCompare(b.StartTime);
    });

    if (validData.length === 0) {
        wrapper.innerHTML = buildEmptyMessage();
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
                // 🚀 연사·좌장이 여러 명이면 한 명씩 줄을 바꿔 표시
                const spk = splitNames(currentLang === 'KO' ? s.Speaker_KOR : s.Speaker_ENG);
                const mod = splitNames(currentLang === 'KO' ? s.Moderator_KOR : s.Moderator_ENG);

                block.innerHTML = `
                    <div class="session-title">${escapeHTML(t)}</div>
                    <div class="session-time">${escapeHTML(s.Time)}</div>
                    <div class="session-speakers">
                        ${spk.map(n => `<span class="speaker">${escapeHTML(n)}</span>`).join('')}
                        ${mod.map(n => `<span class="moderator">${escapeHTML(n)}</span>`).join('')}
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
