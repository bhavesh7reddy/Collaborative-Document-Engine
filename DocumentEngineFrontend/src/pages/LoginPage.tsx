import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await authService.login({ username, password });
      
  
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);

   
      navigate('/home', { replace: true });
    } catch (err: any) {
      if (err.response && err.response.data) {
        setError(err.response.data.detail || 'Invalid username or password.');
      } else {
        setError('Server Error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Sign In</h2>
        <p style={styles.subtitle}>Enter your credentials to access your account</p>

        {error && <div style={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={styles.footerText}>
          Don't have an account?{' '}
          <Link to="/signup" style={styles.link}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f6f8',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    padding: '32px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a1a1a',
  },
  subtitle: {
    margin: '0 0 24px 0',
    fontSize: '14px',
    color: '#666',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#333',
  },
  input: {
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    fontSize: '14px',
    outline: 'none',
  },
  button: {
    marginTop: '8px',
    padding: '12px',
    backgroundColor: '#00a0cc',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  errorAlert: {
    padding: '10px 14px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '16px',
  },
  footerText: {
    marginTop: '20px',
    fontSize: '14px',
    textAlign: 'center',
    color: '#666',
  },
  link: {
    color: '#00a0cc',
    textDecoration: 'none',
    fontWeight: '600',
  },
};