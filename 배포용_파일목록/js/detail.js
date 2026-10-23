/**
 * 2026 부산대학교 직무연수 - 상세 페이지 로직
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM 요소 참조
  const elLoading = document.getElementById('detailLoading');
  const elContent = document.getElementById('detailContent');
  const elError = document.getElementById('detailError');
  const elErrorMessage = document.getElementById('errorMessage');

  const elBcCategory = document.getElementById('bcCategory');
  const elBcCode = document.getElementById('bcCode');

  const elBadges = document.getElementById('detailBadges');
  const elTitle = document.getElementById('detailTitle');
  const elSummary = document.getElementById('detailSummary');
  const elBodyDesc = document.getElementById('detailBodyDesc');
  const elObjectives = document.getElementById('detailObjectives');
  const elCurriculum = document.getElementById('detailCurriculum');

  const elSideTime = document.getElementById('sideTime');
  const elSideMode = document.getElementById('sideMode');
  const elSideCapacity = document.getElementById('sideCapacity');
  const elSideTarget = document.getElementById('sideTarget');
  const elSidePeriod = document.getElementById('sidePeriod');
  const elSideApplyPeriod = document.getElementById('sideApplyPeriod');
  const elSideDept = document.getElementById('sideDept');
  const elSideContact = document.getElementById('sideContact');
  const elBtnApplyLink = document.getElementById('btnApplyLink');

  const elRelatedSection = document.querySelector('.related-courses-section');
  const elRelatedGrid = document.getElementById('relatedCoursesGrid');

  // URL에서 과정코드(?id=PNU-2026-xxx) 파싱
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get('id');

  if (!courseId) {
    showError('조회할 과정코드가 지정되지 않았습니다.');
    return;
  }

  try {
    const allCourses = await SheetAPI.loadTrainingData();
    const course = allCourses.find(c => c['과정코드'] === courseId.trim());

    if (!course) {
      showError(`과정코드 "${escapeHtml(courseId)}"에 해당하는 연수 정보를 찾을 수 없습니다.`);
      return;
    }

    renderCourseDetail(course, allCourses);
  } catch (err) {
    showError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
  }

  /**
   * 상세 정보 화면 렌더링
   */
  function renderCourseDetail(course, allCourses) {
    const code = course['과정코드'] || '';
    const title = course['과정명'] || '과정명 미정';
    const category = course['분야'] || '직무연수';
    const req = course['이수구분'] || '선택';
    const mode = course['교육방식'] || '온라인';
    const time = course['교육시간'] || '-';
    const capacity = course['정원'] || '제한없음';
    const period = course['교육기간'] || '상시';
    const applyPeriod = course['신청기간'] || '상시';
    const target = course['대상'] || '전 직원';
    const dept = course['담당부서'] || '부산대학교';
    const contact = course['문의'] || '-';
    const summary = course['한줄소개'] || '';
    const desc = course['상세소개'] || summary;
    const goals = course['학습목표'] || '';
    const content = course['주요내용'] || '';
    const applyUrl = course['신청링크'] || '#';

    // 브라우저 탭 타이틀 변경
    document.title = `${title} (${code}) - 2026 부산대학교 직무연수`;

    // 브레드크럼
    elBcCategory.textContent = category;
    elBcCode.textContent = `${code} ${title}`;

    // 상단 뱃지
    let reqBadgeClass = 'badge-optional';
    if (req.includes('필수')) reqBadgeClass = 'badge-required';
    else if (req.includes('권장')) reqBadgeClass = 'badge-recommended';

    elBadges.innerHTML = `
      <span class="badge ${reqBadgeClass}">${escapeHtml(req)}</span>
      <span class="badge badge-mode">${escapeHtml(mode)}</span>
      <span class="badge" style="background:#e0f2fe; color:#0369a1;">${escapeHtml(category)}</span>
      <span class="card-code">${escapeHtml(code)}</span>
    `;

    // 헤더 타이틀 및 소개
    elTitle.textContent = title;
    elSummary.textContent = summary;
    elBodyDesc.textContent = desc;

    // 학습 목표 체크리스트 파싱 ('·' 기준 분리)
    const goalList = goals.split(/[·\n]/).map(g => g.trim()).filter(g => g.length > 0);
    if (goalList.length > 0) {
      elObjectives.innerHTML = goalList.map(goal => `
        <li class="objective-item">
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          <span>${escapeHtml(goal)}</span>
        </li>
      `).join('');
    } else {
      elObjectives.innerHTML = `<li class="objective-item" style="color:var(--text-muted);">등록된 상세 학습목표가 없습니다.</li>`;
    }

    // 주요 교육 모듈 파싱 ('·' 기준 분리)
    const contentList = content.split(/[·\n]/).map(c => c.trim()).filter(c => c.length > 0);
    if (contentList.length > 0) {
      elCurriculum.innerHTML = contentList.map((item, idx) => `
        <div class="curriculum-chip">
          <span class="curriculum-chip-num">${idx + 1}</span>
          <span>${escapeHtml(item)}</span>
        </div>
      `).join('');
    } else {
      elCurriculum.innerHTML = `<div class="curriculum-chip" style="color:var(--text-muted);">상세 커리큘럼은 과정 운영 계획서를 참고하세요.</div>`;
    }

    // 우측 사이드바 메타 정보
    elSideTime.textContent = time;
    elSideMode.textContent = mode;
    elSideCapacity.textContent = capacity;
    elSideTarget.textContent = target;
    elSidePeriod.textContent = period;
    elSideApplyPeriod.textContent = applyPeriod;
    elSideDept.textContent = dept;
    elSideContact.textContent = contact;

    // 신청 CTA 링크 연결
    if (applyUrl && applyUrl !== '#') {
      elBtnApplyLink.href = applyUrl;
      elBtnApplyLink.style.display = 'flex';
    } else {
      elBtnApplyLink.style.display = 'none';
    }

    // 동일 분야 추천 과정 렌더링 (최대 3개)
    const related = allCourses
      .filter(c => c['분야'] === category && c['과정코드'] !== code)
      .slice(0, 3);

    if (related.length > 0) {
      renderRelatedCourses(related);
      if (elRelatedSection) elRelatedSection.style.display = 'block';
    } else {
      if (elRelatedSection) elRelatedSection.style.display = 'none';
    }

    // 로딩 해제 및 컨텐츠 표시
    elLoading.style.display = 'none';
    elContent.style.display = 'block';
  }

  /**
   * 동일 분야 추천 카드 렌더링
   */
  function renderRelatedCourses(courses) {
    if (!elRelatedGrid) return;

    let html = '';
    courses.forEach(c => {
      const rCode = c['과정코드'] || '';
      const rTitle = c['과정명'] || '';
      const rReq = c['이수구분'] || '선택';
      const rMode = c['교육방식'] || '온라인';
      const rSummary = c['한줄소개'] || '';
      const rTime = c['교육시간'] || '-';
      const rDept = c['담당부서'] || '';

      let rBadgeClass = 'badge-optional';
      if (rReq.includes('필수')) rBadgeClass = 'badge-required';
      else if (rReq.includes('권장')) rBadgeClass = 'badge-recommended';

      html += `
        <article class="course-card">
          <div class="card-badges">
            <span class="badge ${rBadgeClass}">${escapeHtml(rReq)}</span>
            <span class="badge badge-mode">${escapeHtml(rMode)}</span>
            <span class="card-code">${escapeHtml(rCode)}</span>
          </div>

          <h4 class="card-title" style="font-size:16px;">
            <a href="detail.html?id=${encodeURIComponent(rCode)}">${escapeHtml(rTitle)}</a>
          </h4>

          <p class="card-desc" style="font-size:13px; height:38px;">${escapeHtml(rSummary)}</p>

          <div class="card-meta-list" style="margin-bottom:14px; padding:8px 12px;">
            <div class="meta-item"><span>시간: <strong>${escapeHtml(rTime)}</strong></span></div>
            <div class="meta-item"><span>부서: <strong>${escapeHtml(rDept)}</strong></span></div>
          </div>

          <a href="detail.html?id=${encodeURIComponent(rCode)}" class="btn-card-detail" style="height:36px; font-size:13px;">
            <span>과정 상세보기</span>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </a>
        </article>
      `;
    });

    elRelatedGrid.innerHTML = html;
  }

  /**
   * 에러 표시
   */
  function showError(msg) {
    elLoading.style.display = 'none';
    elContent.style.display = 'none';
    elError.style.display = 'block';
    if (elErrorMessage) elErrorMessage.textContent = msg;
  }

  // XSS 방지 유틸
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
});
