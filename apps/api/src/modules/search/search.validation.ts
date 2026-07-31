import { ValidationError } from '../../common/errors';

export const SEARCH_TYPES = ['tasks', 'projects', 'members'] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

export interface GlobalSearchQuery {
  query: string;
  types: SearchType[];
  limit: number;
}

function readSingleValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

export function validateGlobalSearchQuery(query: Record<string, unknown>): GlobalSearchQuery {
  const searchTerm = readSingleValue(query.q)?.trim();
  if (!searchTerm) throw new ValidationError('Vui lòng nhập từ khóa tìm kiếm.');
  if (searchTerm.length > 100) {
    throw new ValidationError('Từ khóa tìm kiếm không được vượt quá 100 ký tự.');
  }

  const rawTypes = readSingleValue(query.types);
  const types = rawTypes
    ? Array.from(new Set(rawTypes.split(',').map((type) => type.trim()).filter(Boolean)))
    : [...SEARCH_TYPES];
  const invalidType = types.find((type) => !SEARCH_TYPES.includes(type as SearchType));
  if (invalidType) {
    throw new ValidationError(
      `Loại kết quả "${invalidType}" không hợp lệ. Chỉ hỗ trợ: ${SEARCH_TYPES.join(', ')}.`,
    );
  }

  const rawLimit = readSingleValue(query.limit);
  const limit = rawLimit === undefined ? 5 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw new ValidationError('Giới hạn kết quả phải là số nguyên từ 1 đến 20.');
  }

  return { query: searchTerm, types: types as SearchType[], limit };
}
