import { ErrorBuilder } from './fail';

describe('ErrorBuilder', () => {
  it('builds an error response with errors and metadata', () => {
    const res = new ErrorBuilder()
      .message('Validation failed')
      .errors([
        {
          code: 'VALIDATION_ERROR',
          message: "The field 'name' is required",
          field: 'name',
        },
      ])
      .metadata({ request_id: 'abc128', execution_time: 5 })
      .status(400)
      .build();

    expect(res).toEqual(
      expect.objectContaining({
        status: 'error',
        message: 'Validation failed',
        errors: [
          {
            code: 'VALIDATION_ERROR',
            message: "The field 'name' is required",
            field: 'name',
          },
        ],
        metadata: { request_id: 'abc128', execution_time: 5 },
        status_code: 400,
      }),
    );
  });

  it('supports multiple error items', () => {
    const res = new ErrorBuilder()
      .message('Multiple errors')
      .errors([
        { code: 'VALIDATION_ERROR', message: 'name is required', field: 'name' },
        { code: 'VALIDATION_ERROR', message: 'email is invalid', field: 'email' },
      ])
      .metadata({ request_id: 'abc999', execution_time: 7 })
      .status(400)
      .build();

    expect(res.errors).toHaveLength(2);
  });

  it('allows adding errors incrementally', () => {
    const res = new ErrorBuilder()
      .message('Incremental errors')
      .addError({ code: 'NOT_FOUND', message: 'Resource not found' })
      .addError({ code: 'UNAUTHORIZED', message: 'Token missing' })
      .metadata({ request_id: 'abc777', execution_time: 9 })
      .status(401)
      .build();

    expect(res.errors).toEqual([
      { code: 'NOT_FOUND', message: 'Resource not found' },
      { code: 'UNAUTHORIZED', message: 'Token missing' },
    ]);
    expect(res.status_code).toBe(401);
  });
});


