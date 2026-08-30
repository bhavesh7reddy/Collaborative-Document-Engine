import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useDocumentSocket } from '../services/useDocumentSocket';
import { api } from '../services/api';

const getAvatarInitials = (username: string) => {
  if (!username) return '??';
  if (username.startsWith('Guest ')) {
    return `G${username.replace('Guest ', '').slice(-1)}`;
  }
  const parts = username.trim().split(' ');
  return parts.length >= 2 
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() 
    : username.slice(0, 2).toUpperCase();
};

export const DocumentEditor: React.FC<{ docId?: string }> = (props) => {
  const params = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const activeDocId = props.docId || params.docId;

  const [docName, setDocName] = useState('Untitled Document');
  const [authorName, setAuthorName] = useState('Loading author...');
  const [isLoaded, setIsLoaded] = useState(false);

  const isRemoteUpdate = useRef(false);
  const titleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    isConnected,
    isConnecting,
    activeUsers,
    remoteContent,
    remoteTitle,
    sendUpdate,
    sendTitleUpdate,
    errorCode,
  } = useDocumentSocket(activeDocId || '', location.search);

  // 1. Initialize TipTap Editor
  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    onUpdate: ({ editor }) => {
      if (isRemoteUpdate.current) return;
      sendUpdate(editor.getJSON());
    },
  });

  // 2. Load Metadata and Initial Content Once
  useEffect(() => {
    if (!activeDocId) return;

    api
      .get(`/documents/${activeDocId}/`)
      .then((res) => {
        if (res.data.title) setDocName(res.data.title);

        if (res.data.main_author_name) {
          setAuthorName(res.data.main_author_name);
        } else if (res.data.main_author?.username) {
          setAuthorName(res.data.main_author.username);
        } else {
          setAuthorName('Unknown Author');
        }

        if (res.data.content_json && editor && editor.isEmpty) {
          editor.commands.setContent(res.data.content_json, false);
        }
        setIsLoaded(true);
      })
      .catch((err) => {
        console.error('Failed to fetch document metadata:', err);
        setAuthorName('Unknown Author');
        setIsLoaded(true);
      });
  }, [activeDocId, editor]);

  // 3. Handle Remote Title Updates
  useEffect(() => {
    if (remoteTitle) setDocName(remoteTitle);
  }, [remoteTitle]);

  // 4. Handle Navigation Errors
  useEffect(() => {
    if (errorCode === 4000) navigate('/home?error=invalid_id', { replace: true });
    if (errorCode === 4004) navigate('/home?error=not_found', { replace: true });
  }, [errorCode, navigate]);

  // 5. Handle WebSocket Remote Edits
  useEffect(() => {
    if (!editor || !remoteContent) return;

    isRemoteUpdate.current = true;
    editor.commands.setContent(remoteContent, false);

    const timer = setTimeout(() => {
      isRemoteUpdate.current = false;
    }, 50);

    return () => clearTimeout(timer);
  }, [remoteContent, editor]);

  // 6. Title Change Handler (Debounced API Patch + WS Broadcast)
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setDocName(newTitle);
    sendTitleUpdate(newTitle);

    if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
    titleTimeoutRef.current = setTimeout(() => {
      if (activeDocId) {
        api.patch(`/documents/${activeDocId}/`, { title: newTitle }).catch(console.error);
      }
    }, 500);
  }, [activeDocId, sendTitleUpdate]);

  if (isConnecting || !isLoaded || errorCode) {
    return <div style={styles.loadingContainer}>Connecting to document server...</div>;
  }

  if (!editor) {
    return <div style={styles.loadingContainer}>Loading editor UI...</div>;
  }

  return (
    <div style={styles.container}>
      {/* HEADER SECTION */}
      <div style={styles.headerBar}>
        <div style={styles.headerLeft}>
          <button type="button" onClick={() => navigate('/home')} style={styles.backBtn}>
            ← Back
          </button>

          <div style={styles.metaInfo}>
            <input
              type="text"
              value={docName}
              onChange={handleTitleChange}
              style={styles.docTitleInput}
              placeholder="Document Name"
            />
            <div style={styles.subMeta}>
              <span>Author: <strong>{authorName}</strong></span>
              <span style={styles.metaDot}>•</span>
              <span>ID: <code style={styles.idCode}>{activeDocId}</code></span>
            </div>
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.presenceSection}>
            <span
              style={{
                ...styles.userBadge,
                backgroundColor: isConnected ? 'rgba(0, 168, 204, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: isConnected ? '#00a8cc' : '#ef4444',
              }}
            >
              {isConnected ? `${activeUsers.length} Online` : 'Offline'}
            </span>

            <div style={styles.avatarScrollContainer}>
              <div style={styles.avatarGroup}>
                {activeUsers.map((user) => (
                  <div
                    key={user.user_id}
                    style={{ ...styles.avatar, backgroundColor: '#00a8cc' }}
                    title={user.username}
                  >
                    {getAvatarInitials(user.username)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div style={styles.topBar}>
        <div style={styles.toolbarGroup}>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            style={editor.isActive('heading', { level: 1 }) ? styles.activeBtn : styles.btn}
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            style={editor.isActive('heading', { level: 2 }) ? styles.activeBtn : styles.btn}
          >
            H2
          </button>

          <span style={styles.divider} />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            style={editor.isActive('bold') ? styles.activeBtn : styles.btn}
          >
            <b>B</b>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            style={editor.isActive('italic') ? styles.activeBtn : styles.btn}
          >
            <i>I</i>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            style={editor.isActive('strike') ? styles.activeBtn : styles.btn}
          >
            <s>S</s>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            style={editor.isActive('code') ? styles.activeBtn : styles.btn}
          >
            <code>&lt;/&gt;</code>
          </button>

          <span style={styles.divider} />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            style={editor.isActive('bulletList') ? styles.activeBtn : styles.btn}
          >
            • List
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            style={editor.isActive('orderedList') ? styles.activeBtn : styles.btn}
          >
            1. List
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            style={editor.isActive('blockquote') ? styles.activeBtn : styles.btn}
          >
            “ Quote
          </button>

          <span style={styles.divider} />

          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            style={styles.btn}
          >
            ↩
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            style={styles.btn}
          >
            ↪
          </button>
        </div>
      </div>

      {/* CANVAS */}
      <div style={styles.editorPaper}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '960px',
    margin: '0 auto',
    textAlign: 'left',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  loadingContainer: {
    padding: '60px 20px',
    textAlign: 'center',
    fontSize: '16px',
    fontWeight: '500',
    color: '#64748b',
  },
  headerBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: '#ffffff',
    border: '1px solid #ccc',
    borderBottom: 'none',
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px',
    gap: '12px',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  backBtn: {
    padding: '7px 12px',
    border: '1px solid #cbd5e1',
    background: '#f8fafc',
    color: '#334155',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  metaInfo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  docTitleInput: {
    fontSize: '18px',
    fontWeight: '700',
    border: '1px solid transparent',
    borderRadius: '4px',
    padding: '2px 4px',
    outline: 'none',
    color: '#1a1a1a',
  },
  subMeta: {
    fontSize: '12px',
    color: '#666',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    paddingLeft: '4px',
  },
  metaDot: { color: '#999' },
  idCode: {
    backgroundColor: '#f1f5f9',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#475569',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    background: '#f8fafc',
    border: '1px solid #ccc',
    borderBottom: 'none',
    gap: '12px',
  },
  toolbarGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  divider: {
    width: '1px',
    height: '22px',
    backgroundColor: '#e5e7eb',
    margin: '0 4px',
  },
  btn: {
    padding: '7px 12px',
    border: '1px solid #ccc',
    background: '#ffffff',
    color: '#1a1a1a',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
  },
  activeBtn: {
    padding: '7px 12px',
    border: '1px solid #00a8cc',
    background: '#00a8cc',
    color: '#ffffff',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  presenceSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  userBadge: {
    fontSize: '12px',
    fontWeight: '600',
    padding: '5px 10px',
    borderRadius: '20px',
    whiteSpace: 'nowrap',
  },
  avatarScrollContainer: {
    maxWidth: '160px',
    overflowX: 'auto',
    whiteSpace: 'nowrap',
  },
  avatarGroup: { display: 'inline-flex', alignItems: 'center', gap: '6px' },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '12px',
  },
  editorPaper: {
    minHeight: '480px',
    padding: '36px 44px',
    background: '#ffffff',
    border: '1px solid #ccc',
    borderBottomLeftRadius: '12px',
    borderBottomRightRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  },
};

export default DocumentEditor;