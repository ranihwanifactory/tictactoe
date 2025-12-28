
import React, { useState } from 'react';
import { 
  signInWithGoogle, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  auth
} from '../firebase';
import { sounds } from '../utils/sounds';

const AuthView: React.FC = () => {
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    sounds.playClick();
    try {
      await signInWithGoogle();
    } catch (err) {
      alert("로그인에 실패했어요! 😭");
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playClick();
    setLoading(true);

    try {
      if (isSignUp) {
        if (!nickname) throw new Error("닉네임을 입력해주세요!");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: nickname });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      let message = "문제가 생겼어요! 다시 확인해볼까요?";
      if (err.code === 'auth/email-already-in-use') message = "이미 가입된 이메일이에요! ✨";
      if (err.code === 'auth/wrong-password') message = "비밀번호가 틀렸어요! 🤫";
      if (err.code === 'auth/user-not-found') message = "가입되지 않은 이메일이에요! 🎈";
      if (err.code === 'auth/weak-password') message = "비밀번호를 6자리 이상으로 해주세요!";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#FFF9E6]">
      <div className="bg-white p-8 rounded-[40px] shadow-2xl border-4 border-yellow-300 max-w-sm w-full text-center relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute -top-4 -right-4 w-16 h-16 bg-pink-100 rounded-full opacity-50"></div>
        <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-blue-100 rounded-full opacity-50"></div>
        
        <div className="relative z-10">
          <div className="text-7xl mb-4 animate-bounce">🐾</div>
          <h1 className="text-4xl font-black text-pink-500 mb-2 tracking-tight">말랑 오목</h1>
          <p className="text-gray-500 font-bold mb-8 text-sm">함께하면 더 즐거운 대결! 🍭</p>

          {!isEmailMode ? (
            <div className="space-y-4">
              <button
                onClick={handleGoogleLogin}
                className="cute-button w-full bg-white hover:bg-gray-50 text-gray-700 font-bold py-4 rounded-2xl shadow-md border-2 border-gray-100 flex items-center justify-center space-x-3 transition-all"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                <span>구글로 간편하게</span>
              </button>

              <button
                onClick={() => { sounds.playClick(); setIsEmailMode(true); }}
                className="cute-button w-full bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-4 rounded-2xl shadow-lg border-b-4 border-yellow-600 flex items-center justify-center space-x-2"
              >
                <span>✉️ 이메일로 시작하기</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-3 text-left">
              <div className="flex justify-between items-center mb-4">
                <button 
                  type="button" 
                  onClick={() => setIsEmailMode(false)}
                  className="text-gray-400 hover:text-gray-600 font-bold text-xs"
                >
                  ◀ 뒤로가기
                </button>
                <button 
                  type="button" 
                  onClick={() => { sounds.playClick(); setIsSignUp(!isSignUp); }}
                  className="text-pink-500 font-bold text-xs underline underline-offset-4"
                >
                  {isSignUp ? "이미 회원이신가요?" : "새로 가입하고 싶어요!"}
                </button>
              </div>

              {isSignUp && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 ml-2 mb-1">닉네임</label>
                  <input
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="귀여운 별명"
                    className="w-full p-3 rounded-xl border-2 border-pink-100 focus:border-pink-300 outline-none text-sm font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-400 ml-2 mb-1">이메일</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="w-full p-3 rounded-xl border-2 border-blue-100 focus:border-blue-300 outline-none text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 ml-2 mb-1">비밀번호</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6자리 이상"
                  className="w-full p-3 rounded-xl border-2 border-blue-100 focus:border-blue-300 outline-none text-sm font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`cute-button w-full ${isSignUp ? 'bg-pink-400 border-pink-600' : 'bg-blue-400 border-blue-600'} text-white font-bold py-4 rounded-2xl shadow-lg border-b-4 mt-4 flex items-center justify-center transition-all`}
              >
                {loading ? "기다려주세요... 💨" : (isSignUp ? "가입하고 시작하기! ✨" : "로그인하기! 🚀")}
              </button>
            </form>
          )}
          
          <div className="mt-8 flex justify-center space-x-4 opacity-30 grayscale hover:grayscale-0 transition-all">
            <div className="text-3xl">🐱</div>
            <div className="text-3xl">🐰</div>
            <div className="text-3xl">🐶</div>
          </div>
        </div>
      </div>
      
      <p className="mt-6 text-gray-400 font-bold text-xs italic">
        친구와 함께하는 말랑말랑 오목 타임!
      </p>
    </div>
  );
};

export default AuthView;
