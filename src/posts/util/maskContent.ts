// BlockNote 블록 콘텐츠의 audience 기반 마스킹.
// 차단된 블록은 구조/타입을 유지한 채 텍스트/미디어 url만 같은 길이 더미로 치환한다.
// 프론트는 응답에 같이 오는 maskedBlockIds를 보고 해당 블록을 블러 처리한다.

type Block = {
  id?: string;
  type?: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: Block[];
};

const LOREM =
  "춤은 안 췄고? 내 물음에 그녀는 심술궃게 웃더니 고개를 저었다. 너처럼 춤 못 추는 사람 처음 봤어. 나는 춤추는 시늉을 했고 우리는 소리 죽여 웃었다. 웃음을 그쳤을 때 그녀가 입을 열었다. 내가 춤을 추면 사람들이 웃어. 그러면 마음이 아프거든. 어둠 속에서, 하민의 얼굴 위로 고속도로 가로등 빛이 스쳐지나갔다. 그렇게 마음이 아프면 편해지는 게 있었어. 그래서 그랬어. 지금도 하민을 떠올릴 때면 그때의 그 얼굴이 생각난다. 그래서 그랬어, 속삭이듯이 말하던 그 얼굴이. 랄도. 하민이 내 이름을 부르고 잠시 머뭇거렸다. 응? 네 시간이야. 뭐가? 아치디에서 라페스트까지. 하민은 그 말을 하고 나를 빤히 쳐다봤다. 왜 나를 찾아왔니. 나는 뭐라고 대답해야 하는지 알지 못했다. 나조차도 그 이유를 알 수 없었으니까. 연락이 안 되니까 걱정되잖아. 그렇게 말하고 나는 그녀의 시선을 피해 창밖을 바라봤다. 대화가 끊기자 운전사가 엑셀을 밟아 엔진을 가속하는 소리만 들렸다. 이어지다가 끊어지고, 이어지다가 끊어지는 기계의 소리가. 얼마 지나지 않아 우리는 둘 다 잠이 들었다. 내가 하민의 어깨에, 하민이 내 머리에 기댄 채로 잤다. 하민을 향한 나의 마음은 담백한 종류의 것이었다. 하민의 얼굴에서도 나를 향한 여분의 감정은 발견할 수 없었다. 나는 하민에게 그 이상을 기대하지 않았고 하민도 그랬다. 우리 둘 중 누구라도 상대를 사랑했다면 그 사실을 눈치챌 수밖에 없었을 것이라고 그때의 나는 생각했다. 우리 사이에는 그 어떤 긴장도, 설렘도, 실망도, 좌절도, 배타적 소유에 대한 갈망도 존재하지 않았으니까. 내가 그녀를 사랑했다면 그런 식으로 잠들 수는 없었을 것이다. 나는 오래도록 그렇게 생각했다. ";

const MEDIA_TYPES = new Set(['image', 'video', 'audio', 'file']);

// 문자열 해시 — 블록마다 더미 시작 위치를 변주하되 요청 간 안정적으로(원문 기반).
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

// LOREM을 seed 위치부터 순환하며 length만큼 확보(짧으면 감싸서 반복). 시작점 변주로 균질감 완화.
function makeFiller(length: number, seed = 0): string {
  if (length <= 0) return '';
  const start = ((seed % LOREM.length) + LOREM.length) % LOREM.length;
  let s = '';
  let i = start;
  while (s.length < length) {
    s += LOREM[i];
    i = (i + 1) % LOREM.length;
  }
  return s.slice(0, length);
}

function intersects(viewer: Set<number>, required: number[]): boolean {
  for (const id of required) if (viewer.has(id)) return true;
  return false;
}

function resolveRequired(
  block: Block,
  blockAudienceMap: Record<string, number[]>,
): number[] {
  if (
    block.id &&
    Object.prototype.hasOwnProperty.call(blockAudienceMap, block.id)
  ) {
    return blockAudienceMap[block.id] ?? [];
  }
  return [];
}

// 인라인 마스킹: 텍스트 노드의 styles.masked 값(콤마조인 groupId)을 파싱.
function parseMaskGroups(v: unknown): number[] | null {
  if (typeof v !== 'string' || v.length === 0) return null;
  return v
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n));
}

function readMaskedStyle(obj: Record<string, unknown>): unknown {
  const styles = obj['styles'];
  return styles && typeof styles === 'object'
    ? (styles as Record<string, unknown>)['masked']
    : undefined;
}

/**
 * visible 블록의 인라인 content에서 styles.masked 구간을 viewer 권한 기준으로 처리.
 * - 권한 있음(그룹 교집합/빈 그룹): masked 스타일 제거 → 원문 노출.
 * - 권한 없음: text를 더미로 치환하고 masked 스타일 유지 → 프론트가 블러.
 * link 노드는 안쪽 content로 재귀.
 */
function maskInlineRuns(content: unknown, viewer: Set<number>): unknown {
  if (!Array.isArray(content)) return content;
  return content.map((node) => {
    if (!node || typeof node !== 'object') return node;
    const obj = node as Record<string, unknown>;
    if (obj['type'] === 'link') {
      return { ...obj, content: maskInlineRuns(obj['content'], viewer) };
    }
    if (obj['type'] === 'text') {
      const required = parseMaskGroups(readMaskedStyle(obj));
      if (required === null) return node; // 마스크 없음
      const authorized =
        required.length === 0 || intersects(viewer, required);
      if (authorized) {
        const styles = { ...(obj['styles'] as Record<string, unknown>) };
        delete styles.masked;
        return { ...obj, styles };
      }
      const text = typeof obj['text'] === 'string' ? obj['text'] : '';
      return { ...obj, text: makeFiller(text.length, hashStr(text)) };
    }
    return node;
  });
}

/**
 * inline content / table content 등 내부에 박힌 텍스트와 링크를 재귀적으로 마스킹.
 * - { type: "text", text: "..." } → 같은 길이 더미로
 * - { type: "link", href: "...", content: [...] } → href는 "#", 안쪽 텍스트는 재귀
 */
function deepMaskText(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(deepMaskText);
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      const v = obj[key];
      if (
        key === 'text' &&
        typeof v === 'string' &&
        obj['type'] === 'text'
      ) {
        out[key] = makeFiller(v.length, hashStr(v));
      } else if (
        key === 'href' &&
        typeof v === 'string' &&
        obj['type'] === 'link'
      ) {
        out[key] = '#';
      } else {
        out[key] = deepMaskText(v);
      }
    }
    return out;
  }
  return node;
}

/**
 * 미디어 블록의 url을 빈 문자열로, caption/name은 같은 길이 더미로.
 */
function maskProps(
  type: string | undefined,
  props: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!props) return props;
  const cloned: Record<string, unknown> = { ...props };
  if (type && MEDIA_TYPES.has(type) && typeof cloned.url === 'string') {
    cloned.url = '';
  }
  for (const key of ['caption', 'name']) {
    const v = cloned[key];
    if (typeof v === 'string' && v.length > 0) {
      cloned[key] = makeFiller(v.length, hashStr(v));
    }
  }
  return cloned;
}

function maskBlockContent(block: Block): Block {
  return {
    ...block,
    props: maskProps(block.type, block.props),
    content: deepMaskText(block.content),
    children: block.children?.map(maskBlockContent),
  };
}

function processBlock(
  block: Block,
  viewerGroupIds: Set<number>,
  blockAudienceMap: Record<string, number[]>,
  maskedIds: string[],
): { masked: Block } {
  const required = resolveRequired(block, blockAudienceMap);
  const visible =
    !required ||
    required.length === 0 ||
    intersects(viewerGroupIds, required);

  if (visible) {
    // 블록은 보이지만, 안의 인라인 masked 구간은 뷰어 권한 기준으로 처리.
    const content = maskInlineRuns(block.content, viewerGroupIds);
    if (block.children?.length) {
      const maskedChildren = block.children.map(
        (child) =>
          processBlock(child, viewerGroupIds, blockAudienceMap, maskedIds)
            .masked,
      );
      return { masked: { ...block, content, children: maskedChildren } };
    }
    return { masked: { ...block, content } };
  }

  // 차단: 텍스트/미디어를 더미로 치환하고, 블록 id를 maskedIds에 기록
  if (block.id) maskedIds.push(block.id);
  return { masked: maskBlockContent(block) };
}

/**
 * BlockNote 콘텐츠 JSON 문자열을 viewer 그룹 기준으로 마스킹한다.
 * 파싱 실패 시 원본을 그대로 둔다(레거시 콘텐츠 보호).
 */
export function maskContent(
  contentJson: string,
  viewerGroupIds: Set<number>,
  blockAudienceMap: Record<string, number[]> = {},
): {
  maskedJson: string;
  maskedBlockIds: string[];
} {
  if (!contentJson) {
    return { maskedJson: contentJson, maskedBlockIds: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(contentJson);
  } catch {
    return { maskedJson: contentJson, maskedBlockIds: [] };
  }

  if (!Array.isArray(parsed)) {
    return { maskedJson: contentJson, maskedBlockIds: [] };
  }

  const blocks = parsed as Block[];
  const maskedIds: string[] = [];
  const masked = blocks.map(
    (block) =>
      processBlock(block, viewerGroupIds, blockAudienceMap, maskedIds).masked,
  );

  return {
    maskedJson: JSON.stringify(masked),
    maskedBlockIds: maskedIds,
  };
}

// 인라인 masked 스타일의 그룹id를 블록 content에서 재귀 수집(link content 포함).
function collectInlineGroups(node: unknown, acc: Set<number>): void {
  if (Array.isArray(node)) {
    node.forEach((n) => collectInlineGroups(n, acc));
    return;
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    if (obj['type'] === 'text') {
      const g = parseMaskGroups(readMaskedStyle(obj));
      if (g) g.forEach((id) => acc.add(id));
    }
    if ('content' in obj) collectInlineGroups(obj['content'], acc);
  }
}

/**
 * content JSON에서 블록별 인라인 masked 그룹id를 뽑는다(라벨 병합용).
 * 반환: { [blockId]: number[] } — 인라인 마스크가 있는 블록만.
 */
export function extractInlineAudience(
  contentJson: string,
): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  if (!contentJson) return out;
  let parsed: unknown;
  try {
    parsed = JSON.parse(contentJson);
  } catch {
    return out;
  }
  if (!Array.isArray(parsed)) return out;

  const walk = (block: Block): void => {
    if (block.id) {
      const acc = new Set<number>();
      collectInlineGroups(block.content, acc);
      if (acc.size > 0) out[block.id] = [...acc];
    }
    block.children?.forEach(walk);
  };
  (parsed as Block[]).forEach(walk);
  return out;
}
