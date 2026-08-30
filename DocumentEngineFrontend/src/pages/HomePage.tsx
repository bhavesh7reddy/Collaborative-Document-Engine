import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [inputDocId, setInputDocId] = useState('');

  const errorType = new URLSearchParams(location.search).get('error');

  const handleCreateNew = () => {
    const newDocId = crypto.randomUUID();
    navigate(`/doc/${newDocId}?create=true`);
  };

  const handleJoinDoc = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputDocId.trim();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);

    if (!isUuid) {
      navigate('/home?error=invalid_id');
      return;
    }

    navigate(`/doc/${trimmed}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/', { replace: true });
  };

  return (
    <div style={styles.container}>
      <div style={styles.dashboardCard}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Document Workspace</h1>
            <p style={styles.subtitle}>Create or join a real-time collaborative document</p>
          </div>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </header>

        {errorType && (
          <div style={styles.errorBanner}>
            {errorType === 'invalid_id' && '⚠️ Invalid Document ID format. Please check the ID and try again.'}
            {errorType === 'not_found' && '⚠️ Document does not exist. Create a new document instead.'}
          </div>
        )}

        <div style={styles.actionsGrid}>
          <div style={styles.actionCard}>
            <h3 style={styles.cardTitle}>New Document</h3>
            <p style={styles.cardDesc}>Start a fresh blank canvas and invite others to edit live.</p>
            <button style={styles.primaryButton} onClick={handleCreateNew}>
              + Create Blank Document
            </button>
          </div>

          <div style={styles.actionCard}>
            <h3 style={styles.cardTitle}>Open Document</h3>
            <p style={styles.cardDesc}>Paste a Document ID or room code to join an active session.</p>
            <form onSubmit={handleJoinDoc} style={styles.form}>
              <input
                type="text"
                placeholder="Enter Document ID..."
                value={inputDocId}
                onChange={(e) => setInputDocId(e.target.value)}
                required
                style={styles.input}
              />
              <button type="submit" style={styles.secondaryButton}>
                Open
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f6f8',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  dashboardCard: {
    width: '100%',
    maxWidth: '720px',
    padding: '36px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
    borderBottom: '1px solid #eee',
    paddingBottom: '20px',
  },
  title: {
    margin: '0 0 6px 0',
    fontSize: '26px',
    fontWeight: '700',
    color: '#1a1a1a',
  },
  subtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#666',
  },
  errorBanner: {
    marginBottom: '24px',
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#991b1b',
    fontSize: '14px',
    fontWeight: '500',
  },
  logoutBtn: {
    padding: '8px 14px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
  },
  actionCard: {
    padding: '20px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#fafafa',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  cardTitle: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    color: '#1a1a1a',
  },
  cardDesc: {
    margin: '0 0 20px 0',
    fontSize: '13px',
    color: '#666',
    lineHeight: '1.4',
  },
  primaryButton: {
    padding: '12px',
    backgroundColor: '#00a0cc',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    gap: '8px',
  },
  input: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    fontSize: '13px',
    outline: 'none',
  },
  secondaryButton: {
    padding: '10px 16px',
    backgroundColor: '#334155',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default HomePage;