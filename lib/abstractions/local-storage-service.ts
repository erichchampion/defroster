import { Message, GeoLocation } from '@/lib/types/message';

export interface ILocalStorageService {
  initialize(): Promise<void>;
  saveMessage(message: Message): Promise<void>;
  saveMessages(messages: Message[]): Promise<void>;
  getMessagesInRadius(location: GeoLocation, radiusMiles: number): Promise<Message[]>;
  getAllMessages(): Promise<Message[]>;
  deleteMessage(id: string): Promise<void>;
  deleteExpiredMessages(): Promise<number>;
  deleteOldMessages(maxAgeMs: number): Promise<number>;
  deleteMessagesOlderThanOneWeek(): Promise<number>;
  clearAll(): Promise<void>;
}
