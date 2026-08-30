import { useEffect, useState, useRef, useCallback } from 'react';

export interface ActiveUser {
  user_id: string;
  username: string;
}

export const useDocumentSocket = (docId: string, searchParams: string = '') => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [remoteContent, setRemoteContent] = useState<any>(null);
  const [remoteTitle, setRemoteTitle] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!docId) {
      setIsConnecting(false);
      return;
    }

    setIsConnecting(true);
    setErrorCode(null);

    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const token = localStorage.getItem('access_token') || '';

    // Parse searchParams safely
    const query = new URLSearchParams(searchParams);
    if (token) {
      query.set('token', token);
    }

    const wsUrl = `${wsScheme}://127.0.0.1:8000/ws/documents/${docId}/?${query.toString()}`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setIsConnecting(false);
      setErrorCode(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'doc_update':
            setRemoteContent(data.content);
            break;
          // MATCHED TO DJANGO: 'doc_title_update'
          case 'doc_title_update':
            if (data.title !== undefined) {
              setRemoteTitle(data.title);
            }
            break;
          case 'presence_snapshot':
            setActiveUsers(data.users || []);
            break;
          default:
            break;
        }
      } catch (err) {
        console.error('WebSocket parse error:', err);
      }
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      setIsConnecting(false);
      if (event.code === 4000 || event.code === 4004) {
        setErrorCode(event.code);
      }
    };

    return () => {
      ws.close();
    };
  }, [docId, searchParams]);

  // Wrapped in useCallback for performance and component stability
  const sendUpdate = useCallback((content: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'doc_update',
          content,
        })
      );
    }
  }, []);

  // MATCHED TO DJANGO: sends 'doc_title_update'
  const sendTitleUpdate = useCallback((title: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'doc_title_update',
          title,
        })
      );
    }
  }, []);

  return {
    isConnected,
    isConnecting,
    activeUsers,
    remoteContent,
    remoteTitle,
    sendUpdate,
    sendTitleUpdate,
    errorCode,
    socketRef,
  };
};