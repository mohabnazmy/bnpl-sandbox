/**
 * Domain errors — carry no HTTP knowledge. The HTTP layer (error middleware)
 * maps each subclass to a status code, keeping the core transport-agnostic.
 */
export class DomainError extends Error {}
export class ConflictError extends DomainError {}      // -> 409
export class NotFoundError extends DomainError {}      // -> 404
export class AuthError extends DomainError {}          // -> 401
export class BusinessRuleError extends DomainError {}  // -> 422
