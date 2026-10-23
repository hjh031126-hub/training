/**
 * 2026 부산대학교 직무연수 - 메인 페이지 로직
 */

document.addEventListener('DOMContentLoaded', () => {
  // 상태 관리 (State)
  let allCourses = [];
  const filters = {
    category: 'all',
    search: '',
    target: 'all',
    requirement: 'all',
    mode: 'all'
  };

  // DOM 요소 참조
  const elGrid = document.getElementById('courseGrid');
  const elResultsCount = document.getElementById('resultsCount');
  const elCategoryChips = document.getElementById('categoryChips');
  const elSearchInput = document.getElementById('searchInput');
  const elBtnClearSearch = document.getElementById('btnClearSearch');
  const elBtnResetFilters = document.getElementById('btnResetFilters');
  const elSelectTarget = document.getElementById('selectTarget');
  const elSelectReq = document.getElementById('selectReq');
  const elSelectMode = document.getElementById('selectMode');
  const elBtnRefresh = document.getElementById('btnRefresh');

  // 통계 DOM 참조
  const elStatTotal = document.getElementById('statTotal');
  const elStatRequired = document.getElementById('statRequired');
  const elStatOffline = document.getElementById('statOffline');
  const elStatAi = document.getElementById('statAi');

  /**
   * 1. 데이터 초기 로드 및 UI 초기화
   */
  async function init() {
    renderSkeletons();
    try {
      allCourses = await SheetAPI.loadTrainingData();
      updateStats();
      renderCategoryChips();
      applyFilters();
    } catch (err) {
      renderError(err.message);
    }
  }

  /**
   * 2. 통계 지표 업데이트
   */
  function updateStats() {
    const total = allCourses.length;
    const required = allCourses.filter(c => (c['이수구분'] || '').includes('필수')).length;
    const offline = allCourses.filter(c => c['교육방식'] === '집합' || c['교육방식'] === '혼합').length;
    const ai = allCourses.filter(c => (c['분야'] || '').includes('AI') || (c['분야'] || '').includes('정보화')).length;

    if (elStatTotal) elStatTotal.textContent = total;
    if (elStatRequired) elStatRequired.textContent = required;
    if (elStatOffline) elStatOffline.textContent = offline;
    if (elStatAi) elStatAi.textContent = ai;
  }

  /**
   * 3. 카테고리 칩 목록 동적 렌더링
   */
  function renderCategoryChips() {
    if (!elCategoryChips) return;

    // 카테고리별 개수 산출
    const categoryCounts = {};
    allCourses.forEach(c => {
      const cat = c['분야'] || '기타';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const categories = Object.keys(categoryCounts).sort();

    let html = `
      <button type="button" class="chip-btn ${filters.category === 'all' ? 'active' : ''}" data-cat="all">
        <span>전체</span>
        <span class="chip-count">${allCourses.length}</span>
      </button>
    `;

    categories.forEach(cat => {
      const count = categoryCounts[cat];
      const isActive = filters.category === cat ? 'active' : '';
      html += `
        <button type="button" class="chip-btn ${isActive}" data-cat="${escapeHtml(cat)}">
          <span>${escapeHtml(cat)}</span>
          <span class="chip-count">${count}</span>
        </button>
      `;
    });

    elCategoryChips.innerHTML = html;

    // 칩 클릭 이벤트 위임
    elCategoryChips.querySelectorAll('.chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        elCategoryChips.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filters.category = btn.getAttribute('data-cat');
        applyFilters();
      });
    });
  }

  /**
   * 4. 다중 필터링 및 검색 연산
   */
  function applyFilters() {
    const query = filters.search.trim().toLowerCase();

    const filtered = allCourses.filter(course => {
      // 분야 필터
      if (filters.category !== 'all' && course['분야'] !== filters.category) {
        return false;
      }

      // 대상 필터
      if (filters.target !== 'all' && !(course['대상'] || '').includes(filters.target)) {
        return false;
      }

      // 이수구분 필터
      if (filters.requirement !== 'all' && !(course['이수구분'] || '').includes(filters.requirement)) {
        return false;
      }

      // 교육방식 필터
      if (filters.mode !== 'all' && course['교육방식'] !== filters.mode) {
        return false;
      }

      // 통합 검색 (과정명, 코드, 한줄소개, 담당부서, 주요내용)
      if (query) {
        const title = (course['과정명'] || '').toLowerCase();
        const code = (course['과정코드'] || '').toLowerCase();
        const desc = (course['한줄소개'] || '').toLowerCase();
        const dept = (course['담당부서'] || '').toLowerCase();
        const content = (course['주요내용'] || '').toLowerCase();

        const match = title.includes(query) ||
                      code.includes(query) ||
                      desc.includes(query) ||
                      dept.includes(query) ||
                      content.includes(query);
        if (!match) return false;
      }

      return true;
    });

    renderCourseCards(filtered);
  }

  /**
   * 5. 카드 그리드 렌더링
   */
  function renderCourseCards(courses) {
    if (elResultsCount) {
      elResultsCount.innerHTML = `총 <strong>${courses.length}</strong>개의 직무연수 과정이 안내 중입니다.`;
    }

    if (courses.length === 0) {
      elGrid.innerHTML = `
        <div class="empty-state">
          <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div class="empty-title">일치하는 연수 과정이 없습니다</div>
          <div class="empty-desc">검색어의 철자를 확인하거나 다른 필터 조건을 선택해 보세요.</div>
          <button type="button" class="btn-card-detail" style="max-width: 180px; margin: 0 auto;" id="btnResetInEmpty">필터 초기화</button>
        </div>
      `;

      const btnEmptyReset = document.getElementById('btnResetInEmpty');
      if (btnEmptyReset) {
        btnEmptyReset.addEventListener('click', resetAllFilters);
      }
      return;
    }

    let html = '';
    courses.forEach(c => {
      const code = c['과정코드'] || '';
      const title = c['과정명'] || '연수 과정명 미정';
      const category = c['분야'] || '직무공통';
      const req = c['이수구분'] || '선택';
      const mode = c['교육방식'] || '온라인';
      const time = c['교육시간'] || '-';
      const capacity = c['정원'] || '제한없음';
      const period = c['교육기간'] || '상시';
      const dept = c['담당부서'] || '부산대학교';
      const summary = c['한줄소개'] || '과정 상세 안내를 확인하세요.';
      const applyUrl = c['신청링크'] || '#';

      // 이수구분 뱃지 스타일 분기
      let reqBadgeClass = 'badge-optional';
      if (req.includes('필수')) reqBadgeClass = 'badge-required';
      else if (req.includes('권장')) reqBadgeClass = 'badge-recommended';

      html += `
        <article class="course-card">
          <div class="card-badges">
            <span class="badge ${reqBadgeClass}">${escapeHtml(req)}</span>
            <span class="badge badge-mode">${escapeHtml(mode)}</span>
            <span class="badge" style="background:#e0f2fe; color:#0369a1;">${escapeHtml(category)}</span>
            <span class="card-code">${escapeHtml(code)}</span>
          </div>

          <h3 class="card-title">
            <a href="detail.html?id=${encodeURIComponent(code)}">${escapeHtml(title)}</a>
          </h3>

          <p class="card-desc">${escapeHtml(summary)}</p>

          <div class="card-meta-list">
            <div class="meta-item">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span>시간: <strong>${escapeHtml(time)}</strong></span>
            </div>
            <div class="meta-item">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
              <span>정원: <strong>${escapeHtml(capacity)}</strong></span>
            </div>
            <div class="meta-item">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              <span>기간: <strong>${escapeHtml(period)}</strong></span>
            </div>
            <div class="meta-item">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
              <span>부서: <strong>${escapeHtml(dept)}</strong></span>
            </div>
          </div>

          <div class="card-actions">
            <a href="detail.html?id=${encodeURIComponent(code)}" class="btn-card-detail">
              <span>상세보기</span>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </a>
            <a href="${escapeHtml(applyUrl)}" target="_blank" rel="noopener noreferrer" class="btn-card-link" title="수강신청 바로가기">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            </a>
          </div>
        </article>
      `;
    });

    elGrid.innerHTML = html;
  }

  /**
   * 6. 스켈레톤 로딩 렌더링
   */
  function renderSkeletons() {
    let html = '';
    for (let i = 0; i < 6; i++) {
      html += `
        <div class="skeleton-card">
          <div style="display:flex; gap:8px;">
            <div class="skeleton-line" style="width: 50px; height: 22px;"></div>
            <div class="skeleton-line" style="width: 60px; height: 22px;"></div>
          </div>
          <div class="skeleton-line" style="width: 80%; height: 24px; margin-top: 8px;"></div>
          <div class="skeleton-line" style="width: 100%; height: 38px; margin-top: 4px;"></div>
          <div class="skeleton-line" style="width: 100%; height: 60px; margin-top: 12px; border-radius: 8px;"></div>
          <div class="skeleton-line" style="width: 100%; height: 40px; margin-top: 8px; border-radius: 8px;"></div>
        </div>
      `;
    }
    elGrid.innerHTML = html;
  }

  /**
   * 7. 에러 상태 렌더링
   */
  function renderError(message) {
    elGrid.innerHTML = `
      <div class="empty-state" style="border-color: #fca5a5; background: #fff5f5;">
        <svg class="empty-icon" style="color:#ef4444;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <div class="empty-title" style="color:#b91c1c;">데이터를 불러오는 중 오류가 발생했습니다</div>
        <div class="empty-desc">${escapeHtml(message)}</div>
        <button type="button" class="btn-card-detail" style="max-width: 180px; margin: 0 auto; background:#b91c1c;" onclick="location.reload()">새로고침</button>
      </div>
    `;
  }

  /**
   * 8. 전체 필터 리셋
   */
  function resetAllFilters() {
    filters.category = 'all';
    filters.search = '';
    filters.target = 'all';
    filters.requirement = 'all';
    filters.mode = 'all';

    if (elSearchInput) elSearchInput.value = '';
    if (elSelectTarget) elSelectTarget.value = 'all';
    if (elSelectReq) elSelectReq.value = 'all';
    if (elSelectMode) elSelectMode.value = 'all';

    if (elCategoryChips) {
      elCategoryChips.querySelectorAll('.chip-btn').forEach(btn => {
        if (btn.getAttribute('data-cat') === 'all') btn.classList.add('active');
        else btn.classList.remove('active');
      });
    }

    applyFilters();
  }

  /**
   * 9. 이벤트 리스너 등록
   */
  // 검색어 디바운스
  let debounceTimer = null;
  if (elSearchInput) {
    elSearchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        filters.search = e.target.value;
        applyFilters();
      }, 150);
    });
  }

  // 검색어 초기화 버튼
  if (elBtnClearSearch) {
    elBtnClearSearch.addEventListener('click', () => {
      if (elSearchInput) elSearchInput.value = '';
      filters.search = '';
      applyFilters();
    });
  }

  // 전체 필터 초기화 버튼
  if (elBtnResetFilters) {
    elBtnResetFilters.addEventListener('click', resetAllFilters);
  }

  // 드롭다운 필터 변경 이벤트
  if (elSelectTarget) {
    elSelectTarget.addEventListener('change', (e) => {
      filters.target = e.target.value;
      applyFilters();
    });
  }

  if (elSelectReq) {
    elSelectReq.addEventListener('change', (e) => {
      filters.requirement = e.target.value;
      applyFilters();
    });
  }

  if (elSelectMode) {
    elSelectMode.addEventListener('change', (e) => {
      filters.mode = e.target.value;
      applyFilters();
    });
  }

  // 실시간 다시 불러오기 버튼
  if (elBtnRefresh) {
    elBtnRefresh.addEventListener('click', async () => {
      elBtnRefresh.classList.add('spinning');
      await init();
      setTimeout(() => {
        elBtnRefresh.classList.remove('spinning');
      }, 600);
    });
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

  // 최초 실행
  init();
});
