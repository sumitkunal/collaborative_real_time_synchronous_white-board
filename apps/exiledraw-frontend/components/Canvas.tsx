"use client";
import React, { useState, useEffect, useRef } from 'react';
import { initDraw } from '@/draw'
import { IconButton } from './IconButon';
import { RectangleHorizontal, Pencil, Circle, DeleteIcon } from 'lucide-react';

type shape = "circle" | "rect" | "pencil";
export function Canvas({ roomSlug, socket }: { roomSlug: string, socket: WebSocket }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawingEnabled, setIsDrawingEnabled] = useState(false);
    const [selectedShape, setSelectedShape] = useState<shape>('rect');

    useEffect(() => {
        //@ts-ignore
        window.selectedShape = selectedShape;
    }, [selectedShape]);

    useEffect(() => {
        if (canvasRef.current && socket && socket.readyState === WebSocket.OPEN) {
            console.log('Initializing drawing on canvas for room:', roomSlug);
            setIsDrawingEnabled(true);
            initDraw(canvasRef.current, roomSlug, socket);
        } else {
            setIsDrawingEnabled(false);
        }
    }, [canvasRef, roomSlug, socket]);
    useEffect(() => {
        const handleStateChange = () => {
            if (socket.readyState === WebSocket.OPEN) {
                setIsDrawingEnabled(true);
            } else {
                setIsDrawingEnabled(false);
            }
        };
        handleStateChange();
        socket.addEventListener('open', handleStateChange);
        socket.addEventListener('close', handleStateChange);
        socket.addEventListener('error', handleStateChange);
        return () => {
            socket.removeEventListener('open', handleStateChange);
            socket.removeEventListener('close', handleStateChange);
            socket.removeEventListener('error', handleStateChange);
        };
    }, [socket]);
    // function async deleteall(){
        
    // }
    function Topbar({ selectedShape, setSelectedShape }:
        { selectedShape: shape, setSelectedShape: React.Dispatch<React.SetStateAction<shape>> }
    ) {
        return (
            <div className='fixed flex justify-center items-center space-x-4 bg-gray-200'>
                <IconButton
                    icon={<RectangleHorizontal />}
                    activated={selectedShape === 'rect'}
                    onClick={() => setSelectedShape('rect')}
                />
                <IconButton
                    icon={<Circle />}
                    activated={selectedShape === 'circle'}
                    onClick={() => setSelectedShape('circle')}
                />
                <IconButton
                    icon={<Pencil />}
                    activated={selectedShape === 'pencil'}
                    onClick={() => setSelectedShape('pencil')}
                />
                <IconButton
                    icon={<DeleteIcon />}
                    activated={false}
                    onClick={() => {
                        console.log('debug point 1 Clearing room:', roomSlug);
                        socket.send(JSON.stringify({ message: 'clear_room', roomId: roomSlug }));
                    }}
                />
            </div>
        )
    }
    return (
        <div className='relative h-full w-full'>

            {!isDrawingEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
                    <div className="bg-white p-4 rounded-lg text-center">
                        <div className="text-lg font-semibold mb-2">Drawing Disabled</div>
                        <div className="text-sm text-gray-600">WebSocket connection is not ready</div>
                    </div>
                </div>
            )}
            <Topbar selectedShape={selectedShape} setSelectedShape={setSelectedShape} />
            <canvas
                ref={canvasRef}
                width={2000}
                height={1000}
                className={!isDrawingEnabled ? 'opacity-50' : ''}
            />
        </div>
    )
}