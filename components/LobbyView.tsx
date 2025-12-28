
import React, { useState, useEffect } from 'react';
import { ref, set, onValue, off, query, orderByChild, limitToLast } from 'firebase/database';
import { database } from '../firebase';
import { UserProfile, GameRoom, UserStats } from '../types';
import { sounds } from '../utils/sounds';

interface LobbyViewProps {
  user: UserProfile;
}

const LobbyView: React.FC<LobbyViewProps> = ({ user }) => {
  const [roomInput, setRoomInput] = useState('');
  const [waitingRooms, setWaitingRooms] = useState<GameRoom[]>([]);
  const [rankings, setRankings] = useState<UserStats[]>([]);
  const [activeTab, setActiveTab] = useState<'rooms' | 'ranking'>('rooms');

  useEffect(() => {
    // Sync user profile to stats if not exists
    const userRef = ref(database, `users/${user.uid}`);
    onValue(userRef, (snapshot) => {
      if (!snapshot.exists()) {
        set(userRef, {
          ...user,
          wins: 0,
          losses: 0,
          draws: 0,
          totalGames: 0,
          winRate: 0
        });
      }
    }, { onlyOnce: true });

    // Rooms listener
    const roomsRef = ref(database, 'rooms');
    const roomsUnsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const roomsList: GameRoom[] = Object.values(data);
        const filtered = roomsList
          .filter(room => room.status === 'waiting' && room.host.uid !== user.uid)
          .sort((a, b) => b.createdAt - a.createdAt);
        setWaitingRooms(filtered);
      } else {
        setWaitingRooms([]);
      }
    });

    // Rankings listener (Top 10 by winRate)
    const rankingsRef = query(ref(database, 'users'), orderByChild('winRate'), limitToLast(10));
    const rankingsUnsubscribe = onValue(rankingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.values(data) as UserStats[];
        setRankings(list.sort((a, b) => (b as any).winRate - (a as any).winRate));
      }
    });

    return () => {
      off(roomsRef, 'value', roomsUnsubscribe);
      off(rankingsRef, 'value', rankingsUnsubscribe);
    };
  }, [user.uid]);

  // 아이들이 전달하기 쉬운 4글자 랜덤 코드 생성
  const generateShortCode = () => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const createRoom = async () => {
    sounds.playClick();
    const shortCode = generateShortCode();
    const roomRef = ref(database, `rooms/${shortCode}`);

    const newRoom: GameRoom = {
      id: shortCode,
      host: user,
      board: Array(100).fill(''),
      currentTurn: user.uid,
      status: 'waiting',
      winner: null,
      createdAt: Date.now(),
    };

    try {
      await set(roomRef, newRoom);
      window.location.hash = `#/room/${shortCode}`;
    } catch (error) {
      console.error("Room creation error:", error);
      alert("방 생성에 실패했어요. 다시 시도해주세요!");
    }
  };

  const joinRoomById = () => {
    sounds.playClick();
    const code = roomInput.trim().toUpperCase();
    if (code) {
      window.location.hash = `#/room/${code}`;
    }
  };

  const joinRoom = (id: string) => {
    sounds.playClick();
    window.location.hash = `#/room/${id}`;
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 bg-[#FFF9E6] overflow-y-auto pb-10">
      <div className="max-w-md w-full py-8">
        {/* User Profile Header */}
        <div className="flex items-center space-x-4 mb-6 bg-white p-4 rounded-2xl border-4 border-pink-200 shadow-sm">
          <img 
            src={user.photoURL || 'https://picsum.photos/100/100'} 
            alt="User" 
            className="w-16 h-16 rounded-full border-2 border-pink-400"
          />
          <div>
            <p className="text-gray-500 text-sm">말랑 오목 고수!</p>
            <p className="text-xl font-bold text-pink-600">{user.displayName}님</p>
          </div>
        </div>

        {/* Action Section */}
        <div className="bg-white p-6 rounded-3xl shadow-xl border-4 border-blue-200 space-y-4 mb-6 text-center">
          <button
            onClick={createRoom}
            className="cute-button w-full bg-blue-400 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg border-b-4 border-blue-600 text-xl flex items-center justify-center space-x-2"
          >
            <span>🏰 방 만들기</span>
          </button>

          <p className="text-xs text-gray-400">친구에게 4글자 코드를 알려주세요!</p>

          <div className="flex space-x-2">
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
              placeholder="4글자 코드"
              maxLength={4}
              className="flex-1 p-3 rounded-xl border-2 border-gray-200 focus:border-blue-300 outline-none text-center font-bold tracking-widest text-xl"
            />
            <button
              onClick={joinRoomById}
              className="cute-button bg-pink-400 hover:bg-pink-500 text-white font-bold px-6 rounded-xl shadow-md border-b-2 border-pink-600"
            >
              입장
            </button>
          </div>
        </div>

        {/* Tabs for Rooms and Ranking */}
        <div className="flex space-x-2 mb-4">
          <button 
            onClick={() => setActiveTab('rooms')}
            className={`flex-1 py-3 rounded-2xl font-bold transition-all shadow-md ${activeTab === 'rooms' ? 'bg-yellow-400 text-white border-b-4 border-yellow-600' : 'bg-white text-yellow-600'}`}
          >
            친구 기다리기
          </button>
          <button 
            onClick={() => setActiveTab('ranking')}
            className={`flex-1 py-3 rounded-2xl font-bold transition-all shadow-md ${activeTab === 'ranking' ? 'bg-purple-400 text-white border-b-4 border-purple-600' : 'bg-white text-purple-600'}`}
          >
            누가 제일 잘할까?
          </button>
        </div>

        {/* Content Section */}
        <div className="bg-white p-4 rounded-3xl shadow-xl border-4 border-yellow-200 min-h-[300px]">
          {activeTab === 'rooms' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <h3 className="font-bold text-yellow-600">🎮 열려있는 대결</h3>
                <span className="text-xs font-bold text-yellow-500">{waitingRooms.length}개</span>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {waitingRooms.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 italic">
                    <p className="text-5xl mb-2">🎈</p>
                    <p>방을 만들고 친구를 기다려봐요!</p>
                  </div>
                ) : (
                  waitingRooms.map((room) => (
                    <div 
                      key={room.id}
                      className="flex items-center justify-between p-3 rounded-2xl border-2 border-gray-100 hover:border-yellow-300 transition-all bg-gray-50"
                    >
                      <div className="flex items-center space-x-3 min-w-0 text-left">
                        <img 
                          src={room.host.photoURL || 'https://picsum.photos/50/50'} 
                          className="w-10 h-10 rounded-full border border-gray-200"
                          alt="Host"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-gray-700 truncate text-sm">{room.host.displayName}</p>
                          <p className="text-xs font-black text-blue-500 tracking-wider">CODE: {room.id}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => joinRoom(room.id)}
                        className="bg-yellow-400 hover:bg-yellow-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md border-b-2 border-yellow-600"
                      >
                        참여
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-bold text-purple-600 px-2 flex items-center">
                <span className="mr-2">🏆</span> 오목 랭킹 Top 10
              </h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {rankings.map((rank, index) => (
                  <div 
                    key={rank.uid}
                    className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${rank.uid === user.uid ? 'border-purple-300 bg-purple-50' : 'border-gray-50 bg-gray-50'}`}
                  >
                    <div className="flex items-center space-x-3 text-left">
                      <span className={`w-6 h-6 flex items-center justify-center font-bold rounded-full ${index < 3 ? 'bg-yellow-400 text-white' : 'bg-gray-200 text-gray-500'} text-xs`}>
                        {index + 1}
                      </span>
                      <img src={rank.photoURL || ''} className="w-8 h-8 rounded-full" alt="" />
                      <div className="min-w-0">
                        <p className="font-bold text-gray-700 text-sm truncate">{rank.displayName}</p>
                        <p className="text-[10px] text-gray-400">{rank.wins}승 {rank.losses}패</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-purple-500 text-[10px]">승률</p>
                      <p className="font-bold text-gray-700">{(rank as any).winRate || 0}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LobbyView;
