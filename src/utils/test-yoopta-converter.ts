import { convertYooptaToBlockNote } from './yoopta-to-blocknote-converter';

/**
 * YooptaEditor → BlockNote 변환기 테스트 스크립트
 *
 * 실행 방법:
 * ts-node -r tsconfig-paths/register src/utils/test-yoopta-converter.ts
 */

// 테스트 샘플 1: 기본 텍스트와 헤딩
const sample1 = `
<body id="yoopta-clipboard" data-editor-id="ea3ddb61-aab0-4f59-b012-ea979a987ca1">
  <p data-meta-align="left" data-meta-depth="0" style="margin-left: 0px; text-align: left">SQL 문제: 2005년 5월 29일 ~ 30일 사이에 반납된 영화의 아이디와 이름을 구하시오.</p>
  <h3 data-meta-align="left" data-meta-depth="0" style="margin-left: 0px; text-align: left">1. 테이블을 모두 JOIN 후 GROUP BY로 중복제거</h3>
  <p data-meta-align="left" data-meta-depth="0" style="margin-left: 0px; text-align: left">처음 내가 낸 답은 정직하게 모든 테이블을 조인하고 WHERE 조건을 적용하는 것이었다.</p>
</body>
`;

// 테스트 샘플 2: 코드 블록
const sample2 = `
<body id="yoopta-clipboard">
  <h2 data-meta-align="left">코드 예시</h2>
  <pre data-theme="VSCode" data-language="sql" data-meta-align="left" data-meta-depth="0" style="margin-left: 0px; display: flex; width: 100%; justify-content: flex-start; background-color: #263238; color: #fff; padding: 20px 24px; white-space: pre-line;"><code>SELECT film.film_id, title FROM rental
INNER JOIN inventory ON rental.inventory_id = inventory.inventory_id
INNER JOIN film ON inventory.film_id = film.film_id
WHERE return_date >= '2005-05-29' AND return_date < '2005-05-31'</code></pre>
</body>
`;

// 테스트 샘플 3: 이미지
const sample3 = `
<body id="yoopta-clipboard">
  <p data-meta-align="left">이미지 테스트</p>
  <div style="margin-left: 0px; display: flex; width: 100%; justify-content: center;">
    <img data-meta-align="center" data-meta-depth="0" src="https://bumang-blog-s3-storage.s3.ap-northeast-2.amazonaws.com/prod/thumbnails/1760454419356_postgresql-starter.png" alt="s3_image" width="628" height="389" objectFit="contain"/>
  </div>
</body>
`;

// 테스트 샘플 4: 링크
const sample4 = `
<body id="yoopta-clipboard">
  <p data-meta-align="left">링크 테스트 <a href="https://news.hada.io/topic?id=16448" target="_self" rel="noopener noreferrer" style="color: rgb(0 122 255); cursor: pointer; position: relative; text-decoration-line: underline; text-underline-offset: 4px;">(관련링크)</a> 입니다.</p>
</body>
`;

// 테스트 샘플 5: 리스트
const sample5 = `
<body id="yoopta-clipboard">
  <h3>리스트 테스트</h3>
  <ul data-meta-align="left" data-meta-depth="0" style="margin-left: 0px; text-align: left">
    <li><strong style="font-weight: bolder;">빠른 앱 시작 속도: </strong>JS 코드를 실행 전에 미리 바이트코드로 컴파일합니다.</li>
    <li><strong style="font-weight: bolder;">낮은 메모리 사용량: </strong>모바일 환경에 최적화되어 있습니다.</li>
    <li><strong style="font-weight: bolder;">JSI 기본 지원: </strong>새로운 아키텍처의 기반입니다.</li>
  </ul>
</body>
`;

// 테스트 샘플 6: 테이블
const sample6 = `
<body id="yoopta-clipboard">
  <table style="margin-left: 0px; text-align: left">
    <colgroup>
      <col style="width: 200px" />
      <col style="width: 200px" />
      <col style="width: 200px" />
    </colgroup>
    <tbody>
      <tr>
        <th data-width="200" rowspan="1" colspan="1">구분</th>
        <th data-width="200" rowspan="1" colspan="1">Fire and Forget</th>
        <th data-width="200" rowspan="1" colspan="1">RPC</th>
      </tr>
      <tr>
        <td data-width="200" rowspan="1" colspan="1"><strong style="font-weight: bolder;">request_id</strong></td>
        <td data-width="200" rowspan="1" colspan="1">✅ 포함</td>
        <td data-width="200" rowspan="1" colspan="1">❌ 미포함</td>
      </tr>
    </tbody>
  </table>
</body>
`;

// 테스트 실행
function runTest(name: string, html: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`테스트: ${name}`);
  console.log('='.repeat(80));

  try {
    const result = convertYooptaToBlockNote(html);
    const parsed = JSON.parse(result);

    console.log(`✅ 변환 성공`);
    console.log(`블록 개수: ${parsed.length}`);
    console.log('\n변환 결과:');
    console.log(JSON.stringify(parsed, null, 2));
  } catch (error) {
    console.error(`❌ 변환 실패:`, error);
  }
}

// 모든 테스트 실행
function runAllTests() {
  console.log('\n🚀 YooptaEditor → BlockNote 변환 테스트 시작\n');

  runTest('기본 텍스트와 헤딩', sample1);
  runTest('코드 블록', sample2);
  runTest('이미지', sample3);
  runTest('링크', sample4);
  runTest('리스트', sample5);
  runTest('테이블', sample6);

  console.log('\n' + '='.repeat(80));
  console.log('🎉 모든 테스트 완료!');
  console.log('='.repeat(80) + '\n');
}

// 스크립트 실행
if (require.main === module) {
  runAllTests();
}

export { runAllTests };
