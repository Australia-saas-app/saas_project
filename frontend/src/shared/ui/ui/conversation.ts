export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'other';
  avatar: string;
  timestamp?: string;
}

export interface Participant {
  id: string;
  name: string;
  avatar: string;
  profileUrl: string;
  servicesUrl: string;
}