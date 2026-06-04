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
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. ";

const MEDIA_TYPES = new Set(['image', 'video', 'audio', 'file']);

function makeFiller(length: number): string {
  if (length <= 0) return '';
  let s = '';
  while (s.length < length) s += LOREM;
  return s.slice(0, length);
}

function intersects(viewer: Set<number>, required: number[]): boolean {
  for (const id of required) if (viewer.has(id)) return true;
  return false;
}

function resolveRequired(
  block: Block,
  blockAudienceMap: Record<string, number[]>,
  postDefault: number[],
): number[] {
  if (
    block.id &&
    Object.prototype.hasOwnProperty.call(blockAudienceMap, block.id)
  ) {
    return blockAudienceMap[block.id] ?? [];
  }
  return postDefault;
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
        out[key] = makeFiller(v.length);
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
      cloned[key] = makeFiller(v.length);
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
  postDefault: number[],
  maskedIds: string[],
): { masked: Block } {
  const required = resolveRequired(block, blockAudienceMap, postDefault);
  const visible =
    !required ||
    required.length === 0 ||
    intersects(viewerGroupIds, required);

  if (visible) {
    if (block.children?.length) {
      const maskedChildren = block.children.map(
        (child) =>
          processBlock(
            child,
            viewerGroupIds,
            blockAudienceMap,
            postDefault,
            maskedIds,
          ).masked,
      );
      return { masked: { ...block, children: maskedChildren } };
    }
    return { masked: block };
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
  postDefaultGroupIds: number[] = [],
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
  const masked = blocks.map((block) =>
    processBlock(
      block,
      viewerGroupIds,
      blockAudienceMap,
      postDefaultGroupIds,
      maskedIds,
    ).masked,
  );

  return {
    maskedJson: JSON.stringify(masked),
    maskedBlockIds: maskedIds,
  };
}
