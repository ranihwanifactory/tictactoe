
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ref, onValue, update, remove, runTransaction } from 'firebase/database';
import { database } from '../firebase';
import { UserProfile, GameRoom, CellValue, MatchupRecord } from '../types';
import { sounds } from '../utils/sounds';

interface GameViewProps {
  user: UserProfile;
  roomId: string;
}

const BOARD_SIZE = 10;

const GameView: React.FC<GameViewProps> = ({ user, roomId }) => {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [copied, setCopied] = useState(false);
  const [matchup, setMatchup] = useState<MatchupRecord | null>(null);
  const lastMoveRef = useRef<number | null>(null);
  const statsUpdatedRef = useRef<string | null>(null); // Track if stats were updated for current game result

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

      // Join if not host and guest slot is empty
      if (data.status === 'waiting' && data.host.uid !== user.uid && !data.guest) {
        update(roomRef, {
          guest: user,
          status: 'playing',
        });
      }
    });

    return () => unsubscribe();
  }, [roomId, user]);

  // Fetch head-to-head records
  useEffect(() => {
    if (room?.guest) {
      const uids = [room.host.uid, room.guest.uid].sort();
      const matchupKey = `${uids[0]}_${uids[1]}`;
      const matchupRef = ref(database, `matchups/${matchupKey}`);
      const unsubscribe = onValue(matchupRef, (snapshot) => {
        setMatchup(snapshot.val() || { [uids[0]]: 0, [uids[1]]: 0, draws: 0 });
      });
      return () => unsubscribe();
    }
  }, [room?.guest?.uid]);

  // Update statistics when game finishes
  useEffect(() => {
    if (room?.status === 'finished' && room.winner && statsUpdatedRef.current !== room.board.join('')) {
      updateGameStats(room);
      statsUpdatedRef.current = room.board.join('');
    }
  }, [room?.status, room?.winner]);

  const updateGameStats = async (currentRoom: GameRoom) => {
    if (!currentRoom.guest) return;
    
    const { winner, host, guest } = currentRoom;
    const isHostWinner = winner === host.uid;
    const isGuestWinner = winner === guest.uid;
    const isDraw = winner === 'draw';

    // Update Global User Stats
    const updatePlayerStats = async (uid: string, result: 'win' | 'loss' | 'draw') => {
      const userRef = ref(database, `users/${uid}`);
      await runTransaction(userRef, (stats) => {
        if (stats) {
          if (result === 'win') stats.wins = (stats.wins || 0) + 1;
          if (result === 'loss') stats.losses = (stats.losses || 0) + 1;
          if (result === 'draw') stats.draws = (stats.draws || 0) + 1;
          stats.totalGames = (stats.totalGames || 0) + 1;
          // Calculate win rate (integer percentage)
          stats.winRate = stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0;
        }
        return stats;
      });
    };

    await updatePlayerStats(host.uid, isDraw ? 'draw' : (isHostWinner ? 'win' : 'loss'));
    await updatePlayerStats(guest.uid, isDraw ? 'draw' : (isGuestWinner ? 'win' : 'loss'));

    // Update Matchup Record
    const uids = [host.uid, guest.uid].sort();
    const matchupKey = `${uids[0]}_${uids[1]}`;
    const matchupRef = ref(database, `matchups/${matchupKey}`);
    
    await runTransaction(matchupRef, (record) => {
      if (!record) record = { [uids[0]]: 0, [uids[1]]: 0, draws: 0 };
      if (isDraw) record.draws = (record.draws || 0) + 1;
      else if (winner) record[winner as string] = (record[winner as string] || 0) + 1;
      return record;
    });
  };

  const checkWinner = (board: CellValue[], index: number): 'X' | 'O' | 'draw' | null => {
    const player = board[index];
    if (!player) return null;
    const row = Math.floor(index / BOARD_SIZE);
    const col = index % BOARD_SIZE;
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

    for (const [dr, dc] of directions) {
      let count = 1;
      for (let i = 1; i < 5; i++) {
        const nr = row + dr * i, nc = col + dc * i;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr * BOARD_SIZE + nc] === player) count++; else break;
      }
      for (let i = 1; i < 5; i++) {
        const nr = row - dr * i, nc = col - dc * i;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr * BOARD_SIZE + nc] === player) count++; else break;
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

    const updates: any = { board: newBoard, currentTurn: nextTurn };
    if (winnerResult) {
      updates.status = 'finished';
      updates.winner = winnerResult === 'draw' ? 'draw' : user.uid;
      if (winnerResult === 'draw') sounds.playDraw(); else sounds.playWin();
    }
    await update(ref(database, `rooms/${roomId}`), updates);
  }, [room, user, roomId]);

  const handleShare = async () => {
    sounds.playClick();
    const shareData = {
      title: '말랑 오목 대결 초대',
      text: `${user.displayName}님이 오목 대결에 초대했어요! 코드: ${roomId}`,
      url: `${window.location.origin}${window.location.pathname}#/room/${roomId}`
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Sharing failed', err);
      }
    } else {
      await navigator.clipboard.writeText(shareData.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
          ◀ 뒤로
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">초대 코드</span>
          <span className="text-xl font-black text-blue-600 bg-white px-4 rounded-full border-2 border-blue-200 shadow-sm leading-tight">{roomId}</span>
        </div>
        <button 
          onClick={handleShare} 
          className={`px-3 py-1 rounded-xl shadow-md border-b-2 font-bold text-sm transition-all ${copied ? 'bg-green-400 border-green-600 text-white' : 'bg-yellow-300 border-yellow-500 text-yellow-800'}`}
        >
          {copied ? '✅ 복사됨!' : '🎁 공유'}
        </button>
      </div>

      {/* Player Indicators with Matchup Records */}
      <div className="w-full max-w-[400px] grid grid-cols-2 gap-2 mb-4">
        {/* Host */}
        <div className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center ${room.currentTurn === room.host.uid ? 'border-pink-400 bg-pink-50 shadow-md' : 'border-white bg-white/50 opacity-60'}`}>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xl">🐱</span>
            <p className="text-xs text-pink-600 font-bold truncate max-w-[80px]">{room.host.displayName}</p>
          </div>
          <div className="text-[10px] bg-white/80 px-2 rounded-full font-bold text-gray-500">
            {matchup ? `${matchup[room.host.uid] || 0}승` : '0승'}
          </div>
        </div>

        {/* Guest */}
        <div className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center ${room.currentTurn === room.guest?.uid ? 'border-blue-400 bg-blue-50 shadow-md' : 'border-white bg-white/50 opacity-60'}`}>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xl">🐰</span>
            <p className="text-xs text-blue-600 font-bold truncate max-w-[80px]">{room.guest ? room.guest.displayName : '대기 중'}</p>
          </div>
          <div className="text-[10px] bg-white/80 px-2 rounded-full font-bold text-gray-500">
            {room.guest && matchup ? `${matchup[room.guest.uid] || 0}승` : '0승'}
          </div>
        </div>
      </div>

      {/* Board Container */}
      <div className="bg-[#E6B347] p-2 rounded-xl shadow-2xl border-4 border-[#C18E2E] relative overflow-hidden">
        <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 pointer-events-none p-2">
          {Array(100).fill(0).map((_, i) => <div key={i} className="border-[0.5px] border-black/20"></div>)}
        </div>
        <div className="grid grid-cols-10 gap-0.5 relative z-10">
          {room.board.map((cell, idx) => (
            <button
              key={idx}
              onClick={() => handleCellClick(idx)}
              disabled={room.status !== 'playing' || !isMyTurn || cell !== ''}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xl transition-all relative ${cell === '' ? 'hover:bg-white/10' : ''}`}
            >
              {cell === 'X' && <div className="w-7 h-7 bg-zinc-800 rounded-full flex items-center justify-center shadow-lg pop-animation border-2 border-zinc-900"><span className="text-xs">🐱</span></div>}
              {cell === 'O' && <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg pop-animation border-2 border-gray-200"><span className="text-xs">🐰</span></div>}
              {lastMoveRef.current === idx && room.status === 'playing' && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-ping"></div>}
            </button>
          ))}
        </div>

        {/* Overlays */}
        {room.status === 'waiting' && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center text-center p-4">
            <div className="text-5xl mb-4 animate-bounce">🍗</div>
            <p className="text-white font-bold text-lg">코드를 친구에게 알려주세요!<br/><span className="text-3xl text-yellow-300 tracking-widest">{roomId}</span></p>
          </div>
        )}

        {room.status === 'finished' && (
          <div className="absolute inset-0 bg-pink-500/90 z-30 flex flex-col items-center justify-center text-center p-4 text-white pop-animation">
            <div className="text-6xl mb-2">{room.winner === 'draw' ? '🤝' : room.winner === user.uid ? '🏆' : '😿'}</div>
            <h2 className="text-2xl font-bold mb-4">{room.winner === 'draw' ? '무승부!' : room.winner === user.uid ? '내가 이겼다!' : '졌지만 잘했어!'}</h2>
            <div className="flex space-x-2">
              <button onClick={restartGame} className="bg-white text-pink-500 px-4 py-2 rounded-xl font-bold border-b-4 border-gray-200 shadow-md">다시하기</button>
              <button onClick={exitRoom} className="bg-pink-800 text-white px-4 py-2 rounded-xl font-bold border-b-4 border-pink-950 shadow-md">나가기</button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-white/80 rounded-2xl border-2 border-yellow-200 shadow-sm min-w-[200px]">
        <p className="text-sm font-bold text-yellow-800 text-center">
          {room.status === 'playing' ? (isMyTurn ? "내 차례예요! ✨" : "친구가 생각 중... 🕒") : "대결이 끝났어요!"}
        </p>
        {matchup && (
          <p className="text-[10px] text-gray-400 text-center mt-1">함께 한 대결: {matchup.draws || 0}무승부</p>
        )}
      </div>
    </div>
  );
};

export default GameView;
