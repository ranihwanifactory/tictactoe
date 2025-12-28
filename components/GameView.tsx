
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ref, onValue, update, remove } from 'firebase/database';
import { database } from '../firebase';
import { UserProfile, GameRoom, CellValue } from '../types';
import { sounds } from '../utils/sounds';

interface GameViewProps {
  user: UserProfile;
  roomId: string;
}

const BOARD_SIZE = 10;

const GameView: React.FC<GameViewProps> = ({ user, roomId }) => {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [copied, setCopied] = useState(false);
  const lastMoveRef = useRef<number | null>(null);

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

      // 게스트 입장 처리
      if (data.status === 'waiting' && data.host.uid !== user.uid && !data.guest) {
        update(roomRef, {
          guest: user,
          status: 'playing',
        });
      }
    });

    return () => unsubscribe();
  }, [roomId, user]);

  const checkWinner = (board: CellValue[], index: number): 'X' | 'O' | 'draw' | null => {
    const player = board[index];
    if (!player) return null;

    const row = Math.floor(index / BOARD_SIZE);
    const col = index % BOARD_SIZE;

    const directions = [
      [0, 1],  // 가로
      [1, 0],  // 세로
      [1, 1],  // 대각선 우하향
      [1, -1]  // 대각선 좌하향
    ];

    for (const [dr, dc] of directions) {
      let count = 1;
      
      // 한 방향으로 체크
      for (let i = 1; i < 5; i++) {
        const nr = row + dr * i;
        const nc = col + dc * i;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr * BOARD_SIZE + nc] === player) {
          count++;
        } else break;
      }
      
      // 반대 방향으로 체크
      for (let i = 1; i < 5; i++) {
        const nr = row - dr * i;
        const nc = col - dc * i;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr * BOARD_SIZE + nc] === player) {
          count++;
        } else break;
      }

      if (count >= 5) return player as 'X' | 'O';
    }

    if (board.every(cell => cell !== '')) return 'draw';
    return null;
  };

  const handleCellClick = useCallback(async (index: number) => {
    if (!room || room.status !== 'playing') return;
    if (room.board[index] !== '') return;
    if (room.currentTurn !== user.uid) return;

    sounds.playPop();
    lastMoveRef.current = index;

    const isHost = room.host.uid === user.uid;
    const newBoard = [...room.board];
    newBoard[index] = isHost ? 'X' : 'O';

    const winnerResult = checkWinner(newBoard, index);
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
      if (confirm("방을 나가면 대결이 종료됩니다. 정말 나갈까요?")) {
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
    lastMoveRef.current = null;
    await update(ref(database, `rooms/${roomId}`), {
      board: Array(BOARD_SIZE * BOARD_SIZE).fill(''),
      currentTurn: room.host.uid,
      status: 'playing',
      winner: null,
    });
  };

  if (!room) return null;

  const isHost = room.host.uid === user.uid;
  const isMyTurn = room.currentTurn === user.uid;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-2 bg-[#FFF9E6]">
      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-center mb-4">
        <button onClick={exitRoom} className="bg-white px-3 py-1 rounded-xl shadow-md border-b-2 border-gray-300 text-gray-600 font-bold text-sm">
          ◀ 뒤로가기
        </button>
        <div className="flex flex-col items-end">
          <button 
            onClick={copyInviteLink} 
            className={`px-3 py-1 rounded-xl shadow-md border-b-2 font-bold text-sm transition-all ${copied ? 'bg-green-400 border-green-600 text-white' : 'bg-yellow-300 border-yellow-500 text-yellow-800'}`}
          >
            {copied ? '✅ 복사 완료!' : '🔗 친구 초대'}
          </button>
        </div>
      </div>

      {/* Player Indicators */}
      <div className="w-full max-w-[400px] grid grid-cols-2 gap-2 mb-4">
        <div className={`p-2 rounded-xl border-2 transition-all flex items-center space-x-2 ${room.currentTurn === room.host.uid ? 'border-pink-400 bg-pink-50 shadow-md' : 'border-white bg-white/50 opacity-60'}`}>
          <div className="text-2xl">🐱</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-pink-600 font-bold truncate">{room.host.displayName}</p>
            <p className="text-[10px] text-gray-500">집사 (검은돌)</p>
          </div>
        </div>

        <div className={`p-2 rounded-xl border-2 transition-all flex items-center space-x-2 ${room.currentTurn === room.guest?.uid ? 'border-blue-400 bg-blue-50 shadow-md' : 'border-white bg-white/50 opacity-60'}`}>
          <div className="text-2xl">🐰</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-blue-600 font-bold truncate">{room.guest ? room.guest.displayName : '대기 중'}</p>
            <p className="text-[10px] text-gray-500">토끼 (하얀돌)</p>
          </div>
        </div>
      </div>

      {/* Omok Board */}
      <div className="bg-[#E6B347] p-2 rounded-xl shadow-2xl border-4 border-[#C18E2E] relative overflow-hidden">
        {/* Board Lines Layer */}
        <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 pointer-events-none p-2">
          {Array(100).fill(0).map((_, i) => (
            <div key={i} className="border-[0.5px] border-black/20"></div>
          ))}
        </div>

        {/* Board Buttons Layer */}
        <div className="grid grid-cols-10 gap-0.5 relative z-10">
          {room.board.map((cell, idx) => (
            <button
              key={idx}
              onClick={() => handleCellClick(idx)}
              disabled={room.status !== 'playing' || !isMyTurn || cell !== ''}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xl transition-all relative
                ${cell === '' ? 'hover:bg-white/20' : ''}
              `}
            >
              {cell === 'X' && (
                <div className="w-7 h-7 bg-zinc-800 rounded-full flex items-center justify-center shadow-lg pop-animation border-2 border-zinc-900">
                  <span className="text-xs">🐱</span>
                </div>
              )}
              {cell === 'O' && (
                <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg pop-animation border-2 border-gray-200">
                  <span className="text-xs">🐰</span>
                </div>
              )}
              {/* Last Move Indicator */}
              {lastMoveRef.current === idx && room.status === 'playing' && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-ping"></div>
              )}
            </button>
          ))}
        </div>

        {/* Overlay States */}
        {room.status === 'waiting' && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center text-center p-4">
            <div className="text-5xl mb-4 animate-bounce">🍗</div>
            <p className="text-white font-bold text-lg">친구가 오면<br/>대결이 시작돼요!</p>
          </div>
        )}

        {room.status === 'finished' && (
          <div className="absolute inset-0 bg-pink-500/90 z-30 flex flex-col items-center justify-center text-center p-4 text-white pop-animation">
            <div className="text-6xl mb-2">
              {room.winner === 'draw' ? '🤝' : room.winner === user.uid ? '🏆' : '😿'}
            </div>
            <h2 className="text-2xl font-bold mb-4">
              {room.winner === 'draw' ? '무승부!' : room.winner === user.uid ? '내가 이겼다!' : '졌지만 잘했어!'}
            </h2>
            <div className="flex space-x-2">
              <button 
                onClick={restartGame}
                className="bg-white text-pink-500 px-4 py-2 rounded-xl font-bold border-b-4 border-gray-200 hover:scale-105 active:scale-95"
              >
                한 판 더!
              </button>
              <button 
                onClick={exitRoom}
                className="bg-pink-800 text-white px-4 py-2 rounded-xl font-bold border-b-4 border-pink-950 hover:scale-105 active:scale-95"
              >
                그만하기
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Turn Hint */}
      <div className="mt-4 p-3 bg-white/80 rounded-2xl border-2 border-yellow-200 shadow-sm animate-pulse">
        <p className="text-sm font-bold text-yellow-800">
          {room.status === 'playing' ? (
            isMyTurn ? "지금은 내 차례! 5개를 만들어봐요! ✨" : "친구가 고민 중이에요... 🕒"
          ) : "대결이 끝났어요!"}
        </p>
      </div>
    </div>
  );
};

export default GameView;
