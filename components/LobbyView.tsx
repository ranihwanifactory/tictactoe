
import React, { useState } from 'react';
import { ref, set, push } from 'firebase/database';
import { database } from '../firebase';
import { UserProfile, GameRoom } from '../types';
import { sounds } from '../utils/sounds';

interface LobbyViewProps {
  user: UserProfile;
}

const LobbyView: React.FC<LobbyViewProps> = ({ user }) => {
  const [roomInput, setRoomInput] = useState('');

  const createRoom = async () => {
    sounds.playClick();
    const roomsRef = ref(database, 'rooms');
    const newRoomRef = push(roomsRef);
    const roomId = newRoomRef.key;

    if (!roomId) return;

    // 오목은 10x10 보드 (100칸)로 설정
    const newRoom: GameRoom = {
      id: roomId,
      host: user,
      board: Array(100).fill(''),
      currentTurn: user.uid,
      status: 'waiting',
      winner: null,
      createdAt: Date.now(),
    };

    await set(newRoomRef, newRoom);
    window.location.hash = `#/room/${roomId}`;
  };

  const joinRoom = () => {
    sounds.playClick();
    if (roomInput.trim()) {
      window.location.hash = `#/room/${roomInput.trim()}`;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#FFF9E6]">
      <div className="max-w-md w-full">
        <div className="flex items-center space-x-4 mb-8 bg-white p-4 rounded-2xl border-4 border-pink-200 shadow-sm">
          <img 
            src={user.photoURL || 'https://picsum.photos/100/100'} 
            alt="User" 
            className="w-16 h-16 rounded-full border-2 border-pink-400"
          />
          <div>
            <p className="text-gray-500 text-sm">오목 고수 등장!</p>
            <p className="text-xl font-bold text-pink-600">{user.displayName}님</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-xl border-4 border-blue-200 space-y-6">
          <h2 className="text-2xl font-bold text-blue-500 text-center">오목 대결 준비?</h2>
          
          <button
            onClick={createRoom}
            className="cute-button w-full bg-blue-400 hover:bg-blue-500 text-white font-bold py-6 rounded-2xl shadow-lg border-b-4 border-blue-600 text-xl"
          >
            🏰 새로운 대결 방 만들기
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200"></span></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500 italic">초대 코드가 있나요?</span></div>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="방 번호를 입력해주세요"
              className="w-full p-4 rounded-xl border-2 border-gray-200 focus:border-blue-300 outline-none text-center font-bold"
            />
            <button
              onClick={joinRoom}
              className="cute-button w-full bg-pink-400 hover:bg-pink-500 text-white font-bold py-4 rounded-2xl shadow-lg border-b-4 border-pink-600"
            >
              🚀 대결 입장하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LobbyView;
