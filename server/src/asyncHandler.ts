/** Wraps an async Express handler so a rejected promise (e.g. a Postgres
 * query error) becomes a 500 response instead of an unhandled rejection
 * that could hang the request or crash the process. */
export function asyncHandler(fn: (req: any, res: any, next?: any) => Promise<unknown>) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error(err);
      if (!res.headersSent) res.status(500).json({ error: 'internal_error' });
    });
  };
}
