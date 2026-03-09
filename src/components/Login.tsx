import { useState } from 'react';
import { Lock } from 'lucide-react';
import '../App.css';

interface LoginProps {
    onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'ibmsoccer') {
            const authData = {
                timestamp: Date.now(),
                authenticated: true
            };
            localStorage.setItem('soccerBoardAuth', JSON.stringify(authData));
            onLogin();
        } else {
            setError(true);
            setPassword('');
            setTimeout(() => setError(false), 2000);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-icon">
                    <Lock size={48} className="text-emerald-500" />
                </div>
                <h1 className="login-title">Soccer Tactical Board</h1>
                <p className="login-subtitle">プロジェクト保護のため、パスワードを入力してください</p>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="input-group">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className={`login-input ${error ? 'shake error' : ''}`}
                            autoFocus
                        />
                    </div>
                    <button type="submit" className="login-button">
                        Login
                    </button>
                    {error && <p className="error-text">パスワードが正しくありません</p>}
                </form>
            </div>

            <style>{`
        .login-container {
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);
          font-family: 'Inter', sans-serif;
        }
        .login-card {
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 3rem;
          border-radius: 1.5rem;
          width: 100%;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .login-icon {
          background: rgba(16, 185, 129, 0.1);
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          color: #10b981;
        }
        .login-title {
          color: white;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }
        .login-subtitle {
          color: #94a3b8;
          font-size: 0.875rem;
          margin-bottom: 2rem;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .login-input {
          width: 100%;
          padding: 0.75rem 1rem;
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          color: white;
          font-size: 1rem;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .login-input:focus {
          outline: none;
          border-color: #10b981;
          background: rgba(15, 23, 42, 0.8);
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
        }
        .login-button {
          padding: 0.75rem;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 0.75rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .login-button:hover {
          background: #059669;
          transform: translateY(-1px);
        }
        .login-button:active {
          transform: translateY(0);
        }
        .error-text {
          color: #ef4444;
          font-size: 0.75rem;
          margin-top: 0.5rem;
          font-weight: 500;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
        .error {
          border-color: #ef4444 !important;
          background: rgba(239, 68, 68, 0.1) !important;
        }
      `}</style>
        </div>
    );
}
