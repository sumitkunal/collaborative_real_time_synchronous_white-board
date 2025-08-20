import type { Request, Response, NextFunction, Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common";

export function createCors(origin?: string | RegExp | (string | RegExp)[]) {
	const resolvedOrigin = origin ?? (process.env.FRONTEND_ORIGIN || "http://localhost:3000");
	return cors({ origin: resolvedOrigin, credentials: true });
}

export function createHelmet() {
	return helmet();
}

export function createRateLimiter() {
	return rateLimit({
		windowMs: 15 * 60 * 1000,
		limit: 100,
		standardHeaders: "draft-7",
		legacyHeaders: false,
	});
}

export function verifyJwt(token: string): JwtPayload | null {
	try {
		return jwt.verify(token, JWT_SECRET) as JwtPayload;
	} catch {
		return null;
	}
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
	const header = (req.headers.authorization || "").toString();
	const token = header.startsWith("Bearer ") ? header.slice(7) : header;
	if (!token) {
		return res.status(401).json({ error: "No authorization token provided" });
	}
	const decoded = verifyJwt(token);
	if (!decoded || typeof (decoded as any).userId !== "string") {
		return res.status(401).json({ error: "Invalid token" });
	}
	(req as any).userId = (decoded as any).userId;
	next();
}

export function applySecurity(app: Express, options?: { corsOrigin?: string | RegExp | (string | RegExp)[] }) {
	app.use(createHelmet());
	app.use(createRateLimiter());
	app.use(createCors(options?.corsOrigin));
}

