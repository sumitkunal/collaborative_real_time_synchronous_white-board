import { json } from "stream/consumers";
import { BackendUrl } from "../config";
import axios from "axios";
import { JsConfig } from "next/dist/build/load-jsconfig";

type Shape = {
    type: "rect",
    x: number,
    y: number,
    width: number,
    length: number,
} | {
    type: "circle",
    x: number,
    y: number,
    radius: number,
    width: number,
    hieght: number,
} |{
    type : "pencil",
    points: { x: number, y: number }[],
}

const shapes: Shape[] = [];
const points : { x: number, y: number }[] = [];

export function initDraw(canvas: HTMLCanvasElement, roomSlug: string, socket: WebSocket) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    getexistingshapes(roomSlug);
    clearCanvas(shapes, canvas, ctx);

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "message" && data.content) {
            try {
                const messageContent = JSON.parse(data.content);
                if (messageContent.shape) {
                    shapes.push(messageContent.shape);
                    clearCanvas(shapes, canvas, ctx);
                }
            } catch (err) {
                console.error("Error parsing message content:", err);
            }
        } else if (data.type === "clear_room" && data.roomId === roomSlug) {
            shapes.length = 0;
            points.length = 0;
            clearCanvas(shapes, canvas, ctx);
        }
    }

    ctx.fillStyle = "rgb(0,0,0)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    let clicked = false;
    let startX = 0;
    let startY = 0;
    canvas.addEventListener('mousedown', (e) => {
        clicked = true;
        const rect = canvas.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;
        points.length = 0;
    });
    canvas.addEventListener('mouseup', (e) => {
        clicked = false;
        const rect = canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        const width = currentX - startX;
        const height = currentY - startY;
        // @ts-ignore
        const selectedShape = window.selectedShape;

        if (selectedShape === 'rect') {
            const shape: Shape = {
                type: "rect",
                x: startX,
                y: startY,
                width: width,
                length: height
            };
            shapes.push(shape);
            // console.log("Shape drawn:", shape);
            const message = {
                "type": "message",
                "content": JSON.stringify({ shape }),
                "roomId": roomSlug,
            };
            // console.log("Sending WebSocket message:", message);
            socket.send(JSON.stringify(message));
        }
        else if (selectedShape === 'circle') {
            const centerX = startX + width / 2;
            const centerY = startY + height / 2;
            const radius = Math.sqrt(width * width + height * height) / 2;
            const shape: Shape = {
                type: "circle",
                x: centerX,
                y: centerY,
                radius: radius,
                width: width,
                hieght : height
            };
            shapes.push(shape);
            const message = {
                "type": "message",
                "content": JSON.stringify({ shape }),
                "roomId": roomSlug,
            };
            socket.send(JSON.stringify(message));
            // console.log("Shape drawn:", shape);
        }
        else if( selectedShape === 'pencil') {
            const shape : Shape = {
                type: "pencil",
                points : points
            }
            shapes.push(shape);
            const message = {
                "type": "message",
                "content": JSON.stringify({ shape }),
                "roomId": roomSlug,
            };
            socket.send(JSON.stringify(message));
        }
        clearCanvas(shapes, canvas, ctx);
    });
    canvas.addEventListener('mousemove', (e) => {
        if (clicked) {
            const rect = canvas.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            const width = currentX - startX;
            const height = currentY - startY;
            clearCanvas(shapes, canvas, ctx);
            // @ts-ignore
            const selectedShape = window.selectedShape;
            // console.log(selectedShape);
            if (selectedShape === 'rect') {
                ctx.strokeRect(startX, startY, width, height);
            }
            else if (selectedShape === 'circle') {
                const centerX = startX + width / 2;
                const centerY = startY + height / 2;
                const radius = Math.sqrt(width * width + height * height) / 2;
                ctx.beginPath();
                ctx.ellipse(centerX, centerY, Math.abs(width / 2), Math.abs(height / 2), 0, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.closePath();
            }
            else if(selectedShape === 'pencil') {
                points.push({ x: currentX, y: currentY });
                ctx.beginPath();
                // ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x, points[i].y);
                }
                ctx.stroke();
            }
        }
    });
    function clearCanvas(existingShapes: Shape[], canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgb(0,0,0)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "white";

        existingShapes.forEach(shape => {
            if (shape.type === "rect") {
                ctx.strokeRect(shape.x, shape.y, shape.width, shape.length);
            }
            else if (shape.type === "circle") {
                ctx.beginPath();
                ctx.ellipse(shape.x, shape.y, Math.abs(shape.width / 2), Math.abs(shape.hieght/ 2), 0, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.closePath();
            }
            else if( shape.type === "pencil") {
                ctx.beginPath();
                if (shape.points.length > 0) {
                    ctx.moveTo(shape.points[0].x, shape.points[0].y);
                    for (let i = 1; i < shape.points.length; i++) {
                        ctx.lineTo(shape.points[i].x, shape.points[i].y);
                    }
                    ctx.stroke();
                }
                ctx.closePath();
            }
        });
    }

    async function getexistingshapes(roomSlug: string) {
        try {
            // console.log(`Fetching existing shapes for room: ${roomSlug}`);
            const res = await axios.get(`${BackendUrl}/chats/${roomSlug}`);
            // console.log('Backend response:', res.data);
            const chats = res.data;
            if (chats && Array.isArray(chats)) {
                chats.forEach((chat: any) => {
                    try {
                        if (chat.message) {
                            const messageContent = JSON.parse(chat.message);
                            if (messageContent.shape) {
                                // console.log('Adding existing shape:', messageContent.shape);
                                shapes.push(messageContent.shape);
                            }
                        }
                    } catch (err) {
                        console.error('Error parsing chat message:', err, chat.message);
                    }
                });
                // console.log(`Loaded ${shapes.length} existing shapes`);
            }

            if (ctx) {
                clearCanvas(shapes, canvas, ctx);
            }
        } catch (err) {
            console.error('Error fetching existing shapes:', err);
        }
    }
}