export type TPagination = {
    totalPages: number;
    totalCount: number;
    currentPage: number;
    pageSize?: number;
    data: any[];
    items?: any[];
    pageNumber?: number;
    totalItems?: number;
};

export const ResetPagination: TPagination = {
    totalPages: 0,
    totalCount: 0,
    currentPage: 0,
    pageSize: 10,
    data: [],
    items: [],
    pageNumber: 1,
    totalItems: 0
};