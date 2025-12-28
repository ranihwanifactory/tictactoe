
import React, { useEffect, useState, useCallback } from 'react';
import { ref, onValue, update, remove } from 'firebase/database';
import { database } from '../firebase';
import { UserProfile, GameRoom, CellValue } from '../types';
import { sounds } from '../utils/sounds';

interface GameViewProps {
  user: UserProfile;
  roomId: string;
}

const GameView: React.FC<GameViewProps> = ({ user, roomId }) => {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const roomRef = ref(database, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        alert("방이 사라졌어요! 💨");
        window.location.hash = '';
        return;
      }
      setRoom(data);

      // Join if not joined
      if (data.status === 'waiting' && data.host.uid !== user.uid && !data.guest) {
        update(roomRef, {
          guest: user,
          status: 'playing',
        });
      }
    });

    return () => unsubscribe();
  }, [roomId, user]);

  const checkWinner = (board: CellValue[]): 'X' | 'O' | 'draw' | null => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a] as 'X' | 'O';
      }
    }
    if (board.every(cell => cell !== '')) return 'draw';
    return null;
  };

  const handleCellClick = useCallback(async (index: number) => {
    if (!room || room.status !== 'playing') return;
    if (room.board[index] !== '') return;
    if (room.currentTurn !== user.uid) return;

    sounds.playPop();

    const isHost = room.host.uid === user.uid;
    const newBoard = [...room.board];
    newBoard[index] = isHost ? 'X' : 'O';

    const winnerResult = checkWinner(newBoard);
    const nextTurn = isHost ? room.guest?.uid || '' : room.host.uid;

    const updates: any = {
      board: newBoard,
      currentTurn: nextTurn,
    };

    if (winnerResult) {
      updates.status = 'finished';
      updates.winner = winnerResult === 'draw' ? 'draw' : user.uid;
      
      if (winnerResult === 'draw') {
        sounds.playDraw();
      } else {
        sounds.playWin();
      }
    }

    await update(ref(database, `rooms/${roomId}`), updates);
  }, [room, user, roomId]);

  const copyInviteLink = () => {
    const link = `${window.location.origin}${window.location.pathname}#/room/${roomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    sounds.playClick();
  };

  const exitRoom = async () => {
    sounds.playClick();
    if (room?.host.uid === user.uid) {
      // Host deleting room
      if (confirm("정말로 방을 없앨까요?")) {
        await remove(ref(database, `rooms/${roomId}`));
        window.location.hash = '';
      }
    } else {
      window.location.hash = '';
    }
  };

  const restartGame = async () => {
    sounds.playClick();
    if (!room) return;
    await update(ref(database, `rooms/${roomId}`), {
      board: Array(9).fill(''),
      currentTurn: room.host.uid,
      status: 'playing',
      winner: null,
    });
  };

  if (!room) return null;

  const isHost = room.host.uid === user.uid;
  const isMyTurn = room.currentTurn === user.uid;
  const opponent = isHost ? room.guest : room.host;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#FFF9E6]">
      {/* Top Header */}
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <button onClick={exitRoom} className="bg-white px-4 py-2 rounded-xl shadow-md border-b-2 border-gray-300 text-gray-600 font-bold hover:bg-gray-50">
          ◀ 나가기
        </button>
        <div className="flex flex-col items-end">
          <button 
            onClick={copyInviteLink} 
            className={`px-4 py-2 rounded-xl shadow-md border-b-2 font-bold transition-all ${copied ? 'bg-green-400 border-green-600 text-white' : 'bg-yellow-300 border-yellow-500 text-yellow-800'}`}
          >
            {copied ? '✅ 복사 완료!' : '🔗 친구 초대'}
          </button>
          <span className="text-[10px] text-gray-400 mt-1">ID: {roomId}</span>
        </div>
      </div>

      {/* Players */}
      <div className="w-full max-w-md grid grid-cols-2 gap-4 mb-8">
        {/* Host (X) */}
        <div className={`p-4 rounded-2xl border-4 transition-all flex flex-col items-center ${room.currentTurn === room.host.uid ? 'border-pink-400 bg-pink-50 scale-105 shadow-lg' : 'border-white bg-white opacity-80'}`}>
          <img src={room.host.photoURL || 'https://picsum.photos/100/100'} className="w-12 h-12 rounded-full mb-2" alt="Host" />
          <span className="font-bold text-pink-600 truncate w-full text-center">{room.host.displayName} (X)</span>
          {room.currentTurn === room.host.uid && room.status === 'playing' && <span className="text-xs bg-pink-500 text-white px-2 rounded-full animate-bounce mt-1">차례!</span>}
        </div>

        {/* Guest (O) */}
        <div className={`p-4 rounded-2xl border-4 transition-all flex flex-col items-center ${room.currentTurn === room.guest?.uid ? 'border-blue-400 bg-blue-50 scale-105 shadow-lg' : 'border-white bg-white opacity-80'}`}>
          <img src={room.guest?.photoURL || 'https://picsum.photos/101/101'} className="w-12 h-12 rounded-full mb-2" alt="Guest" />
          <span className="font-bold text-blue-600 truncate w-full text-center">{room.guest ? room.guest.displayName : '기다리는 중...'} (O)</span>
          {room.currentTurn === room.guest?.uid && room.status === 'playing' && <span className="text-xs bg-blue-500 text-white px-2 rounded-full animate-bounce mt-1">차례!</span>}
        </div>
      </div>

      {/* Game Board */}
      <div className="bg-white p-4 rounded-[2rem] shadow-2xl border-8 border-yellow-200 relative">
        <div className="grid grid-cols-3 gap-3">
          {room.board.map((cell, idx) => (
            <button
              key={idx}
              onClick={() => handleCellClick(idx)}
              disabled={room.status !== 'playing' || !isMyTurn || cell !== ''}
              className={`game-cell w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-5xl font-bold shadow-inner
                ${cell === '' ? 'bg-gray-50 hover:bg-yellow-50 active:bg-yellow-100' : 'bg-white'}
                ${cell === 'X' ? 'text-pink-500' : 'text-blue-500'}
                ${!isMyTurn && room.status === 'playing' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
              `}
            >
              {cell && <span className="pop-animation">{cell}</span>}
            </button>
          ))}
        </div>

        {/* Status Overlay */}
        {room.status === 'waiting' && (
          <div className="absolute inset-0 bg-white/80 rounded-[1.5rem] flex flex-col items-center justify-center text-center p-4">
            <div className="text-5xl mb-4 animate-spin">🍭</div>
            <p className="text-xl font-bold text-gray-700">친구가 오기를<br/>기다리고 있어요!</p>
          </div>
        )}

        {room.status === 'finished' && (
          <div className="absolute inset-0 bg-pink-500/90 rounded-[1.5rem] flex flex-col items-center justify-center text-center p-4 text-white pop-animation">
            <div className="text-6xl mb-4">
              {room.winner === 'draw' ? '🤝' : room.winner === user.uid ? '👑' : '😅'}
            </div>
            <h2 className="text-3xl font-bold mb-4">
              {room.winner === 'draw' ? '무승부!' : room.winner === user.uid ? '나의 승리!' : '아쉬워요!'}
            </h2>
            <div className="flex space-x-2">
              <button 
                onClick={restartGame}
                className="bg-white text-pink-500 px-6 py-2 rounded-xl font-bold border-b-4 border-gray-200 hover:scale-105 active:scale-95 transition-all"
              >
                다시 하기
              </button>
              <button 
                onClick={exitRoom}
                className="bg-pink-700 text-white px-6 py-2 rounded-xl font-bold border-b-4 border-pink-900 hover:scale-105 active:scale-95 transition-all"
              >
                그만 하기
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Tip */}
      <div className="mt-8 text-center text-yellow-700/60 font-medium">
        {room.status === 'playing' && (
          isMyTurn ? "지금은 내 차례예요! 💡" : "친구의 차례를 기다려요... 🕒"
        )}
      </div>
    </div>
  );
};

export default GameView;
