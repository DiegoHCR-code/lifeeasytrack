import jwt, {
  type Secret,
  type SignOptions,
  type JwtPayload,
} from "jsonwebtoken";

type SignTokenOptions = {
  secret: Secret;
  expiresIn: SignOptions["expiresIn"];
};

export function signToken(userId: string, opts: SignTokenOptions) {
  return jwt.sign({ sub: userId }, opts.secret, { expiresIn: opts.expiresIn });
}

export function verifyToken<T extends JwtPayload = JwtPayload>(
  token: string,
  secret: Secret,
) {
  return jwt.verify(token, secret) as T;
}
