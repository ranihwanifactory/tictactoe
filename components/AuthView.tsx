
import React from 'react';
import { signInWithGoogle } from '../firebase';
import { sounds } from '../utils/sounds';

const AuthView: React.FC = () => {
  const handleLogin = async () => {
    sounds.playClick();
    try {
      await signInWithGoogle();
    } catch (err) {
      alert("로그인에 실패했어요! 😭");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#FFF9E6]">
      <div className="bg-white p-8 rounded-3xl shadow-xl border-4 border-yellow-300 max-w-sm w-full text-center">
        <div className="text-6xl mb-4">🐾</div>
        <h1 className="text-4xl font-bold text-pink-500 mb-2">말랑 오목</h1>
        <p className="text-gray-600 mb-8">친구와 함께 5개를 먼저 완성해요!</p>
        
        <button
          onClick={handleLogin}
          className="cute-button w-full bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-4 rounded-2xl shadow-lg border-b-4 border-yellow-600 flex items-center justify-center space-x-2"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          <span>구글로 시작하기</span>
        </button>
        
        <div className="mt-8 grid grid-cols-3 gap-2 opacity-50">
          <div className="text-4xl">🐱</div>
          <div className="text-4xl">🐰</div>
          <div className="text-4xl">⭐</div>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
