// ... (상단 변수 및 데이터 로드 부분은 동일하므로 생략, PDF 버튼 로직 위주로 교체하세요) ...

// PDF 다운로드 버튼 로직 (수정됨)
document.getElementById('download-pdf-btn').onclick = () => {
    const btn = document.getElementById('download-pdf-btn');
    const el = document.getElementById('timetable-content');
    
    if (!el) return;

    const originalText = btn.innerText;
    btn.innerText = "PDF 생성 중...";
    btn.disabled = true;

    // 현재 스크롤 위치 저장
    const scrollY = window.scrollY;
    window.scrollTo(0, 0);

    const opt = {
        margin: 0,
        filename: 'timetable_A3.pdf',
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { 
            scale: 2, 
            useCORS: true, 
            logging: false,
            // [핵심] 복제된 문서에서 스타일을 강제 조정 (사용자 화면엔 영향 없음)
            onclone: (clonedDoc) => {
                const clonedEl = clonedDoc.getElementById('timetable-content');
                clonedEl.style.margin = "0";
                clonedEl.style.position = "relative";
                clonedEl.style.left = "0";
                clonedEl.style.top = "0";
                clonedEl.style.boxShadow = "none";
                clonedEl.style.visibility = "visible";
            }
        },
        jsPDF: { unit: 'mm', format: 'a3', orientation: 'landscape', compress: true },
        pagebreak: { mode: 'avoid-all' }
    };

    // html2pdf 실행
    html2pdf().from(el).set(opt).save().then(() => {
        btn.innerText = originalText;
        btn.disabled = false;
        window.scrollTo(0, scrollY); // 스크롤 위치 복구
    }).catch(err => {
        console.error("PDF 에러:", err);
        btn.innerText = "실패 (재시도)";
        btn.disabled = false;
        window.scrollTo(0, scrollY);
    });
};

// [확인] 국문/영문 버튼 리스너 (기존 로직 유지 및 보완)
document.getElementById('btn-ko').onclick = function() {
    currentLang = 'KO';
    this.classList.add('active');
    document.getElementById('btn-en').classList.remove('active');
    renderTimetable();
};

const btnEn = document.getElementById('btn-en');
if(btnEn) {
    btnEn.onclick = function() {
        currentLang = 'EN';
        this.classList.add('active');
        document.getElementById('btn-ko').classList.remove('active');
        renderTimetable();
    };
}

// 초기 데이터 로드 호출
loadGoogleSheetData();
