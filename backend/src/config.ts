import 'dotenv/config';

function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`missing required env var: ${key}`);
  return v;
}

export const config = {
  port: parseInt(process.env.PORT || '7483', 10),
  jwtSecret: required('JWT_SECRET'),
  databaseUrl: required('DATABASE_URL'),
};
