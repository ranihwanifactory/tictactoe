
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import AuthView from './components/AuthView';
import LobbyView from './components/LobbyView';
import GameView from './components/GameView';
import { UserProfile } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    // Handle hash routing
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/room/')) {
        setRoomId(hash.replace('#/room/', ''));
      } else {
        setRoomId(null);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || 'Friend',
          photoURL: firebaseUser.photoURL,
          email: firebaseUser.email,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FFF9E6]">
        <div className="text-4xl animate-bounce text-pink-500">로딩 중... 🍬</div>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  if (roomId) {
    return <GameView user={user} roomId={roomId} />;
  }

  return <LobbyView user={user} />;
};

export default App;
