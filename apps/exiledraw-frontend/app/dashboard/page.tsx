'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { BackendUrl } from '@/config';

type Room = { id: number; slug: string; isAdmin: boolean };

export default function DashboardPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newRoomName, setNewRoomName] = useState('');
  const router = useRouter();

  const getToken = () => {
    if (typeof document === 'undefined') return null;
    const fromCookie = document.cookie.split('; ').find(c => c.startsWith('token='))?.split('=')[1];
    return fromCookie || localStorage.getItem('token');
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/signin?redirect=/dashboard');
      return;
    }
    axios
      .get(`${BackendUrl}/rooms`, {
        headers: { Authorization: token },
      })
      .then((res) => setRooms(res.data.rooms || []))
      .catch(() => setError('Failed to load rooms'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    const token = getToken();
    if (!token || !newRoomName.trim()) return;
    try {
      await axios.post(
        `${BackendUrl}/room`,
        { name: newRoomName.trim() },
        { headers: { Authorization: token } }
      );
      router.push(`/canvas/${encodeURIComponent(newRoomName.trim())}`);
    } catch {
      setError('Failed to create room');
    }
  };

  const handleLogout = () => {
    document.cookie = "token=; path=/; max-age=0";
    localStorage.removeItem('token');
    router.replace('/signin');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition"
        >
          Logout
        </button>
      </div>

      {/* Create room */}
      <div className="p-5 border rounded-xl shadow-sm bg-white space-y-3">
        <label className="block text-sm font-medium">Create a new room</label>
        <div className="flex gap-2">
          <input
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="room-slug"
            className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleCreate}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
          >
            Create
          </button>
        </div>
      </div>

      {/* Rooms list */}
      <div className="p-5 border rounded-xl shadow-sm bg-white space-y-4">
        <h2 className="text-lg font-semibold">Your rooms</h2>
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : rooms.length === 0 ? (
          <div className="text-gray-600">No rooms yet.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="p-4 border rounded-lg flex flex-col justify-between shadow-sm hover:shadow-md transition"
              >
                <div>
                  <div className="font-medium text-lg">{room.slug}</div>
                  <div className="text-xs text-gray-600">{room.isAdmin ? 'Owner' : 'Member'}</div>
                </div>
                <button
                  onClick={() => router.push(`/canvas/${encodeURIComponent(room.slug)}`)}
                  className="mt-3 px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
                >
                  Open
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Join room */}
      <div className="p-5 border rounded-xl shadow-sm bg-white space-y-3">
        <h2 className="text-lg font-semibold">Join a room</h2>
        <JoinRoom onJoin={(slug) => router.push(`/canvas/${encodeURIComponent(slug)}`)} />
      </div>
    </div>
  );
}

function JoinRoom({ onJoin }: { onJoin: (slug: string) => void }) {
  const [slug, setSlug] = useState('');
  return (
    <div className="flex gap-2">
      <input
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        placeholder="room-slug"
        className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
      />
      <button
        onClick={() => slug.trim() && onJoin(slug.trim())}
        className="px-5 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition"
      >
        Join
      </button>
    </div>
  );
}
