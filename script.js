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

const POINT_COLOR = '#e8374a';
const PLACE_COLOR = {
    "장충": { bg: '#fdedef', border: POINT_COLOR },
    "이벤트": { bg: '#efebe9', border: '#795548' }
};
const DEFAULT_COLOR = { bg: '#f5f5f5', border: '#9e9e9e' };

const BRAND_MAP = {
    left: { KO: '제27회 세계지식포럼', EN: '27th World Knowledge Forum' },
    right: { KO: '프로메테우스의 순간', EN: 'The Promethean Moment' },
    footer: { KO: '*프로그램 및 시간표는 주최측 사정에 따라 변동될 수 있습니다.', EN: '*Programs and schedules are subject to change by the organizer.' }
};
// 🚀 https://www.wkforum.org/session 으로 연결되는 QR (라운드트립 디코드로 검증됨)
const QR_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYAQMAAACEqAqfAAAABlBMVEX///8AAABVwtN+AAAACXBIWXMAAA7EAAAOxAGVKw4bAAABjklEQVR4nO3VMXLDMAwEQP7/00oRiwaPtGdSBtorNDSIW5Ye1ymjZP78PczvocVisVgsViNrrIlOnYebLRaLxWKxelnXnboXk3APLRaLxWKxulsxr2GxWCwW67HWTAxZLBaLxXqO9alcb7+8x2KxWCxWP2vPUYzvocVisVgsVhfrS2otrD+HxWKxWKx/ZV1rYhJuvJEPsFgsFovVxZrlsWZOYrs+eXiJxWKxWKwuVnDHpetOPceExWKxWKw21n4RiXntxxqLxWKxWG2sPG3/r/U8leNPFovFYrHaWAt5Q18mlchbFovFYrEaWfs3CnW45/0Ai8VisVi9rPfvrTnu1NvYfw1ZLBaLxeplXVvq9j6MydgfYbFYLBbrP1ufsq/WfuywWCwWi9XMuk6ZRIXqIb6vFovFYrFYjayxptaqHrdz4T1ksVgsFquXVTvL9VrbU0UWi8VisZ5j7ejeenVZLBaLxXqMNYmYxJzFYrFYrH5WXOfSh3l9gMVisVisZtaeuhqd+mQusFgsFovVxPoB/L14lctP4jwAAAAASUVORK5CYII=';

// 🚀 우측 하단에 겹쳐 보이는 북사인회 안내표 (구글 시트가 아닌 고정 데이터)
const BOOKSIGNING_COLS = [
    { key: 'speaker', label: { KO: '연사', EN: 'Speaker' } },
    { key: 'book', label: { KO: '도서', EN: 'Book' } },
    { key: 'time', label: { KO: '북사인회 일시', EN: 'Signing Time' } },
    { key: 'place', label: { KO: '장소', EN: 'Venue' } }
];
const BOOKSIGNING_ROWS = [
    { speaker: { KO: '크리스틴 로젠', EN: 'Christine Rosen' }, book: { KO: '경험의 멸종', EN: 'The Extinction of Experience' }, time: '9/9 11:10~11:30', place: { KO: '가든스테이지', EN: 'Garden Stage' } },
    { speaker: { KO: '리처드 도킨스', EN: 'Richard Dawkins' }, book: { KO: '이기적 유전자 (50주년 에디션)', EN: 'The Selfish Gene (50th Anniversary Edition)' }, time: '9/9 14:00~14:30', place: { KO: '가든스테이지', EN: 'Garden Stage' } },
    { speaker: { KO: '앨릭스 에드먼스', EN: 'Alex Edmans' }, book: { KO: 'ESG 파이코노믹스', EN: 'Grow the Pie' }, time: '9/9 15:30~15:50', place: { KO: '가든스테이지', EN: 'Garden Stage' } },
    { speaker: { KO: '스티븐 레비', EN: 'Steven Levy' }, book: { KO: 'In The Plex(원서)', EN: 'In the Plex' }, time: '9/9 15:40~16:10', place: { KO: '영빈관 내정', EN: 'Yeongbingwan Inner Courtyard' } },
    { speaker: { KO: '에릭 브리뇰프슨', EN: 'Erik Brynjolfsson' }, book: { KO: '제2의 기계 시대', EN: 'The Second Machine Age' }, time: '9/10 10:00~10:30', place: { KO: '가든스테이지', EN: 'Garden Stage' } }
];

function updateBookSigningTable() {
    const head = document.getElementById('booksigning-head');
    const body = document.getElementById('booksigning-body');
    if (!head || !body) return;
    head.innerHTML = BOOKSIGNING_COLS.map(c => `<th>${escapeHTML(c.label[currentLang])}</th>`).join('');
    body.innerHTML = BOOKSIGNING_ROWS.map(row => {
        const cells = BOOKSIGNING_COLS.map(c => {
            const v = c.key === 'time' ? row.time : row[c.key][currentLang];
            return `<td>${escapeHTML(v)}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
    }).join('');
}

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

// 🚀 'Thorning-Schmidt'가 하이픈에서 갈라지지 않게 한다.
//    keep-all은 한글에만 적용되므로 영문은 하이픈 뒤에 폭 0짜리 결합문자(U+2060)를 넣어 붙여둔다.
function preventHyphenBreak(str) {
    return String(str == null ? '' : str).replace(/(\S)-(\S)/g, '$1-⁠$2');
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
    // 🚀 영문일 때만 제목 자폭·자간을 좁히기 위한 표시 (style.css의 body.lang-en 규칙)
    document.body.classList.toggle('lang-en', currentLang === 'EN');

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

    // 🚀 마지막 날(3일차) 18시 이후는 우측 하단 고지문/QR과 겹치는 자리라
    //    눈금선과 시간 라벨을 지워 그 아래를 백지로 비워둔다.
    const HIDE_LINES_FROM_HOUR = 18;
    const lastDate = dates[dates.length - 1];

    dates.forEach(date => {
        const isLastDate = date === lastDate;
        // 🚀 그 날 세션이 하나도 없는 장소(예: 3일차 장충아레나)는 열 자체를 만들지 않는다.
        const places = allPlaces.filter(p => validData.some(d => d.Date === date && d.Place === p));
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
                if (isLastDate && h >= HIDE_LINES_FROM_HOUR) return;
                const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                const label = document.createElement('div');
                label.className = 'time-label';
                label.style.top = `${timeToPosition(timeStr)}%`;
                label.innerText = timeStr;
                timeTrack.appendChild(label);
            });
        }
        placesContainer.appendChild(timeAxis);

        // 🚀 장충아레나가 있는 날엔 그 옆 칸부터가 '신라호텔' 권역임을 얇은 회색 테두리선 + 글씨로 보여준다.
        //    place-header 행과 폭이 정확히 맞도록 같은 flex 비율(spacer/장충 칸=1/나머지=N-1)을 쓴다.
        //    장충이 없는 날도 이 행 자체는 항상 만들어 높이를 맞춰야, 날짜별 시간축 눈금이 서로 어긋나지 않는다.
        const groupRow = document.createElement('div');
        groupRow.className = 'venue-group-row';
        if (places[0] === '장충' && places.length > 1) {
            const shillaLabel = currentLang === 'KO' ? '신라호텔' : 'Shilla Hotel';
            groupRow.innerHTML = `
                <div class="group-spacer"></div>
                <div class="group-jangchung"></div>
                <div class="group-shilla">${escapeHTML(shillaLabel)}</div>
            `;
            groupRow.querySelector('.group-shilla').style.flex = String(places.length - 1);
        } else {
            groupRow.innerHTML = '<div class="group-spacer"></div>';
        }
        dateGroup.appendChild(groupRow);

        places.forEach((place, placeIdx) => {
            const color = PLACE_COLOR[place] || DEFAULT_COLOR;
            const col = document.createElement('div');
            col.className = 'place-column';
            // 🚀 장충아레나는 장소명을 포인트 컬러 글씨로 강조해 나머지 신라호텔 세션장과 구분한다.
            if (place === '장충') col.classList.add('venue-jangchung');
            const displayPlace = PLACE_MAP[place] ? PLACE_MAP[place][currentLang] : place;
            col.innerHTML = `<div class="place-header">${escapeHTML(displayPlace)}</div><div class="track-area"></div>`;
            const track = col.querySelector('.track-area');
            // 🚀 시간축 범위가 바뀌어도 가로 눈금선이 30분 간격을 유지하도록 계산
            track.style.backgroundSize = `100% calc(100% / ${halfHourSlots})`;
            if (isLastDate) {
                // 🚀 18시부터는 눈금선 위에 흰 배경을 덧씌워 지우고, 그 아래를 백지로 비운다
                const cutoff = Math.min(100, Math.max(0, timeToPosition(`${HIDE_LINES_FROM_HOUR}:00`)));
                track.style.backgroundImage = `linear-gradient(to bottom, transparent 0%, transparent ${cutoff}%, #fff ${cutoff}%, #fff 100%), linear-gradient(#f0f0f0 1px, transparent 1px)`;
                track.style.backgroundSize = `100% 100%, 100% calc(100% / ${halfHourSlots})`;
            }

            validData.filter(d => d.Date === date && d.Place === place).forEach(s => {
                const startPos = timeToPosition(s.StartTime);
                const endPos = timeToPosition(s.EndTime || s.StartTime);
                const block = document.createElement('div');
                block.className = 'session-block';
                block.style.top = `${startPos}%`;
                block.style.height = `${Math.max(endPos - startPos, 4)}%`;
                block.style.backgroundColor = color.bg;
                block.style.borderTop = `3px solid ${color.border}`;

                const t = currentLang === 'KO' ? (s.Session_KOR || s.Session_ENG) : (s.Session_ENG || s.Session_KOR);
                // 🚀 연사·좌장이 여러 명이면 한 명씩 줄을 바꿔 표시
                const spk = splitNames(currentLang === 'KO' ? s.Speaker_KOR : s.Speaker_ENG);
                const mod = splitNames(currentLang === 'KO' ? s.Moderator_KOR : s.Moderator_ENG);

                block.innerHTML = `
                    <div class="session-title">${escapeHTML(preventHyphenBreak(t))}</div>
                    <div class="session-time">${escapeHTML(s.Time)}</div>
                    <div class="session-speakers">
                        ${spk.map(n => `<span class="speaker">${escapeHTML(preventHyphenBreak(n))}</span>`).join('')}
                        ${mod.map(n => `<span class="moderator">${escapeHTML(preventHyphenBreak(n))}</span>`).join('')}
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

/* ===================== SVG 내보내기 =====================
   화면에 그려진 DOM을 그대로 SVG로 옮긴다.
   글자를 <text>로 내보내므로 일러스트레이터·피그마에서 텍스트를 그대로 수정할 수 있다. */

function escapeXML(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// 🚀 화면에서 실제로 몇 번째 줄에 무엇이 그려졌는지 글자 단위로 읽어낸다.
//    (CSS 자동 줄바꿈 결과를 그대로 가져와야 SVG가 화면과 같은 모양이 된다)
function splitVisualLines(el) {
    const node = el.firstChild;
    const text = node && node.nodeType === 3 ? node.textContent : '';
    if (!text.trim()) return [];

    const range = document.createRange();
    const lines = [];
    let currentTop = null;
    let current = '';

    for (let i = 0; i < text.length; i++) {
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        // 줄 끝 공백은 폭이 0으로 잡혀 줄 판정을 어지럽히므로 현재 줄에 붙인다
        if (r.width === 0 && r.height === 0) { current += text[i]; continue; }

        const top = Math.round(r.top);
        if (currentTop === null) currentTop = top;

        if (Math.abs(top - currentTop) < 2) {
            current += text[i];
        } else {
            if (current.trim()) lines.push(current.trim());
            current = text[i];
            currentTop = top;
        }
    }
    if (current.trim()) lines.push(current.trim());
    return lines;
}

// 요소 하나를 SVG <text>로 (여러 줄이면 줄 수만큼)
function elementToSVGText(el, origin) {
    const cs = getComputedStyle(el);
    // 🚀 화면에서 안 보이는 요소는 내보내지 않는다.
    //    (시간축의 자리맞춤용 'Time' 헤더가 visibility:hidden 이라 그대로 두면 SVG에만 글자가 생긴다)
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) return '';

    const lines = splitVisualLines(el);
    if (!lines.length) return '';

    const rect = el.getBoundingClientRect();
    const fontSize = parseFloat(cs.fontSize);
    const lineHeight = cs.lineHeight === 'normal' ? fontSize * 1.2 : parseFloat(cs.lineHeight);
    // transform: scaleX(...) 로 좁혀둔 자폭을 SVG에서도 그대로 재현
    const matrix = cs.transform && cs.transform !== 'none' ? new DOMMatrixReadOnly(cs.transform) : null;
    const scaleX = matrix ? matrix.a : 1;
    const spacing = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing);

    const padLeft = parseFloat(cs.paddingLeft) || 0;
    const padRight = parseFloat(cs.paddingRight) || 0;
    const padTop = parseFloat(cs.paddingTop) || 0;

    const boxLeft = rect.left - origin.left + padLeft;
    // 첫 줄 베이스라인: 줄 상자 안에서 글자가 놓이는 위치
    const baseline = rect.top - origin.top + padTop + (lineHeight - fontSize) / 2 + fontSize * 0.8;

    // 🚀 가운데·오른쪽 정렬을 SVG의 text-anchor로 옮긴다. (안 하면 전부 왼쪽으로 밀린다)
    //    좌표는 자폭 축소(scaleX) 이전 기준으로 계산해야 위치가 맞는다.
    const contentWidth = rect.width / scaleX - padLeft - padRight;
    let anchor = 'start';
    let anchorX = 0;
    if (cs.textAlign === 'center') { anchor = 'middle'; anchorX = contentWidth / 2; }
    else if (cs.textAlign === 'right' || cs.textAlign === 'end') { anchor = 'end'; anchorX = contentWidth; }

    const attrs = [
        `font-size="${fontSize.toFixed(2)}"`,
        `font-weight="${cs.fontWeight}"`,
        `fill="${cs.color}"`
    ];
    if (anchor !== 'start') attrs.push(`text-anchor="${anchor}"`);
    // 🚀 자간은 단위를 붙여 style로 넘긴다.
    //    단위 없는 숫자로 두면 일러스트레이터 등에서 다르게 해석돼 자간이 넓어 보인다.
    if (spacing) attrs.push(`style="letter-spacing:${spacing.toFixed(3)}px"`);

    // scaleX가 걸린 경우 transform으로 감싸고 좌표는 원점 기준으로 둔다
    const scaled = scaleX !== 1;
    const tx = scaled ? anchorX : boxLeft + anchorX;
    const open = scaled
        ? `<text transform="translate(${boxLeft.toFixed(2)},${baseline.toFixed(2)}) scale(${scaleX},1)" ${attrs.join(' ')}>`
        : `<text x="${tx.toFixed(2)}" y="${baseline.toFixed(2)}" ${attrs.join(' ')}>`;

    const body = lines.map((line, i) => {
        const dy = i === 0 ? 0 : lineHeight;
        return `<tspan x="${tx.toFixed(2)}" dy="${dy.toFixed(2)}">${escapeXML(line)}</tspan>`;
    }).join('');

    return open + body + '</text>\n';
}

function buildSVGFromDOM() {
    const content = document.getElementById('timetable-content');
    const origin = content.getBoundingClientRect();
    const W = origin.width;
    const H = origin.height;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="0 0 ${W.toFixed(2)} ${H.toFixed(2)}" `;
    // 🚀 화면과 같은 순서로 적어야 같은 폰트가 잡힌다.
    //    (Pretendard를 앞에 두면 정적 버전이 먼저 잡혀 굵기·자폭이 달라진다)
    svg += `font-family="'Pretendard Variable', Pretendard, 'Malgun Gothic', sans-serif">\n`;
    svg += `<rect width="${W.toFixed(2)}" height="${H.toFixed(2)}" fill="#ffffff"/>\n`;
    // 🚀 SVG는 sRGB만 표현할 수 있어 CMYK 값을 직접 담을 수 없다.
    //    인쇄 원고로 쓰려면 일러스트레이터에서 열어 CMYK로 별도 변환해야 한다.
    svg += `<!-- 색상 모드: RGB(sRGB) — SVG 포맷 자체는 CMYK를 담지 못하므로, 인쇄용 CMYK 변환은 일러스트레이터에서 별도로 진행하세요. -->\n`;
    // 1pt를 뷰박스 단위로 환산 (전체 폭 420mm 기준)
    const ptToUnits = (pt) => pt * 0.352778 * (W / 420);

    const title = content.querySelector('.main-title');
    if (title) svg += elementToSVGText(title, origin);
    const brandLeft = content.querySelector('.brand-left');
    if (brandLeft) svg += elementToSVGText(brandLeft, origin);
    const brandRight = content.querySelector('.brand-right');
    if (brandRight) svg += elementToSVGText(brandRight, origin);

    content.querySelectorAll('.date-group').forEach(group => {
        const header = group.querySelector('.date-header');
        const hr = header.getBoundingClientRect();
        svg += `\n<g>\n`;
        svg += `<rect x="${(hr.left - origin.left).toFixed(2)}" y="${(hr.top - origin.top).toFixed(2)}" `;
        svg += `width="${hr.width.toFixed(2)}" height="${hr.height.toFixed(2)}" fill="${getComputedStyle(header).backgroundColor}"/>\n`;
        svg += elementToSVGText(header, origin);

        // 시간 구분선: 1시간 간격 0.5pt, 30분 간격 0.3pt, 컬러는 모두 K80
        const firstTrack = group.querySelector('.place-column .track-area');
        if (firstTrack) {
            const cols = group.querySelectorAll('.place-column .track-area');
            const last = cols[cols.length - 1].getBoundingClientRect();
            const tr = firstTrack.getBoundingClientRect();
            const slots = (END_HOUR - START_HOUR) * 2;
            for (let i = 0; i <= slots; i++) {
                const y = (tr.top - origin.top) + (tr.height / slots) * i;
                const isHour = i % 2 === 0;
                const strokeWidth = ptToUnits(isHour ? 0.5 : 0.3);
                svg += `<line x1="${(tr.left - origin.left).toFixed(2)}" y1="${y.toFixed(2)}" `;
                svg += `x2="${(last.right - origin.left).toFixed(2)}" y2="${y.toFixed(2)}" stroke="#333333" stroke-width="${strokeWidth.toFixed(3)}"/>\n`;
            }
        }

        group.querySelectorAll('.time-label').forEach(el => { svg += elementToSVGText(el, origin); });
        group.querySelectorAll('.place-header').forEach(el => {
            const bg = getComputedStyle(el).backgroundColor;
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                const r = el.getBoundingClientRect();
                svg += `<rect x="${(r.left - origin.left).toFixed(2)}" y="${(r.top - origin.top).toFixed(2)}" `;
                svg += `width="${r.width.toFixed(2)}" height="${r.height.toFixed(2)}" fill="${bg}"/>\n`;
            }
            svg += elementToSVGText(el, origin);
        });
        // 장충아레나 옆 칸부터 '신라호텔' 권역임을 보여주는 얇은 회색 테두리선 + 글씨
        const shillaCell = group.querySelector('.venue-group-row .group-shilla');
        if (shillaCell) {
            const sr = shillaCell.getBoundingClientRect();
            const sx = (sr.left - origin.left).toFixed(2);
            svg += `<line x1="${sx}" y1="${(sr.top - origin.top).toFixed(2)}" x2="${sx}" y2="${(sr.bottom - origin.top).toFixed(2)}" stroke="#999999" stroke-width="${ptToUnits(0.75).toFixed(3)}"/>\n`;
            svg += elementToSVGText(shillaCell, origin);
        }

        group.querySelectorAll('.session-block').forEach(block => {
            const br = block.getBoundingClientRect();
            const bs = getComputedStyle(block);
            const x = (br.left - origin.left).toFixed(2);
            const y = (br.top - origin.top).toFixed(2);
            svg += `<rect x="${x}" y="${y}" width="${br.width.toFixed(2)}" height="${br.height.toFixed(2)}" fill="${bs.backgroundColor}"/>\n`;
            svg += `<rect x="${x}" y="${y}" width="${br.width.toFixed(2)}" height="${parseFloat(bs.borderTopWidth).toFixed(2)}" fill="${bs.borderTopColor}"/>\n`;
            block.querySelectorAll('.session-title, .session-time, .speaker, .moderator').forEach(el => {
                svg += elementToSVGText(el, origin);
            });
        });

        svg += `</g>\n`;
    });

    // 🚀 우측 하단 고지문 + QR + 북사인회 안내표 - 별도 여백을 확보하지 않고 시간표 위에 그대로 겹쳐 보이도록
    //    day-group을 모두 그린 뒤 맨 마지막에 그려서 항상 맨 위(overlay)로 나오게 한다.
    const footerNote = content.querySelector('.footer-note');
    if (footerNote) {
        const bsLabel = footerNote.querySelector('#booksigning-label');
        if (bsLabel) svg += elementToSVGText(bsLabel, origin);

        // 🚀 셀마다 사방 테두리를 그리면 스프레드시트처럼 보이므로, 헤더 밑줄 1개 +
        //    각 데이터 행 아래 얇은 가로선만 그려 CSS의 '세로선 없는' 디자인을 그대로 옮긴다.
        const bsTable = footerNote.querySelector('#booksigning-table');
        if (bsTable) {
            const headRow = bsTable.querySelector('thead tr');
            if (headRow) {
                const hb = headRow.getBoundingClientRect();
                const hy = (hb.bottom - origin.top).toFixed(2);
                svg += `<line x1="${(hb.left - origin.left).toFixed(2)}" y1="${hy}" x2="${(hb.right - origin.left).toFixed(2)}" y2="${hy}" stroke="#000000" stroke-width="${ptToUnits(1).toFixed(3)}"/>\n`;
                headRow.querySelectorAll('th').forEach(cell => { svg += elementToSVGText(cell, origin); });
            }
            const bodyRows = bsTable.querySelectorAll('tbody tr');
            bodyRows.forEach((row, ri) => {
                const rb = row.getBoundingClientRect();
                if (ri < bodyRows.length - 1) {
                    const ry = (rb.bottom - origin.top).toFixed(2);
                    svg += `<line x1="${(rb.left - origin.left).toFixed(2)}" y1="${ry}" x2="${(rb.right - origin.left).toFixed(2)}" y2="${ry}" stroke="#dddddd" stroke-width="${ptToUnits(0.5).toFixed(3)}"/>\n`;
                }
                row.querySelectorAll('td').forEach(cell => { svg += elementToSVGText(cell, origin); });
            });
        }

        const footerText = footerNote.querySelector('.footer-text');
        if (footerText) svg += elementToSVGText(footerText, origin);
        const qr = footerNote.querySelector('.footer-qr');
        if (qr) {
            const qr_r = qr.getBoundingClientRect();
            svg += `<image x="${(qr_r.left - origin.left).toFixed(2)}" y="${(qr_r.top - origin.top).toFixed(2)}" `;
            svg += `width="${qr_r.width.toFixed(2)}" height="${qr_r.height.toFixed(2)}" href="${QR_DATA_URI}"/>\n`;
        }
    }

    svg += `</svg>\n`;
    return svg;
}

function downloadSVGFile() {
    const svg = buildSVGFromDOM();
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timetable_${currentLang.toLowerCase()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 🚀 좌상단/우상단 브랜딩 문구, 우하단 고지문·북사인회 안내표도 언어 토글에 맞춰 갈아끼운다.
function updateBrandText() {
    document.getElementById('brand-left').textContent = BRAND_MAP.left[currentLang];
    document.getElementById('brand-right').textContent = BRAND_MAP.right[currentLang];
    document.getElementById('footer-text').textContent = BRAND_MAP.footer[currentLang];
    updateBookSigningTable();
}

// 버튼 설정
document.getElementById('btn-ko').onclick = function() {
    currentLang = 'KO';
    this.classList.add('active');
    document.getElementById('btn-en').classList.remove('active');
    updateBrandText();
    renderTimetable();
};

document.getElementById('btn-en').onclick = function() {
    currentLang = 'EN';
    this.classList.add('active');
    document.getElementById('btn-ko').classList.remove('active');
    updateBrandText();
    renderTimetable();
};

updateBrandText();

const PDF_BTN_LABEL = "PDF 다운로드 (A3 가로)";
// 🚀 2초 이상 길게 누르고 있으면 PDF 대신 편집 가능한 SVG를 내려받는다.
const LONG_PRESS_MS = 2000;
const LONG_PRESS_HINT_MS = 500;   // 이 시간부터 "누르는 중" 안내를 띄운다
const pdfBtn = document.getElementById('download-pdf-btn');
let longPressTimer = null;
let longPressHintTimer = null;
let longPressFired = false;

function startLongPress() {
    if (pdfBtn.disabled) return;
    longPressFired = false;
    // 짧게 누른 경우엔 안내가 보이지 않도록 조금 늦게 띄운다
    longPressHintTimer = setTimeout(() => {
        pdfBtn.innerText = "계속 누르면 SVG 저장...";
    }, LONG_PRESS_HINT_MS);

    longPressTimer = setTimeout(() => {
        longPressTimer = null;
        longPressFired = true;   // 손을 뗄 때 오는 click에서 PDF를 막기 위한 표시
        downloadSVGFile();
        pdfBtn.innerText = "SVG 저장됨 (텍스트 수정 가능)";
        setTimeout(() => { if (!pdfBtn.disabled) pdfBtn.innerText = PDF_BTN_LABEL; }, 2000);
    }, LONG_PRESS_MS);
}

function cancelLongPress() {
    if (longPressHintTimer) { clearTimeout(longPressHintTimer); longPressHintTimer = null; }
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        if (!pdfBtn.disabled) pdfBtn.innerText = PDF_BTN_LABEL;   // 2초 전에 뗐으면 안내를 되돌린다
    }
}

pdfBtn.addEventListener('pointerdown', startLongPress);
pdfBtn.addEventListener('pointerup', cancelLongPress);
pdfBtn.addEventListener('pointerleave', cancelLongPress);
pdfBtn.addEventListener('pointercancel', cancelLongPress);
// 길게 누를 때 글자가 선택되거나 컨텍스트 메뉴가 뜨는 것을 막는다
pdfBtn.addEventListener('contextmenu', (e) => e.preventDefault());
pdfBtn.style.userSelect = 'none';
pdfBtn.style.touchAction = 'manipulation';

pdfBtn.onclick = function() {
    // 길게 눌러 SVG를 받은 직후의 click은 무시 (PDF까지 만들어지지 않도록)
    if (longPressFired) { longPressFired = false; return; }
    downloadPDF(this);
};

// PDF 다운로드 (백지 방지 및 중앙 정렬)
async function downloadPDF(btn) {
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
        btn.innerText = PDF_BTN_LABEL;
    } catch (err) {
        console.error(err);
        btn.innerText = "실패 (재시도)";
    } finally {
        btn.disabled = false;
    }
}

loadGoogleSheetData();
