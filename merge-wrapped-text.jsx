// merge-wrapped-text.jsx
//
// 문제: 다운받은 SVG를 일러스트레이터에서 열면, 웹페이지에서 줄바꿈으로 두 줄이 된
// 세션 제목이 하나의 편집 가능한 텍스트박스가 아니라 줄마다 별개의 point-text
// 오브젝트로 쪼개져서 들어온다. (일러스트레이터 SVG 임포터가 tspan마다 x좌표가
// 있으면 각각을 별개 텍스트 오브젝트로 분리해버리는 동작 때문 - SVG 자체의 결함은
// 아니고 임포트 단계에서 생기는 문제라 이 스크립트로 임포트 이후에 다시 합친다.)
//
// 사용법
//   1) 일러스트레이터에서 합치고 싶은 텍스트 조각들을 선택한다.
//      - 제목 하나만: 줄바꿈된 조각들을 shift-클릭으로 전부 선택
//      - 문서 전체 한 번에: 조각 하나를 클릭 → 오브젝트 > 선택 > 동일 > 크기(폰트 크기)
//        로 같은 크기의 조각을 모두 선택한 뒤 실행 (서로 다른 세션 제목이라도 한 번에 처리됨)
//   2) 파일 > 스크립트 > 기타 스크립트... 로 이 파일을 실행
//
// 같은 x좌표(좌측 기준)이면서 세로 간격이 좁고 글자 크기가 비슷한 조각끼리만
// 자동으로 하나의 그룹으로 묶어 합치므로, 선택 범위에 다른 세션 제목이나
// 발표자 이름처럼 무관한 텍스트가 섞여 있어도 잘못 합쳐지지 않는다.

(function () {
    var doc = app.activeDocument;
    var sel = doc.selection;

    if (!sel || sel.length < 2) {
        alert('합칠 텍스트 조각을 2개 이상 선택한 뒤 다시 실행하세요.\n(같은 제목의 줄바꿈된 조각들, 또는 "선택 > 동일 > 크기"로 고른 전체)');
        return;
    }

    var frames = [];
    for (var i = 0; i < sel.length; i++) {
        if (sel[i].typename === 'TextFrame' && sel[i].kind === TextType.POINTTEXT) {
            frames.push(sel[i]);
        }
    }
    if (frames.length < 2) {
        alert('point-text(점 문자) 오브젝트가 2개 이상 필요합니다.');
        return;
    }

    function info(f) {
        var b = f.geometricBounds; // [left, top, right, bottom], AI 좌표는 위로 갈수록 y가 큼
        var size = 0;
        try { size = f.textRange.characterAttributes.size; } catch (e) {}
        return { frame: f, left: b[0], top: b[1], bottom: b[3], size: size };
    }
    var items = [];
    for (var j = 0; j < frames.length; j++) items.push(info(frames[j]));

    // 왼쪽 x 기준으로 묶고, 같은 x 안에서는 위 -> 아래 순으로 정렬
    items.sort(function (a, b) {
        if (Math.abs(a.left - b.left) > 1) return a.left - b.left;
        return b.top - a.top;
    });

    var groups = [];
    var current = [items[0]];
    for (var k = 1; k < items.length; k++) {
        var prev = current[current.length - 1];
        var it = items[k];
        var sameX = Math.abs(it.left - prev.left) <= 1.5;
        var sizeOk = prev.size === 0 || it.size === 0 || Math.abs(it.size - prev.size) <= prev.size * 0.25;
        var maxGap = Math.max(prev.size, it.size, 6) * 1.8;
        var gap = prev.bottom - it.top;
        if (sameX && sizeOk && gap >= -1 && gap <= maxGap) {
            current.push(it);
        } else {
            groups.push(current);
            current = [it];
        }
    }
    groups.push(current);

    var mergedCount = 0;
    for (var g = 0; g < groups.length; g++) {
        if (groups[g].length < 2) continue;
        var lines = [];
        for (var m = 0; m < groups[g].length; m++) lines.push(groups[g][m].frame.contents);
        groups[g][0].frame.contents = lines.join('\r');
        for (var n = 1; n < groups[g].length; n++) groups[g][n].frame.remove();
        mergedCount++;
    }

    if (mergedCount === 0) {
        alert('인접한 줄로 판단되는 조각을 찾지 못했습니다. 선택 범위를 확인하세요.');
    } else {
        alert(mergedCount + '개의 텍스트를 하나로 합쳤습니다.');
    }
})();
