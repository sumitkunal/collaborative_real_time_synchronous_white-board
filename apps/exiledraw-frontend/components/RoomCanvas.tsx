"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { initDraw } from '@/draw'
import { WebSocketUrl } from '@/config';
import {Canvas} from './Canvas';
import { useRouter } from 'next/navigation';

export function RoomCanvas({roomSlug}: {roomSlug: string}) {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<string>('Connecting...');
    const [retryCount, setRetryCount] = useState(0);
    const router = useRouter();
    
    const connectWebSocket = useCallback(() => {
        try {
            const token = (typeof window !== 'undefined' ? localStorage.getItem("token") : null) ||
                (typeof document !== 'undefined' ? document.cookie.split('; ').find(c => c.startsWith('token='))?.split('=')[1] : null);
            if (!token) {
                const redirectPath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : `/canvas/${roomSlug}`;
                router.replace(`/signin?redirect=${encodeURIComponent(redirectPath)}`);
                return null;
            }
            const ws = new WebSocket(`${WebSocketUrl}?token=${token}`);
            
            ws.onopen = () => {
                console.log('WebSocket connected successfully');
                setConnectionStatus('Connected');
                setRetryCount(0);
                setSocket(ws);
                const joinMessage = { type: "join_room", roomId: roomSlug };
                ws.send(JSON.stringify(joinMessage));
            }
            
            ws.onmessage = (event) => {
                console.log('Received message:', event.data);
            }
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                setConnectionStatus('Error');
            }
            
            ws.onclose = (event) => {
                console.log('WebSocket closed:', event.code, event.reason);
                setConnectionStatus('Disconnected');
                setSocket(null);
                if (event.code === 1008) {
                    const redirectPath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : `/canvas/${roomSlug}`;
                    router.replace(`/signin?redirect=${encodeURIComponent(redirectPath)}`);
                    return;
                }
                if (event.code !== 1000 && retryCount < 3) {
                    console.log(`Attempting to reconnect... (${retryCount + 1}/3)`);
                    setRetryCount(prev => prev + 1);
                    setTimeout(() => {
                        if (retryCount < 3) {
                            connectWebSocket();
                        }
                    }, 2000);
                }
            }
            
            return ws;
        } catch (error) {
            console.error('Error creating WebSocket:', error);
            setConnectionStatus('Connection Failed');
            return null;
        }
    }, [roomSlug, retryCount]);
    
    useEffect(() => {
        const ws = connectWebSocket();
        
        return () => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close(1000, 'Component unmounting');
            }
        }
    }, [connectWebSocket]);
    
    if (!socket) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="text-lg font-semibold mb-2">WebSocket Status: {connectionStatus}</div>
                {retryCount > 0 && (
                    <div className="text-sm text-gray-600">Retry attempts: {retryCount}/3</div>
                )}
                {retryCount >= 3 && (
                    <button 
                        onClick={() => {
                            setRetryCount(0);
                            connectWebSocket();
                        }}
                        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Retry Connection
                    </button>
                )}
            </div>
        );
    }
    
    return (
        <Canvas roomSlug={roomSlug} socket={socket} />
    )
}