import { HttpError } from '../lib/errors.js';

// Parses req[source] with a zod schema and replaces it with the parsed value.
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return next(new HttpError(400, 'Validation failed', result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }))));
  }
  if (source === 'query') req.validQuery = result.data;
  else req[source] = result.data;
  next();
};
