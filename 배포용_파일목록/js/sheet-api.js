/**
 * 2026 부산대학교 직무연수 - Google Sheets 실시간 데이터 연동 모듈
 */

const SHEET_CONFIG = {
  sheetId: '1gsoUPjuOwNd3jqEYtcTiPk6hLlu-R9kc',
  sheetName: 'data',
  get csvUrl() {
    // 캐시 방지(Cache-Busting)를 위한 타임스탬프 추가 및 GViz header=1 옵션 적용
    const timestamp = Date.now();
    return `https://docs.google.com/spreadsheets/d/${this.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(this.sheetName)}&headers=1&_t=${timestamp}`;
  }
};

/**
 * 구글 시트에서 실시간 CSV를 가져와 JSON 배열로 파싱
 * @returns {Promise<Array<Object>>}
 */
async function loadTrainingData() {
  const url = SHEET_CONFIG.csvUrl;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-cache',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`구글 시트 데이터를 불러오지 못했습니다. (상태 코드: ${response.status})`);
    }

    const csvText = await response.text();
    
    // PapaParse를 통한 CSV 파싱 (쉼표, 개행, 따옴표 지원)
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (header) => header.trim(),
        complete: function(results) {
          if (results.errors && results.errors.length > 0) {
            console.warn('CSV 파싱 경고:', results.errors);
          }
          
          // 유효한 데이터 정제
          const cleanData = results.data
            .filter(row => row['과정코드'] && row['과정코드'].trim() !== '')
            .map(row => {
              const cleaned = {};
              for (const [key, val] of Object.entries(row)) {
                cleaned[key] = typeof val === 'string' ? val.trim() : val;
              }
              return cleaned;
            });

          // 로컬 스토리지에 캐시 백업 (네트워크 일시 오류 시 복구용)
          try {
            localStorage.setItem('pnu_training_cache', JSON.stringify({
              timestamp: Date.now(),
              data: cleanData
            }));
          } catch (e) {
            // QuotaExceededError 등 무시
          }

          resolve(cleanData);
        },
        error: function(err) {
          reject(err);
        }
      });
    });

  } catch (error) {
    console.error('실시간 데이터 패치 실패:', error);
    
    // 오프라인 / 네트워크 에러 시 캐시 데이터 폴백
    const cached = localStorage.getItem('pnu_training_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        console.warn('로컬 캐시 데이터를 대체 사용합니다.');
        return parsed.data;
      } catch (e) {}
    }
    
    throw error;
  }
}

// 모듈 및 전역 객체 등록
window.SheetAPI = {
  loadTrainingData,
  SHEET_CONFIG
};
