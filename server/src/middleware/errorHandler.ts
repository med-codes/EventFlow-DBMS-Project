import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

// Global error handler for Express
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Handle schema validation errors from Zod
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation error',
      errors: err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
    });
  }

  // Handle PostgreSQL specific errors
  if (err.code === '23505') {
    return res.status(409).json({ message: 'Record already exists (unique constraint violation)', detail: err.detail });
  }
  if (err.code === '23503') {
    return res.status(400).json({ message: 'Referenced entity not found (foreign key violation)', detail: err.detail });
  }

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'Internal server error',
  });
};
