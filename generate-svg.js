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

const PLACE_COLOR = {
    "장충": { bg: '#fdecea', border: '#c62828' },
    "이벤트": { bg: '#efebe9', border: '#795548' }
};
const DEFAULT_COLOR = { bg: '#f5f5f5', border: '#9e9e9e' };

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

    // DATE_MAP에 없는 날짜는 연도가 포함된 데이터에서 요일까지 직접 만들어 표시
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

function buildValidData(globalRawData) {
    const validData = [];
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

        const [spkEn, spkKo, modEn, modKo] = extra;
        if (spkEn) current.Speaker_ENG.push(spkEn);
        if (spkKo) current.Speaker_KOR.push(spkKo);
        if (modEn) current.Moderator_ENG.push(modEn);
        if (modKo) current.Moderator_KOR.push(modKo);
    });

    validData.sort((a, b) => {
        if (a.Date !== b.Date) return a.Date.localeCompare(b.Date);
        const placeCompare = placeRank(a.Place) - placeRank(b.Place);
        if (placeCompare !== 0) return placeCompare;
        return a.StartTime.localeCompare(b.StartTime);
    });

    return validData;
}

function buildSVG(validData, lang) {
    const dates = [...new Set(validData.map(d => d.Date))];
    const allPlaces = [...new Set(validData.map(d => d.Place))].sort((a, b) => placeRank(a) - placeRank(b));

    // Layout constants (A3 landscape, mm==px scale as in original hand-authored SVG)
    const PAGE_W = 1190.55, PAGE_H = 841.89;
    const MARGIN_X = 28, TOP_Y = 50;
    const DAY_GAP = 12;
    const dayCount = dates.length || 1;
    const dayW = (PAGE_W - MARGIN_X * 2 - DAY_GAP * (dayCount - 1)) / dayCount;

    const HEADER_H = 18;
    const PLACE_HEADER_Y = 30;
    const TRACK_TOP = 35;
    const TRACK_H = 720; // 시간축 전체 높이 (START_HOUR~END_HOUR 범위를 이 높이에 나눠 배치)
    const TIME_COL_W = 24;
    const RIGHT_PAD = 0;

    let svg = '';
    svg += `<svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="0 0 ${PAGE_W} ${PAGE_H}" font-family="'Pretendard','Malgun Gothic',sans-serif">\n`;
    svg += `<style>
.dh{fill:#222}.dt{fill:#fff;font-size:11px;font-weight:800}
.pt{fill:#000;font-size:7px;font-weight:700;text-anchor:middle}
.tt{fill:#888;font-size:6px;text-anchor:end}
.st{font-size:6.5px;font-weight:800;fill:#000}
.sm{font-size:5px;fill:#555}
.si{font-size:5.5px;fill:#333}
.gl{stroke:#e8e8e8;stroke-width:0.4}
.gl2{stroke:#f0f0f0;stroke-width:0.25}
</style>\n\n`;
    svg += `<rect width="${PAGE_W}" height="${PAGE_H}" fill="#fff"/>\n\n`;
    svg += `<text x="${PAGE_W / 2}" y="32" text-anchor="middle" font-size="21" font-weight="900">SESSIONS TIMETABLE</text>\n\n`;

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
        svg += `<text class="dt" x="${(dayW / 2).toFixed(2)}" y="13" text-anchor="middle">${escapeXML(displayDate)}</text>\n\n`;

        places.forEach((place, i) => {
            const cx = gridLeft + colW * (i + 0.5);
            const displayPlace = PLACE_MAP[place] ? PLACE_MAP[place][lang] : place;
            svg += `<text class="pt" x="${cx.toFixed(2)}" y="${PLACE_HEADER_Y}">${escapeXML(displayPlace)}</text>\n`;
        });
        svg += '\n';

        for (let h = START_HOUR; h <= END_HOUR; h++) {
            [0, 30].forEach(m => {
                if (h === END_HOUR && m > 0) return;
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
            // 연사·좌장이 여러 명이면 쉼표로 이어 붙여 한 줄로 표시
            const speaker = (lang === 'KO' ? s.Speaker_KOR : s.Speaker_ENG).filter(Boolean).join(', ');
            const moderator = (lang === 'KO' ? s.Moderator_KOR : s.Moderator_ENG).filter(Boolean).join(', ');

            svg += `<!-- ${escapeXML(s.Place)}: ${escapeXML(title)} ${s.Time} -->\n`;
            svg += `<rect x="${x.toFixed(2)}" y="${yStart.toFixed(2)}" width="${w.toFixed(2)}" height="${boxH.toFixed(2)}" fill="${color.bg}" rx="1"/>\n`;
            svg += `<rect x="${x.toFixed(2)}" y="${yStart.toFixed(2)}" width="${w.toFixed(2)}" height="3" fill="${color.border}" rx="1"/>\n`;
            svg += `<text class="st" x="${(x + 3).toFixed(2)}" y="${(yStart + 11).toFixed(2)}">${escapeXML(title)}</text>\n`;
            svg += `<text class="sm" x="${(x + 3).toFixed(2)}" y="${(yStart + 18).toFixed(2)}">${escapeXML(s.Time)}</text>\n`;
            let ty = yStart + 26;
            if (speaker) { svg += `<text class="si" x="${(x + 3).toFixed(2)}" y="${ty.toFixed(2)}">${escapeXML(speaker)}</text>\n`; ty += 8; }
            if (moderator) { svg += `<text class="si" x="${(x + 3).toFixed(2)}" y="${ty.toFixed(2)}">${escapeXML(moderator)}</text>\n`; }
        });

        svg += `</g>\n\n`;
    });

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
