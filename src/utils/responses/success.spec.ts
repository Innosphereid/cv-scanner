import { SuccessBuilder } from './success';

describe('SuccessBuilder', () => {
  it('builds a success response with pagination and metadata', () => {
    const res = new SuccessBuilder<{ id: number; name: string }[]>()
      .message('Data retrieved successfully')
      .data([
        { id: 1, name: 'Example Item 1' },
        { id: 2, name: 'Example Item 2' },
      ])
      .metadata({ request_id: 'abc123', execution_time: 12 })
      .pagination({ page: 1, per_page: 10, total: 50, total_pages: 5 })
      .status(200)
      .build();

    expect(res).toEqual(
      expect.objectContaining({
        status: 'success',
        message: 'Data retrieved successfully',
        data: [
          { id: 1, name: 'Example Item 1' },
          { id: 2, name: 'Example Item 2' },
        ],
        metadata: { request_id: 'abc123', execution_time: 12 },
        pagination: { page: 1, per_page: 10, total: 50, total_pages: 5 },
        status_code: 200,
      }),
    );
  });

  it('builds a GET detail response without pagination', () => {
    const res = new SuccessBuilder<{ id: number; name: string }>()
      .message('Data retrieved successfully')
      .data({ id: 1, name: 'Example Item 1' })
      .metadata({ request_id: 'abc124', execution_time: 8 })
      .status(200)
      .build();

    expect(res).toEqual(
      expect.objectContaining({
        status: 'success',
        message: 'Data retrieved successfully',
        data: { id: 1, name: 'Example Item 1' },
        metadata: { request_id: 'abc124', execution_time: 8 },
        pagination: null,
        status_code: 200,
      }),
    );
  });

  it('builds a POST create response with 201', () => {
    const res = new SuccessBuilder<{ id: number; name: string }>()
      .message('Data created successfully')
      .data({ id: 101, name: 'New Item' })
      .metadata({ request_id: 'abc125', execution_time: 15 })
      .status(201)
      .build();

    expect(res.status_code).toBe(201);
    expect(res.data).toEqual({ id: 101, name: 'New Item' });
    expect(res.pagination).toBeNull();
  });

  it('builds a PUT update response', () => {
    const res = new SuccessBuilder<{ id: number; name: string }>()
      .message('Data updated successfully')
      .data({ id: 101, name: 'Updated Item' })
      .metadata({ request_id: 'abc126', execution_time: 20 })
      .status(200)
      .build();

    expect(res.status_code).toBe(200);
    expect(res.data).toEqual({ id: 101, name: 'Updated Item' });
  });

  it('builds a DELETE response with null data', () => {
    const res = new SuccessBuilder<null>()
      .message('Data deleted successfully')
      .data(null)
      .metadata({ request_id: 'abc127', execution_time: 10 })
      .status(200)
      .build();

    expect(res.status_code).toBe(200);
    expect(res.data).toBeNull();
  });

  it('builds a GET list response with cursor pagination', () => {
    const res = new SuccessBuilder<Array<{ id: number }>>()
      .message('Data retrieved successfully')
      .data([{ id: 1 }, { id: 2 }])
      .metadata({ request_id: 'cursor1', execution_time: 6 })
      .pagination({ next_cursor: 'nxt', prev_cursor: null, per_page: 10, total: 50 })
      .status(200)
      .build();

    expect(res.pagination).toEqual({ next_cursor: 'nxt', prev_cursor: null, per_page: 10, total: 50 });
  });
});


