// User types
export type User = {
  userId: string;
  username: string;
  email: string;
  name?: string | null;
  bio?: string | null;
  avatar?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateUserInput = {
  name?: string | null;
  bio?: string | null;
  avatar?: string | null;
};
