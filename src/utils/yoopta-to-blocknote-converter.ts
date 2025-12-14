/**
 * BlockNote 블록 타입 정의
 */
export interface BlockNoteBlock {
  id: string;
  type: string;
  props?: Record<string, any>;
  content?: BlockNoteInlineContent[] | BlockNoteTableContent;
  children?: BlockNoteBlock[];
}

export interface BlockNoteInlineContent {
  type: 'text' | 'link';
  text: string;
  styles?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    code?: boolean;
  };
  href?: string;
}

export interface BlockNoteTableContent {
  type: 'tableContent';
  rows: {
    cells: BlockNoteInlineContent[][];
  }[];
}

/**
 * HTML 태그 정보
 */
interface ParsedTag {
  tagName: string;
  attributes: Record<string, string>;
  content: string;
  fullMatch: string;
}

/**
 * YooptaEditor HTML을 BlockNote JSON 포맷으로 변환하는 유틸리티
 */
export class YooptaToBlockNoteConverter {
  private blockIdCounter = 0;

  /**
   * 고유한 블록 ID 생성
   */
  private generateBlockId(): string {
    return `block-${Date.now()}-${this.blockIdCounter++}`;
  }

  /**
   * HTML 태그의 속성 파싱
   */
  private parseAttributes(attributeString: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    const attrRegex = /(\w+)=["']([^"']*)["']/g;
    let match;

    while ((match = attrRegex.exec(attributeString)) !== null) {
      attributes[match[1]] = match[2];
    }

    return attributes;
  }

  /**
   * HTML 엔티티 디코딩
   */
  private decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&lt;': '<',
      '&gt;': '>',
      '&amp;': '&',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' ',
    };

    return text.replace(/&[^;]+;/g, (entity) => entities[entity] || entity);
  }

  /**
   * HTML 태그 제거 및 텍스트 추출
   */
  private stripHtmlTags(html: string): string {
    return this.decodeHtmlEntities(html.replace(/<[^>]*>/g, ''));
  }

  /**
   * 인라인 스타일을 가진 텍스트 파싱
   */
  private parseInlineContent(html: string): BlockNoteInlineContent[] {
    const result: BlockNoteInlineContent[] = [];

    // 링크 처리
    const linkRegex = /<a\s+([^>]*?)>([^<]*)<\/a>/g;
    let lastIndex = 0;
    let match;

    const tempHtml = html;
    while ((match = linkRegex.exec(tempHtml)) !== null) {
      // 링크 이전 텍스트
      if (match.index > lastIndex) {
        const beforeText = tempHtml.substring(lastIndex, match.index);
        const plainText = this.stripHtmlTags(beforeText);
        if (plainText) {
          result.push({
            type: 'text',
            text: plainText,
          });
        }
      }

      // 링크
      const attributes = this.parseAttributes(match[1]);
      const linkText = this.stripHtmlTags(match[2]);
      if (linkText) {
        result.push({
          type: 'link',
          text: linkText,
          href: attributes.href || '',
        });
      }

      lastIndex = match.index + match[0].length;
    }

    // 남은 텍스트 처리
    if (lastIndex < tempHtml.length) {
      const remainingText = this.stripHtmlTags(tempHtml.substring(lastIndex));
      if (remainingText) {
        result.push({
          type: 'text',
          text: remainingText,
        });
      }
    }

    // 결과가 비어있으면 원본 텍스트 사용
    if (result.length === 0) {
      const plainText = this.stripHtmlTags(html);
      if (plainText) {
        result.push({
          type: 'text',
          text: plainText,
        });
      }
    }

    return result;
  }

  /**
   * 단일 HTML 태그 파싱
   */
  private parseTag(tagName: string, html: string): ParsedTag | null {
    const regex = new RegExp(
      `<${tagName}([^>]*)>([\\s\\S]*?)<\\/${tagName}>`,
      'i',
    );
    const match = regex.exec(html);

    if (!match) return null;

    return {
      tagName,
      attributes: this.parseAttributes(match[1]),
      content: match[2],
      fullMatch: match[0],
    };
  }

  /**
   * HTML을 BlockNote 블록으로 변환
   */
  private convertHtmlToBlocks(html: string): BlockNoteBlock[] {
    const blocks: BlockNoteBlock[] = [];

    // Paragraph
    const pRegex = /<p\s+([^>]*)>([\s\S]*?)<\/p>/gi;
    let match;

    while ((match = pRegex.exec(html)) !== null) {
      const content = this.parseInlineContent(match[2]);
      if (content.length > 0 || match[2].trim()) {
        blocks.push({
          id: this.generateBlockId(),
          type: 'paragraph',
          content: content.length > 0 ? content : [{ type: 'text', text: '' }],
        });
      }
    }

    // Headings
    const h1Regex = /<h1\s+([^>]*)>([\s\S]*?)<\/h1>/gi;
    while ((match = h1Regex.exec(html)) !== null) {
      blocks.push({
        id: this.generateBlockId(),
        type: 'heading',
        props: { level: 1 },
        content: this.parseInlineContent(match[2]),
      });
    }

    const h2Regex = /<h2\s+([^>]*)>([\s\S]*?)<\/h2>/gi;
    while ((match = h2Regex.exec(html)) !== null) {
      blocks.push({
        id: this.generateBlockId(),
        type: 'heading',
        props: { level: 2 },
        content: this.parseInlineContent(match[2]),
      });
    }

    const h3Regex = /<h3\s+([^>]*)>([\s\S]*?)<\/h3>/gi;
    while ((match = h3Regex.exec(html)) !== null) {
      blocks.push({
        id: this.generateBlockId(),
        type: 'heading',
        props: { level: 3 },
        content: this.parseInlineContent(match[2]),
      });
    }

    // Lists (ul)
    const ulRegex = /<ul\s+([^>]*)>([\s\S]*?)<\/ul>/gi;
    while ((match = ulRegex.exec(html)) !== null) {
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      const listItems = [];
      let liMatch;

      while ((liMatch = liRegex.exec(match[2])) !== null) {
        listItems.push(this.parseInlineContent(liMatch[1]));
      }

      listItems.forEach((itemContent) => {
        blocks.push({
          id: this.generateBlockId(),
          type: 'bulletListItem',
          content: itemContent,
        });
      });
    }

    // Lists (ol)
    const olRegex = /<ol\s+([^>]*)>([\s\S]*?)<\/ol>/gi;
    while ((match = olRegex.exec(html)) !== null) {
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      const listItems = [];
      let liMatch;

      while ((liMatch = liRegex.exec(match[2])) !== null) {
        listItems.push(this.parseInlineContent(liMatch[1]));
      }

      listItems.forEach((itemContent) => {
        blocks.push({
          id: this.generateBlockId(),
          type: 'numberedListItem',
          content: itemContent,
        });
      });
    }

    // Code blocks
    const preRegex = /<pre\s+([^>]*)>([\s\S]*?)<\/pre>/gi;
    while ((match = preRegex.exec(html)) !== null) {
      const attributes = this.parseAttributes(match[1]);
      const codeContent = this.stripHtmlTags(match[2]);

      blocks.push({
        id: this.generateBlockId(),
        type: 'code',
        props: {
          language: attributes['data-language'] || 'javascript',
        },
        content: [
          {
            type: 'text',
            text: codeContent,
          },
        ],
      });
    }

    // Images (img tag)
    const imgRegex = /<img\s+([^>]*?)(?:\/>|><\/img>)/gi;
    while ((match = imgRegex.exec(html)) !== null) {
      const attributes = this.parseAttributes(match[1]);

      blocks.push({
        id: this.generateBlockId(),
        type: 'image',
        props: {
          url: attributes.src || '',
          caption: attributes.alt || '',
          ...(attributes.width && { width: parseInt(attributes.width) }),
          ...(attributes.height && { height: parseInt(attributes.height) }),
        },
      });
    }

    // Images in div wrappers
    const divImgRegex =
      /<div[^>]*>\s*<img\s+([^>]*?)(?:\/>|><\/img>)\s*<\/div>/gi;
    while ((match = divImgRegex.exec(html)) !== null) {
      const attributes = this.parseAttributes(match[1]);

      blocks.push({
        id: this.generateBlockId(),
        type: 'image',
        props: {
          url: attributes.src || '',
          caption: attributes.alt || '',
          ...(attributes.width && { width: parseInt(attributes.width) }),
          ...(attributes.height && { height: parseInt(attributes.height) }),
        },
      });
    }

    // Horizontal rules
    const hrRegex = /<hr[^>]*>/gi;
    while ((match = hrRegex.exec(html)) !== null) {
      blocks.push({
        id: this.generateBlockId(),
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: '---',
          },
        ],
      });
    }

    // Tables
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    while ((match = tableRegex.exec(html)) !== null) {
      const rows: { cells: BlockNoteInlineContent[][] }[] = [];
      const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let trMatch;

      while ((trMatch = trRegex.exec(match[1])) !== null) {
        const cells: BlockNoteInlineContent[][] = [];
        const tdRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
        let tdMatch;

        while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
          cells.push(this.parseInlineContent(tdMatch[1]));
        }

        if (cells.length > 0) {
          rows.push({ cells });
        }
      }

      if (rows.length > 0) {
        blocks.push({
          id: this.generateBlockId(),
          type: 'table',
          content: {
            type: 'tableContent',
            rows,
          },
        });
      }
    }

    return blocks;
  }

  /**
   * YooptaEditor HTML을 BlockNote JSON으로 변환
   * @param html YooptaEditor에서 생성된 HTML 문자열
   * @returns BlockNote JSON 배열
   */
  public convert(html: string): BlockNoteBlock[] {
    if (!html || !html.trim()) {
      return [
        {
          id: this.generateBlockId(),
          type: 'paragraph',
          content: [],
        },
      ];
    }

    // body 또는 yoopta-clipboard 태그 내부 컨텐츠 추출
    const bodyMatch =
      html.match(/<body[^>]*>([\s\S]*?)<\/body>/i) ||
      html.match(/id="yoopta-clipboard"[^>]*>([\s\S]*?)<\/body>/i);

    const contentHtml = bodyMatch ? bodyMatch[1] : html;

    // HTML을 BlockNote 블록으로 변환
    const blocks = this.convertHtmlToBlocks(contentHtml);

    // 블록이 비어있으면 기본 paragraph 추가
    if (blocks.length === 0) {
      return [
        {
          id: this.generateBlockId(),
          type: 'paragraph',
          content: [{ type: 'text', text: '' }],
        },
      ];
    }

    // 블록을 생성 순서대로 정렬 (HTML에서 나타나는 순서대로)
    return this.sortBlocksByAppearance(blocks, contentHtml);
  }

  /**
   * HTML에서 나타나는 순서대로 블록 정렬
   */
  private sortBlocksByAppearance(
    blocks: BlockNoteBlock[],
    html: string,
  ): BlockNoteBlock[] {
    // 각 블록의 HTML에서의 위치를 찾아서 정렬
    const blocksWithPosition = blocks.map((block) => {
      let position = -1;

      if (block.type === 'paragraph' && block.content) {
        const content = Array.isArray(block.content)
          ? block.content
          : [block.content];
        const text = content
          .filter((c): c is BlockNoteInlineContent => 'text' in c)
          .map((c) => c.text)
          .join('');
        position = html.indexOf(text);
      } else if (block.type === 'heading' && block.content) {
        const content = Array.isArray(block.content)
          ? block.content
          : [block.content];
        const text = content
          .filter((c): c is BlockNoteInlineContent => 'text' in c)
          .map((c) => c.text)
          .join('');
        position = html.indexOf(text);
      } else if (block.type === 'image' && block.props?.url) {
        position = html.indexOf(block.props.url);
      }

      return { block, position };
    });

    return blocksWithPosition
      .sort((a, b) => {
        if (a.position === -1) return 1;
        if (b.position === -1) return -1;
        return a.position - b.position;
      })
      .map((item) => item.block);
  }
}

/**
 * YooptaEditor HTML을 BlockNote JSON으로 변환하는 헬퍼 함수
 * @param html YooptaEditor HTML 문자열
 * @returns BlockNote JSON 문자열
 */
export function convertYooptaToBlockNote(html: string): string {
  const converter = new YooptaToBlockNoteConverter();
  const blocks = converter.convert(html);
  return JSON.stringify(blocks);
}
