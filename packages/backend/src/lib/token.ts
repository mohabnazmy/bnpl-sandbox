import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface TokenPayload { sub: string; }

export const signToken = (userId: string): string =>
  jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: '7d' });

export const verifyToken = (token: string): TokenPayload =>
  jwt.verify(token, config.jwtSecret) as TokenPayload;
