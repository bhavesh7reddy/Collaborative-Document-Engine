import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    password: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      // 1. Register the user
      await authService.register(formData);

      // 2. Automatically log them in to get tokens
      const tokenData = await authService.login({
        username: formData.username,
        password: formData.password,
      });

      localStorage.setItem('access_token', tokenData.access);
      localStorage.setItem('refresh_token', tokenData.refresh);

      // 3. Redirect
      navigate('/home');
    } catch (err: any) {
      if (err.response && err.response.data) {
        const serverErrors = err.response.data;
        const firstErrorKey = Object.keys(serverErrors)[0];
        const errorMessage = Array.isArray(serverErrors[firstErrorKey])
          ? `${firstErrorKey}: ${serverErrors[firstErrorKey][0]}`
          : serverErrors[firstErrorKey];
        setError(errorMessage);
      } else {
        setError('Network error. Failed to create account.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Create Account</h2>
        <p style={styles.subtitle}>Sign up to get started</p>

        {error && <div style={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Username *</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Username"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email (Optional)</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="user@example.com"
              style={styles.input}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>First Name (Optional)</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="John"
              style={styles.input}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Password * (Min. 6 chars)</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p style={styles.footerText}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>
            Sign in
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
    gap: '14px',
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
    marginTop: '10px',
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