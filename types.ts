
export interface UserProfile {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
}

export type CellValue = 'X' | 'O' | '';

export interface GameRoom {
  id: string;
  host: UserProfile;
  guest?: UserProfile | null;
  board: CellValue[];
  currentTurn: string; // UID of player whose turn it is
  status: 'waiting' | 'playing' | 'finished';
  winner: string | 'draw' | null; // UID or 'draw'
  createdAt: number;
}
