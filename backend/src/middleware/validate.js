// backend/src/middleware/validate.js
// Factory de validação com Zod — uso: validate(schema) como middleware

/**
 * Retorna middleware que valida req.body contra o schema Zod.
 * Em caso de erro, retorna 422 com detalhes.
 *
 * @param {import('zod').ZodSchema} schema
 * @returns {import('express').RequestHandler}
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(422).json({
        error: true,
        message: 'Dados inválidos',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    // Substitui body pelos dados validados/transformados
    req.body = result.data;
    next();
  };
}

module.exports = validate;
