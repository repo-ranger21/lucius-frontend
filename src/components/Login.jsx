import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { CSS, C } from '../styles/theme.js';

const TOKEN_KEY = 'lucius_token';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await api.login(email, password);
      const token = response?.data?.access_token;

      if (!token) {
        throw new Error('Login token missing');
      }

      sessionStorage.setItem(TOKEN_KEY, token);
      navigate('/command', { replace: true });
    } catch (err) {
      setError(err.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    background: 'rgba(79,142,247,0.04)',
    border: '1px solid rgba(79,142,247,0.22)',
    borderRadius: 8, color: C.text,
    fontFamily: "'Nunito',sans-serif", fontSize: 14,
    outline: 'none',
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="l-root" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text, fontFamily: "'Nunito',sans-serif", position: 'relative' }}>
        <div className="bg-grid" />
        <div className="card card-topline" style={{ width: 380, padding: '40px 36px', zIndex: 10, position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontFamily: "'Russo One',sans-serif", fontSize: 28, letterSpacing: '0.04em', marginBottom: 6 }}>
              <span style={{ color: C.blue }}>LUCI</span><span style={{ color: C.text }}>US</span>
            </div>
            <div style={{ fontFamily: "'Fira Code',monospace", fontSize: 9, color: C.dim, letterSpacing: '0.14em' }}>
              SECOPS ENGINE v2.4
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontFamily: "'Fira Code',monospace", fontSize: 9, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>
                Email
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="you@company.com" style={inputStyle} />
            </div>

            <div>
              <label style={{ fontFamily: "'Fira Code',monospace", fontSize: 9, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>
                Password
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••" style={inputStyle} />
            </div>

            {error && (
              <div style={{ padding: '8px 12px', background: 'rgba(255,68,101,0.08)', border: '1px solid rgba(255,68,101,0.25)', borderRadius: 7, fontSize: 12, color: C.red }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              marginTop: 8, padding: '12px',
              background: loading ? 'rgba(79,142,247,0.08)' : 'rgba(79,142,247,0.18)',
              border: `1px solid ${loading ? 'rgba(79,142,247,0.2)' : C.blue}`,
              borderRadius: 9, color: loading ? C.muted : C.blue,
              fontFamily: "'Fira Code',monospace", fontSize: 12, fontWeight: 600,
              letterSpacing: '0.1em', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}>
              {loading ? 'SIGNING IN...' : 'SIGN IN →'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
