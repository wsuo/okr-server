export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export class PaginationUtil {
  static paginate<T>(
    items: T[],
    total: number,
    query: PaginationQuery,
  ): PaginatedResult<T> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  static getSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }
}