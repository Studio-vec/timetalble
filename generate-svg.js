// Generates editable SVG timetable(s) from the live Google Sheet data.
// Mirrors the parsing/layout logic in script.js so the SVG matches the live web app.
// Usage: node generate-svg.js

const fs = require('fs');

const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQWDJ7viezNSqJIUyqiEads6UQyS-ziVE6MRScGAog_EgWBdYntFIKzwemdYvvH5lY3Az2-o8IQvlKk/pub?gid=2039894312&single=true&output=csv';

// 날짜가 "2026-09-08"처럼 연도까지 들어오므로 월-일(MM-DD)로 정규화해서 조회
const DATE_MAP = {
    "09-08": { KO: "9월 8일(화)", EN: "Sep. 8th (Tue)" },
    "09-09": { KO: "9월 9일(수)", EN: "Sep. 9th (Wed)" },
    "09-10": { KO: "9월 10일(목)", EN: "Sep. 10th (Thu)" }
};

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKDAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_EN = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];

// 장소명이 "장충아레나" → "장충"처럼 축약되어 들어와도 같은 열로 묶이도록 별칭 처리
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

// 시간축은 데이터의 최초 시작/최종 종료 시각에 맞춰 자동 계산 (데이터가 없으면 8~20시)
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

const BRAND = {
    left: { KO: '제27회 세계지식포럼', EN: '27th World Knowledge Forum' },
    right: { KO: '프로메테우스의 순간', EN: 'The Promethean Moment' },
    footer: { KO: '*프로그램 및 시간표는 주최측 사정에 따라 변동될 수 있습니다.', EN: '*Programs and schedules are subject to change by the organizer.' }
};
// https://www.wkforum.org/session 으로 연결되는 QR (라운드트립 디코드로 검증됨)
const QR_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYAQMAAACEqAqfAAAABlBMVEX///8AAABVwtN+AAAACXBIWXMAAA7EAAAOxAGVKw4bAAABjklEQVR4nO3VMXLDMAwEQP7/00oRiwaPtGdSBtorNDSIW5Ye1ymjZP78PczvocVisVgsViNrrIlOnYebLRaLxWKxelnXnboXk3APLRaLxWKxulsxr2GxWCwW67HWTAxZLBaLxXqO9alcb7+8x2KxWCxWP2vPUYzvocVisVgsVhfrS2otrD+HxWKxWKx/ZV1rYhJuvJEPsFgsFovVxZrlsWZOYrs+eXiJxWKxWKwuVnDHpetOPceExWKxWKw21n4RiXntxxqLxWKxWG2sPG3/r/U8leNPFovFYrHaWAt5Q18mlchbFovFYrEaWfs3CnW45/0Ai8VisVi9rPfvrTnu1NvYfw1ZLBaLxeplXVvq9j6MydgfYbFYLBbrP1ufsq/WfuywWCwWi9XMuk6ZRIXqIb6vFovFYrFYjayxptaqHrdz4T1ksVgsFquXVTvL9VrbU0UWi8VisZ5j7ejeenVZLBaLxXqMNYmYxJzFYrFYrH5WXOfSh3l9gMVisVisZtaeuhqd+mQusFgsFovVxPoB/L14lctP4jwAAAAASUVORK5CYII=';

// 우측 하단에 겹쳐 보이는 북사인회 안내표 (구글 시트가 아닌 고정 데이터)
const BOOKSIGNING_COLS = [
    { key: 'speaker', w: 54, label: { KO: '연사', EN: 'Speaker' } },
    { key: 'book', w: 104, label: { KO: '도서', EN: 'Book' } },
    { key: 'time', w: 66, label: { KO: '북사인회 일시', EN: 'Signing Time' } },
    { key: 'place', w: 104, label: { KO: '장소', EN: 'Venue' } }
];
const BOOKSIGNING_ROWS = [
    { speaker: { KO: '크리스틴 로젠', EN: 'Christine Rosen' }, book: { KO: '경험의 멸종', EN: 'The Extinction of Experience' }, time: '9/9 11:10~11:30', place: { KO: '가든스테이지', EN: 'Garden Stage' } },
    { speaker: { KO: '리처드 도킨스', EN: 'Richard Dawkins' }, book: { KO: '이기적 유전자 (50주년 에디션)', EN: 'The Selfish Gene (50th Anniversary Edition)' }, time: '9/9 14:00~14:30', place: { KO: '가든스테이지', EN: 'Garden Stage' } },
    { speaker: { KO: '앨릭스 에드먼스', EN: 'Alex Edmans' }, book: { KO: 'ESG 파이코노믹스', EN: 'Grow the Pie' }, time: '9/9 15:30~15:50', place: { KO: '가든스테이지', EN: 'Garden Stage' } },
    { speaker: { KO: '스티븐 레비', EN: 'Steven Levy' }, book: { KO: 'In The Plex(원서)', EN: 'In the Plex' }, time: '9/9 15:40~16:10', place: { KO: '영빈관 내정', EN: 'Yeongbingwan Inner Courtyard' } },
    { speaker: { KO: '에릭 브리뇰프슨', EN: 'Erik Brynjolfsson' }, book: { KO: '제2의 기계 시대', EN: 'The Second Machine Age' }, time: '9/10 10:00~10:30', place: { KO: '가든스테이지', EN: 'Garden Stage' } }
];

const BOOKSIGNING_DATA_FONT = 6.5;
const BOOKSIGNING_HEAD_FONT = 7;
const BOOKSIGNING_LABEL_FONT = 7;

// SVG는 브라우저처럼 자동 줄바꿈이 없으므로, 칸 폭 기준으로 대략적인 글자수를 셈해
// 영문처럼 긴 내용은 최대 2줄로 직접 잘라 배치한다.
function wrapTextLines(text, colWidth, fontSize, maxLines) {
    const avgCharW = fontSize * 0.55;
    const maxChars = Math.max(4, Math.floor((colWidth - 6) / avgCharW));
    if (text.length <= maxChars) return [text];
    const words = text.split(' ');
    const lines = [];
    let current = '';
    words.forEach(w => {
        const trial = current ? current + ' ' + w : w;
        if (trial.length > maxChars && current) {
            lines.push(current);
            current = w;
        } else {
            current = trial;
        }
    });
    if (current) lines.push(current);
    if (lines.length > maxLines) {
        const head = lines.slice(0, maxLines - 1);
        const tail = lines.slice(maxLines - 1).join(' ');
        return [...head, tail];
    }
    return lines;
}

function drawWrappedText(cx, cy, lines, fontSize, extraAttrs) {
    const lineH = fontSize * 1.15;
    const totalTextH = lineH * lines.length;
    let ty = cy - totalTextH / 2 + fontSize * 0.85;
    let s = '';
    lines.forEach(line => {
        s += `<text x="${cx.toFixed(2)}" y="${ty.toFixed(2)}" text-anchor="middle" font-size="${fontSize}" fill="#000"${extraAttrs || ''}>${escapeXML(line)}</text>\n`;
        ty += lineH;
    });
    return s;
}

// 오른쪽 정렬 기준 rightX, 표 하단이 놓일 y좌표(bottomY)를 받아 표를 그린다.
// 🚀 셀마다 사방 테두리를 두르면 스프레드시트처럼 보이므로, 세로선은 그리지 않고
//    헤더 밑줄 1개 + 데이터 행 사이 얇은 가로선만 그려 인쇄용 표 느낌을 낸다.
function buildBookSigningTable(rightX, bottomY, lang) {
    const labelH = 12;   // "BOOK SIGNING" 라벨 높이
    const headerH = 13, rowH = 20; // 6.5~7pt 폰트 + 최대 2줄 줄바꿈을 담을 수 있는 높이
    const totalW = BOOKSIGNING_COLS.reduce((sum, c) => sum + c.w, 0);
    const tableH = headerH + rowH * BOOKSIGNING_ROWS.length;
    const totalH = labelH + tableH;
    const x0 = rightX - totalW;
    const y0 = bottomY - totalH;

    let s = '';
    const label = lang === 'KO' ? 'BOOK SIGNING' : 'BOOK SIGNING';
    s += `<text x="${(x0 + totalW).toFixed(2)}" y="${(y0 + labelH - 2).toFixed(2)}" text-anchor="end" font-size="${BOOKSIGNING_LABEL_FONT}" font-weight="800" fill="${POINT_COLOR}" style="letter-spacing:0.06em">${escapeXML(label)}</text>\n`;

    const ty0 = y0 + labelH;
    s += `<rect x="${x0.toFixed(2)}" y="${ty0.toFixed(2)}" width="${totalW.toFixed(2)}" height="${tableH.toFixed(2)}" fill="#ffffff"/>\n`;

    let cx = x0;
    BOOKSIGNING_COLS.forEach(col => {
        s += `<text x="${(cx + col.w / 2).toFixed(2)}" y="${(ty0 + headerH / 2 + 2.5).toFixed(2)}" text-anchor="middle" font-size="${BOOKSIGNING_HEAD_FONT}" font-weight="700" fill="#000">${escapeXML(col.label[lang])}</text>\n`;
        cx += col.w;
    });
    // 헤더 밑줄
    s += `<line x1="${x0.toFixed(2)}" y1="${(ty0 + headerH).toFixed(2)}" x2="${(x0 + totalW).toFixed(2)}" y2="${(ty0 + headerH).toFixed(2)}" stroke="#000000" stroke-width="1"/>\n`;

    BOOKSIGNING_ROWS.forEach((row, ri) => {
        const ry = ty0 + headerH + rowH * ri;
        let cx2 = x0;
        BOOKSIGNING_COLS.forEach(col => {
            const val = col.key === 'time' ? row.time : row[col.key][lang];
            const lines = wrapTextLines(val, col.w, BOOKSIGNING_DATA_FONT, 2);
            s += drawWrappedText(cx2 + col.w / 2, ry + rowH / 2, lines, BOOKSIGNING_DATA_FONT);
            cx2 += col.w;
        });
        // 마지막 행 아래는 선을 긋지 않는다
        if (ri < BOOKSIGNING_ROWS.length - 1) {
            const hy = ry + rowH;
            s += `<line x1="${x0.toFixed(2)}" y1="${hy.toFixed(2)}" x2="${(x0 + totalW).toFixed(2)}" y2="${hy.toFixed(2)}" stroke="#dddddd" stroke-width="0.5"/>\n`;
        }
    });

    return { svg: s, height: totalH };
}

// ---- minimal CSV parser (handles quoted fields, commas, newlines inside quotes) ----
function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') { field += '"'; i++; }
                else { inQuotes = false; }
            } else {
                field += c;
            }
        } else {
            if (c === '"') inQuotes = true;
            else if (c === ',') { row.push(field); field = ''; }
            else if (c === '\r') { /* skip */ }
            else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
            else field += c;
        }
    }
    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
    return rows.filter(r => r.some(cell => cell !== ''));
}

// 이름 목록을 한 명씩 분리한다.
// 행이 나뉘어 들어온 경우와, 한 칸에 "A, B" 처럼 몰아 넣은 경우를 모두 한 명 단위로 쪼갠다.
function splitNames(list) {
    return (list || [])
        .flatMap(v => String(v || '').split(/[,\n]/))
        .map(v => v.trim())
        .filter(Boolean);
}

function escapeXML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function timeToMinutes(timeStr) {
    if (!timeStr || !String(timeStr).includes(':')) return null;
    const [h, m] = String(timeStr).split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
}

function timeToY(timeStr, trackTop, trackH) {
    const mins = timeToMinutes(timeStr);
    if (mins === null) return trackTop;
    return trackTop + ((mins / 60 - START_HOUR) / (END_HOUR - START_HOUR)) * trackH;
}

// 시트의 QUERY()를 거치면 날짜 열이 "2026. 9. 8" / "9/8/2026" 처럼 다시 서식이 매겨져 나올 수 있어
// 여러 표기를 모두 받아 연/월/일로 분해한다. (연도가 없으면 y = null)
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

    // DATE_MAP에 없는 날짜는 연도가 포함된 데이터에서 요일까지 직접 만들어 표시
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
    // 뒷 시간대가 대부분 비어 있어 축은 19:30까지만 그린다.
    // 그보다 늦게 끝나는 소수 세션(갈라디너 등)은 그리드 바깥으로 자연스럽게 넘치도록 둔다.
    if (END_HOUR > 19.5) END_HOUR = 19.5;
}

async function loadData() {
    const res = await fetch(GOOGLE_SHEET_URL + '&t=' + Date.now());
    const csvText = await res.text();
    const rows = parseCSV(csvText);

    const isHeaderCell = (cell) => {
        if (!cell || typeof cell !== 'string') return false;
        const c = cell.trim();
        return c === 'Date' || c === '날짜' || c === 'Place' || c === '장소';
    };
    let headerIndex = rows.findIndex(row => row.some(isHeaderCell));
    if (headerIndex === -1) headerIndex = 0;

    const headers = rows[headerIndex].map(h => h ? h.trim() : "");
    const dataRows = rows.slice(headerIndex + 1);

    const globalRawData = dataRows.map(row => {
        // __raw: 헤더 이름 없이 위치로만 읽어야 하는 '이어지는 행'을 위해 원본 배열도 보관
        let obj = { __raw: row };
        headers.forEach((h, i) => { if (h) obj[h] = row[i]; });
        return obj;
    });

    return globalRawData;
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

    // "Time" 컬럼(시작-종료 통합, 예: 08:30-09:20)이 있으면 우선 사용
    const timeVal = findExactValue(['time', '타임']);
    let startTime = '', endTime = '', timeDisplay = '';
    if (timeVal) {
        const match = timeVal.match(/(\d{1,2}:\d{2})\s*[-~–—]\s*(\d{1,2}:\d{2})/);
        if (match) {
            startTime = match[1];
            endTime = match[2];
            timeDisplay = timeVal;
        } else if (/\d{1,2}:\d{2}/.test(timeVal)) {
            startTime = timeVal;
            endTime = timeVal;
            timeDisplay = timeVal;
        }
    } else {
        startTime = findValue(['starttime', '시작시간']);
        endTime = findValue(['endtime', '종료시간']);
        if (startTime) timeDisplay = `${startTime} - ${endTime}`;
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
        Speaker_KOR: findValue(['speakerkor', '연사국']),
        Speaker_ENG: findValue(['speakereng', '연사영']),
        Moderator_KOR: findValue(['moderatorkor', '좌장국', '모더국']),
        Moderator_ENG: findValue(['moderatoreng', '좌장영', '모더영'])
    };
}

// 연사·좌장이 여러 명이면 날짜/장소/시간이 비어 있는 행으로 이어진다.
// 4개 칸이 연사·좌장 열에 그대로 오는 경우와, 앞쪽 열(A~D)로 밀려 들어오는 경우를 모두 처리.
function extractContinuation(item, row) {
    let people = [row.Speaker_ENG, row.Speaker_KOR, row.Moderator_ENG, row.Moderator_KOR];
    if (people.every(v => !v)) {
        const cells = (item.__raw || []).map(c => String(c || '').trim());
        people = [cells[0] || '', cells[1] || '', cells[2] || '', cells[3] || ''];
    }
    return people.some(v => v) ? people : null;
}

// 시트 필터(공개여부)를 통과시키려고 이어지는 행에도 날짜·장소·시간을 그대로 채워 넣는 경우가 있다.
// 세션명이 비어 있고 앞 세션과 날짜·장소·시작시간이 같으면 새 세션이 아니라 연사가 이어진 행으로 본다.
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

function buildValidData(globalRawData) {
    const validData = [];
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
                Speaker_KOR: row.Speaker_KOR ? [row.Speaker_KOR] : [],
                Speaker_ENG: row.Speaker_ENG ? [row.Speaker_ENG] : [],
                Moderator_KOR: row.Moderator_KOR ? [row.Moderator_KOR] : [],
                Moderator_ENG: row.Moderator_ENG ? [row.Moderator_ENG] : []
            };
            validData.push(current);
            return;
        }

        // 세션 행이 아니면, 바로 위 세션에 붙는 추가 연사/좌장 행인지 확인
        // (칸이 앞으로 밀려 이름이 Date 열에 들어오는 경우가 있어 '날짜 형식'인지로 판별)
        if (!current || row.StartTime || isDateLike(row.Date)) return;
        const extra = extractContinuation(item, row);
        if (!extra) return;

        addPeople(current, extra[0], extra[1], extra[2], extra[3]);
    });

    validData.sort((a, b) => {
        const dateCompare = dateSortKey(a.Date).localeCompare(dateSortKey(b.Date));
        if (dateCompare !== 0) return dateCompare;
        const placeCompare = placeRank(a.Place) - placeRank(b.Place);
        if (placeCompare !== 0) return placeCompare;
        return a.StartTime.localeCompare(b.StartTime);
    });

    return validData;
}

// 마지막 날짜(3일차) 16시 반 이후는 우측 하단 고지문/QR/북사인회 표와 겹치는 자리라 눈금선을 그리지 않는다.
const HIDE_LINES_FROM_HOUR = 16.5;

function buildSVG(validData, lang) {
    const dates = [...new Set(validData.map(d => d.Date))];
    const allPlaces = [...new Set(validData.map(d => d.Place))].sort((a, b) => placeRank(a) - placeRank(b));
    const lastDate = dates[dates.length - 1];

    // Layout constants (A3 landscape, mm==px scale as in original hand-authored SVG)
    const PAGE_W = 1190.55, PAGE_H = 841.89;
    const MARGIN_X = 28, TOP_Y = 50;
    const DAY_GAP = 12;
    const dayCount = dates.length || 1;
    const dayW = (PAGE_W - MARGIN_X * 2 - DAY_GAP * (dayCount - 1)) / dayCount;

    const HEADER_H = 14;
    const GROUP_GAP = 3;         // 날짜 구분 바와 신라호텔 bar 사이 여백
    const GROUP_Y0 = HEADER_H + GROUP_GAP;
    const GROUP_H = 12;          // 장충/신라호텔 구분 bar 높이 (없는 날도 정렬을 위해 항상 확보)
    const PLACE_HEADER_Y = 39;   // 장소명 텍스트 baseline
    const TRACK_TOP = 46;
    const TRACK_H = 720; // 시간축 전체 높이 (START_HOUR~END_HOUR 범위를 이 높이에 나눠 배치)
    const TIME_COL_W = 24;
    const RIGHT_PAD = 0;

    // 1 unit == 1pt (PAGE_W 1190.55pt == 420mm) 이므로 pt 값을 그대로 stroke-width에 쓸 수 있다.
    let svg = '';
    svg += `<svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="0 0 ${PAGE_W} ${PAGE_H}" font-family="'Pretendard','Malgun Gothic',sans-serif">\n`;
    // 색상 모드: RGB(sRGB). SVG 포맷 자체는 CMYK를 담지 못하므로, 인쇄용 CMYK 변환은 일러스트레이터에서 별도로 진행해야 한다.
    svg += `<!-- 색상 모드: RGB(sRGB) — SVG는 CMYK를 지원하지 않습니다. 인쇄 전 일러스트레이터에서 CMYK로 변환하세요. -->\n`;
    svg += `<style>
.dh{fill:#222}.dt{fill:#fff;font-size:9px;font-weight:800}
.pt{fill:#000;font-size:8.5px;font-weight:700;text-anchor:middle}
.ptJC{fill:${POINT_COLOR}}
.tt{fill:#000;font-size:6px;text-anchor:end}
.st{font-size:6.5px;font-weight:800;fill:#000}
.sm{font-size:5px;fill:#000}
.si{font-size:5px;fill:#000}
.gl{stroke:#333333;stroke-width:0.5}
.gl2{stroke:#333333;stroke-width:0.3}
.brand,.brandR{font-size:9px;font-weight:800;fill:${POINT_COLOR}}
.foot{font-size:8px;fill:#000;text-anchor:end}
</style>\n\n`;
    svg += `<rect width="${PAGE_W}" height="${PAGE_H}" fill="#fff"/>\n\n`;
    svg += `<text class="brand" x="${MARGIN_X}" y="32">${escapeXML(BRAND.left[lang])}</text>\n`;
    // 제목: 자간 -30(-0.03em), 자폭 90%
    svg += `<g transform="translate(${(PAGE_W / 2).toFixed(2)},0) scale(0.9,1) translate(${(-PAGE_W / 2).toFixed(2)},0)">\n`;
    svg += `<text x="${PAGE_W / 2}" y="32" text-anchor="middle" font-size="21" font-weight="700" style="letter-spacing:-0.63px">SESSIONS TIMETABLE</text>\n`;
    svg += `</g>\n`;
    svg += `<text class="brandR" x="${PAGE_W - MARGIN_X}" y="32" text-anchor="end">${escapeXML(BRAND.right[lang])}</text>\n\n`;

    dates.forEach((date, dayIdx) => {
        const placesForDay = allPlaces.filter(p => validData.some(d => d.Date === date && d.Place === p));
        const places = placesForDay.length ? placesForDay : allPlaces;
        const colCount = places.length || 1;
        const gridLeft = TIME_COL_W + 1;
        const gridRight = dayW - RIGHT_PAD;
        const colW = (gridRight - gridLeft) / colCount;

        const dayX = MARGIN_X + dayIdx * (dayW + DAY_GAP);
        const displayDate = formatDateLabel(date, lang);

        svg += `<!-- ==================== DAY ${dayIdx + 1}: ${date} ==================== -->\n`;
        svg += `<g transform="translate(${dayX.toFixed(2)},${TOP_Y})">\n`;
        svg += `<rect class="dh" x="0" y="0" width="${dayW.toFixed(2)}" height="${HEADER_H}" rx="2"/>\n`;
        svg += `<text class="dt" x="${(dayW / 2).toFixed(2)}" y="${(HEADER_H / 2 + 3).toFixed(2)}" text-anchor="middle">${escapeXML(displayDate)}</text>\n\n`;

        // 장충아레나가 있는 날엔 그 옆 칸부터가 '신라호텔' 권역임을 얇은 회색 테두리선 + 글씨로 보여준다.
        if (places[0] === '장충' && places.length > 1) {
            const barX = gridLeft + colW;
            const barW = gridRight - barX;
            const shillaLabel = lang === 'KO' ? '신라호텔' : 'Shilla Hotel';
            svg += `<line x1="${barX.toFixed(2)}" y1="${GROUP_Y0}" x2="${barX.toFixed(2)}" y2="${GROUP_Y0 + GROUP_H}" stroke="#999999" stroke-width="0.75"/>\n`;
            svg += `<text x="${(barX + barW / 2).toFixed(2)}" y="${(GROUP_Y0 + GROUP_H / 2 + 3).toFixed(2)}" text-anchor="middle" font-size="8" font-weight="400" fill="#999999">${escapeXML(shillaLabel)}</text>\n`;
        }

        places.forEach((place, i) => {
            const cx = gridLeft + colW * (i + 0.5);
            const displayPlace = PLACE_MAP[place] ? PLACE_MAP[place][lang] : place;
            // 장충아레나는 포인트 컬러 글씨로 나머지 신라호텔 세션장과 구분한다.
            const cls = place === '장충' ? 'pt ptJC' : 'pt';
            svg += `<text class="${cls}" x="${cx.toFixed(2)}" y="${PLACE_HEADER_Y}">${escapeXML(displayPlace)}</text>\n`;
        });
        svg += '\n';

        const isLastDate = date === lastDate;
        for (let h = START_HOUR; h <= END_HOUR; h++) {
            [0, 30].forEach(m => {
                if (h === END_HOUR && m > 0) return;
                if (isLastDate && (h + m / 60) >= HIDE_LINES_FROM_HOUR) return;
                const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                const y = timeToY(timeStr, TRACK_TOP, TRACK_H);
                const cls = m === 0 ? 'gl' : 'gl2';
                svg += `<line class="${cls}" x1="${gridLeft}" y1="${y.toFixed(2)}" x2="${gridRight.toFixed(2)}" y2="${y.toFixed(2)}"/>\n`;
                svg += `<text class="tt" x="${(gridLeft - 2).toFixed(2)}" y="${(y + 2.5).toFixed(2)}">${timeStr}</text>\n`;
            });
        }
        svg += '\n';

        validData.filter(d => d.Date === date).forEach(s => {
            const colIdx = places.indexOf(s.Place);
            if (colIdx === -1) return;
            const x = gridLeft + colW * colIdx + 1;
            const w = colW - 2;
            const yStart = timeToY(s.StartTime, TRACK_TOP, TRACK_H);
            const yEnd = timeToY(s.EndTime || s.StartTime, TRACK_TOP, TRACK_H);
            const boxH = Math.max(yEnd - yStart, TRACK_H * 0.04);

            const color = PLACE_COLOR[s.Place] || DEFAULT_COLOR;
            const title = lang === 'KO' ? (s.Session_KOR || s.Session_ENG) : (s.Session_ENG || s.Session_KOR);
            // 연사·좌장이 여러 명이면 한 명씩 줄을 바꿔 표시
            const speakers = splitNames(lang === 'KO' ? s.Speaker_KOR : s.Speaker_ENG);
            const moderators = splitNames(lang === 'KO' ? s.Moderator_KOR : s.Moderator_ENG);

            svg += `<!-- ${escapeXML(s.Place)}: ${escapeXML(title)} ${s.Time} -->\n`;
            svg += `<rect x="${x.toFixed(2)}" y="${yStart.toFixed(2)}" width="${w.toFixed(2)}" height="${boxH.toFixed(2)}" fill="${color.bg}" rx="1"/>\n`;
            svg += `<rect x="${x.toFixed(2)}" y="${yStart.toFixed(2)}" width="${w.toFixed(2)}" height="2" fill="${color.border}" rx="1"/>\n`;
            svg += `<text class="st" x="${(x + 3).toFixed(2)}" y="${(yStart + 11).toFixed(2)}">${escapeXML(title)}</text>\n`;
            svg += `<text class="sm" x="${(x + 3).toFixed(2)}" y="${(yStart + 18).toFixed(2)}">${escapeXML(s.Time)}</text>\n`;
            let ty = yStart + 26;
            speakers.concat(moderators).forEach(name => {
                svg += `<text class="si" x="${(x + 3).toFixed(2)}" y="${ty.toFixed(2)}">${escapeXML(name)}</text>\n`;
                ty += 8;
            });
        });

        svg += `</g>\n\n`;
    });

    // 🚀 우측 하단 고지문(북사인회 안내 포함) + QR (https://www.wkforum.org/session)
    //    별도 여백을 확보하지 않고 시간표(마지막 시간대) 위에 그대로 겹쳐 보이도록 배치한다.
    //    day-group을 모두 그린 뒤 마지막에 그리므로 SVG 문서 순서상 항상 맨 위에 그려진다.
    const qrSize = 46, qrX = PAGE_W - MARGIN_X - qrSize, qrY = PAGE_H - qrSize - 6;
    const bookTable = buildBookSigningTable(PAGE_W - MARGIN_X, qrY - 10, lang);
    svg += bookTable.svg;
    svg += `<text class="foot" x="${(qrX - 6).toFixed(2)}" y="${(qrY + qrSize / 2).toFixed(2)}">${escapeXML(BRAND.footer[lang])}</text>\n`;
    svg += `<image x="${qrX.toFixed(2)}" y="${qrY.toFixed(2)}" width="${qrSize}" height="${qrSize}" href="${QR_DATA_URI}"/>\n`;

    svg += `</svg>\n`;
    return svg;
}

(async () => {
    console.log('구글 시트에서 데이터를 불러오는 중...');
    const raw = await loadData();
    const validData = buildValidData(raw);
    console.log(`유효한 세션 수: ${validData.length}`);

    if (validData.length === 0) {
        console.error('유효한 데이터를 찾지 못했습니다. 시트 헤더(Date/Place/Time 등)를 확인하세요.');
        process.exit(1);
    }

    updateTimeRange(validData);
    console.log(`시간축 범위: ${START_HOUR}시 ~ ${END_HOUR}시`);

    const koSvg = buildSVG(validData, 'KO');
    fs.writeFileSync('timetable_ko.svg', koSvg, 'utf8');
    console.log('timetable_ko.svg 생성 완료');

    const enSvg = buildSVG(validData, 'EN');
    fs.writeFileSync('timetable_en.svg', enSvg, 'utf8');
    console.log('timetable_en.svg 생성 완료');
})();
