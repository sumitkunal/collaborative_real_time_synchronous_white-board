import express from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common";
import { middleware } from "./middleware";
import { createuserSchema, siginSchema, createRoomSchema } from "@repo/common";
import { prisma as prismaClient } from "@repo/db";
import bcrypt from "bcrypt";
import { applySecurity } from "@repo/security";

const app = express();
app.use(express.json());
applySecurity(app, { corsOrigin: process.env.FRONTEND_ORIGIN });

app.post("/signup", async (req, res) => {
	const parsedData = createuserSchema.safeParse(req.body);
	if (!parsedData.success) {
		return res.status(400).json({ error: "Invalid data" });
	}
	const passwordHash = await bcrypt.hash(parsedData.data.password, 10);
	parsedData.data.password = passwordHash;
	try {
		const user = await prismaClient.user.create({
			data: {
				email: parsedData.data.email,
				name: parsedData.data.username,
				password: parsedData.data.password,
			},
		});
		res.status(201).json(user);
		console.log("User created:", user);
	} catch (error) {
		res.status(500).json({ error: "Failed to create user" });
	}
});

app.post("/signin", async (req, res) => {
	const data = siginSchema.safeParse(req.body);
	if (!data.success) {
		return res.status(400).json({ error: "Invalid data" });
	}
	const user = await prismaClient.user.findUnique({
		where: { email: data.data.username },
	});
	if (!user) {
		return res.status(404).json({ error: "User not found" });
	}
	const isPasswordValid = await bcrypt.compare(data.data.password, user.password);
	if (!isPasswordValid) {
		return res.status(401).json({ error: "Invalid password" });
	}
	const token = jwt.sign(
		{
			userId: user.id,
		},
		JWT_SECRET,
	);
	res.json({ token });
});

app.get("/rooms", middleware, async (req, res) => {
	try {
		const userId = (req as any).userId as string;

		const ownedRooms = await prismaClient.room.findMany({
			where: { adminId: userId },
			select: { id: true, slug: true, adminId: true },
		});

		const participatedRooms = await prismaClient.room.findMany({
			where: { chats: { some: { userId } } },
			select: { id: true, slug: true, adminId: true },
		});

		const byId: Record<number, { id: number; slug: string; adminId: string; isAdmin: boolean }> = {};
		for (const r of [...ownedRooms, ...participatedRooms]) {
			byId[r.id] = { id: r.id, slug: r.slug, adminId: r.adminId, isAdmin: r.adminId === userId };
		}
		const rooms = Object.values(byId).map((r) => ({ id: r.id, slug: r.slug, isAdmin: r.isAdmin }));
		res.json({ rooms });
	} catch (e) {
		res.status(500).json({ error: "Failed to fetch rooms" });
	}
});

app.post("/room", middleware, async (req, res) => {
	const data = createRoomSchema.safeParse(req.body);
	if (!data.success) {
		return res.status(400).json({ error: "Invalid data" });
	}
	const userId = (req as any).userId;
	try {
		const room = await prismaClient.room.create({
			data: {
				slug: data.data.name,
				adminId: userId,
			},
		});
		res.json({ roomId: room.id });
	} catch (e) {
		res.status(411).json({
			message: "room name already exist",
		});
	}
});

app.get("/chats/:roomName", async (req, res) => {
	const roomSlug = req.params.roomName;
	const room = await prismaClient.room.findUnique({
		where: { slug: roomSlug },
	});
	if (!room) {
		return res.status(404).json({ error: "Room not found" });
	}
	const roomId = room.id;
	if (!roomId) {
		return res.status(400).json({ error: "Room ID is required" });
	}
	try {
		const chats = await prismaClient.chat.findMany({
			where: { roomId },
			orderBy: { id: "desc" },
			take: 50,
		});
		res.json(chats);
	} catch (error) {
		res.status(500).json({ error: "Failed to fetch chats" });
	}
});

const PORT = Number(process.env.HTTP_PORT) || 3001;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});