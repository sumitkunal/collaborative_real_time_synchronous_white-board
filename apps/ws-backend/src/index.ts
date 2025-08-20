import { WebSocketServer, WebSocket } from "ws";
import { verifyJwt } from "@repo/security";
import { prisma as prismaClient } from "@repo/db";

const PORT = Number(process.env.WS_PORT) || 8080;
const wss = new WebSocketServer({ port: PORT });

interface User {
	ws: WebSocket;
	userId: string;
	rooms: string[];
}

const users: User[] = [];

wss.on("connection", (ws: WebSocket, request) => {
	const url = request.url;
	if (!url) {
		ws.close(1008, "No URL provided");
		return;
	}

	const queryParams = new URLSearchParams(url.split("?")[1]);
	const token = queryParams.get("token");

	if (!token) {
		ws.close(1008, "No token provided");
		return;
	}

	const decoded = verifyJwt(token);
	if (!decoded || !decoded.userId || typeof decoded.userId !== "string") {
		ws.close(1008, "Invalid or expired token");
		return;
	}

	const userId = decoded.userId as string;
	users.push({ ws, userId, rooms: [] });
	console.log(`New WebSocket connection for user: ${userId} (total connections: ${users.filter((u) => u.userId === userId).length})`);

	ws.on("message", async (message: string | Buffer) => {
		try {
			let data: any;
			if (typeof message === "string") {
				data = JSON.parse(message);
			} else {
				data = JSON.parse(message.toString());
			}

			const userConnections = users.filter((u) => u.userId === userId);
			if (userConnections.length === 0) {
				console.error(`No connections found for user ${userId}`);
				return;
			}

			if ((data.type === "join_Room" || data.type === "join_room") && typeof data.roomId === "string") {
				userConnections.forEach((connection) => {
					if (!connection.rooms.includes(data.roomId)) {
						connection.rooms.push(data.roomId);
					}
				});
				console.log(`User ${userId} joined room ${data.roomId} on ${userConnections.length} connection(s)`);
			} else if ((data.type === "leave_Room" || data.type === "leave_room") && typeof data.roomId === "string") {
				userConnections.forEach((connection) => {
					const roomIndex = connection.rooms.indexOf(data.roomId);
					if (roomIndex !== -1) {
						connection.rooms.splice(roomIndex, 1);
					}
				});
				console.log(`User ${userId} left room ${data.roomId} on ${userConnections.length} connection(s)`);
			}
			else if(data.message === "clear_room" && typeof data.roomId === "string") {
				console.log(`User ${userId} requested to clear room ${data.roomId}`);
				prismaClient.chat.deleteMany({
					where: {
						room: {
							slug: data.roomId,
						},
					},
				}).then(() => {
					console.log(`Cleared all messages in room ${data.roomId}`);
				}).catch((err) => {
					console.error(`Error clearing room ${data.roomId}:`, err);
				});
				const roomUsers = users.filter((u) => u.rooms.includes(data.roomId));
				roomUsers.forEach((u) => {
					if (u.ws.readyState === WebSocket.OPEN) {
						u.ws.send(JSON.stringify({ type: "clear_room", roomId: data.roomId }));
					}
				});
				console.log(`User ${userId} cleared room ${data.roomId}`);
			} 
			else if (data.type === "message" && typeof data.roomId === "string" && typeof data.content === "string") {
				const userInRoom = userConnections.some((connection) => connection.rooms.includes(data.roomId));
				if (!userInRoom) {
					console.log(`User ${userId} tried to send message to room ${data.roomId} but is not a member`);
					return;
				}

				// console.log(`User ${userId} sending message to room ${data.roomId}: ${data.content}`);
				// console.log(`Total users connected: ${users.length}`);
				// console.log(`Current user: ${userId}`);
				// console.log(`Current user connections: ${userConnections.length}`);
				// userConnections.forEach((connection, idx) => {
				// 	console.log(`  Connection ${idx}: Rooms: [${connection.rooms.join(", ")}]`);
				// });
				const roomUsers = users.filter((u) => u.rooms.includes(data.roomId));
				// console.log(`Message content: ${data.content} from user: ${userId}`);

				let x = await prismaClient.room.findUnique({
					where: { slug: data.roomId },
				});
				const roomId = x?.id;
				let flag: boolean = false;
				if (roomId === undefined) {
					// console.error(`Room with slug ${data.roomId} not found. Message not saved.`);
				} else {
					// console.log(`Found room with ID: ${roomId}, saving message to database...`);
					let x = await prismaClient.chat
						.create({
							data: {
								roomId: roomId,
								userId: userId,
								message: data.content,
							},
						})
						.catch((err) => {
							console.error("Error saving message to database:", err);
						});
					if (x) {
						flag = true;
						console.log(`Message saved successfully to database with ID: ${x.id}`);
					}
				}
				if (flag) {
					roomUsers.forEach((u) => {
						if (u.ws.readyState === WebSocket.OPEN) {
							const messageToSend = JSON.stringify({
								type: "message",
								roomId: data.roomId,
								content: data.content,
								userId: userId,
							});
							u.ws.send(messageToSend);
							// console.log(`Sent message to user ${u.userId} connection`);
						}
					});
				}
			}
		} catch (err) {
			console.error("Error parsing message:", err);
		}
	});

	ws.on("close", () => {
		const closeIndex = users.findIndex((u) => u.ws === ws);
		if (closeIndex !== -1) {
			const closedUser = users[closeIndex];
			if (closedUser) {
				users.splice(closeIndex, 1);
			}
		}
	});
});
