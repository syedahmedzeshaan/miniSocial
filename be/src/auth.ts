import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const jwt_secret = process.env.JWT_SECRET!;

export function auth(req: Request, res: Response, next: NextFunction) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({
            message: "Authorization header missing"
        });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({
            message: "Token missing"
        });
    }
    try {
        const payload = jwt.verify(token, jwt_secret);

        if (typeof payload === "string") {
            return res.status(401).json({
                message: "Invalid token"
            });
        }

        req.userId = payload.userid as number;
        next();
    } catch {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}