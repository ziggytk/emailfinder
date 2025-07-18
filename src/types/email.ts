export interface Email {
  id: string;
  from: {
    name: string;
    email: string;
  };
  subject: string;
  preview: string;
  body: string;
  date: Date;
  read: boolean;
  starred: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export type SearchType = 'all' | 'from' | 'subject' | 'body';