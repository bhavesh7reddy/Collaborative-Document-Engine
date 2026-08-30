export interface UserPresence {
  type: 'user_presence';
  event: 'JOIN' | 'LEAVE';
  user_id: string;
  username: string;
}

export interface DocUpdateMessage {
  type: 'doc_update';
  content: any;
}

export type WSMessage = UserPresence | DocUpdateMessage;