// Generates editable SVG timetable(s) from the live Google Sheet data.
// Mirrors the parsing/layout logic in script.js so the SVG matches the live web app.
// Usage: node generate-svg.js

const fs = require('fs');

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

const PLACE_COLOR = {
    "장충아레나": { bg: '#fdecea', border: '#c62828' },
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

function timeToY(timeStr, trackTop, trackH) {
    if (!timeStr || !timeStr.includes(':')) return trackTop;
    const [h, m] = timeStr.split(':').map(Number);
    const timeInHours = h + (m / 60);
    return trackTop + ((timeInHours - START_HOUR) / TOTAL_HOURS) * trackH;
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
        let obj = {};
        headers.forEach((h, i) => { if (h) obj[h] = row[i]; });
        return obj;
    });

    return globalRawData;
}

function buildValidData(globalRawData) {
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

    validData.sort((a, b) => {
        if (a.Date !== b.Date) return a.Date.localeCompare(b.Date);
        const idxA = PLACE_ORDER.indexOf(a.Place);
        const idxB = PLACE_ORDER.indexOf(b.Place);
        const placeCompare = (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
        if (placeCompare !== 0) return placeCompare;
        return a.StartTime.localeCompare(b.StartTime);
    });

    return validData;
}

function buildSVG(validData, lang) {
    const dates = [...new Set(validData.map(d => d.Date))];
    const allPlaces = [...new Set(validData.map(d => d.Place))].sort((a, b) => {
        return PLACE_ORDER.indexOf(a) - PLACE_ORDER.indexOf(b);
    });

    // Layout constants (A3 landscape, mm==px scale as in original hand-authored SVG)
    const PAGE_W = 1190.55, PAGE_H = 841.89;
    const MARGIN_X = 28, TOP_Y = 50;
    const DAY_GAP = 12;
    const dayCount = dates.length || 1;
    const dayW = (PAGE_W - MARGIN_X * 2 - DAY_GAP * (dayCount - 1)) / dayCount;

    const HEADER_H = 18;
    const PLACE_HEADER_Y = 30;
    const TRACK_TOP = 35;
    const TRACK_H = 720; // 08:00-20:00 -> 60px/hour
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
        const displayDate = DATE_MAP[date] ? DATE_MAP[date][lang] : date;

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
            const speaker = lang === 'KO' ? s.Speaker_KOR : s.Speaker_ENG;
            const moderator = lang === 'KO' ? s.Moderator_KOR : s.Moderator_ENG;

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
        console.error('유효한 데이터를 찾지 못했습니다. 시트 헤더(날짜/장소/시작시간 등)를 확인하세요.');
        process.exit(1);
    }

    const koSvg = buildSVG(validData, 'KO');
    fs.writeFileSync('timetable_ko.svg', koSvg, 'utf8');
    console.log('timetable_ko.svg 생성 완료');

    const enSvg = buildSVG(validData, 'EN');
    fs.writeFileSync('timetable_en.svg', enSvg, 'utf8');
    console.log('timetable_en.svg 생성 완료');
})();
