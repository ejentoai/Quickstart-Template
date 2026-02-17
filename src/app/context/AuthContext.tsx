
'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from 'react';

interface UserInfo {
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
}


interface AuthContextType {
  email: string | null;       
  setEmail: (email: string) => void; 
  userId: number | null;
  setUserId: (id: number | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export function AuthProvider({ children }: { readonly children: ReactNode }) {
  
  const [email, setEmail] = useState<string | null>(null); 
  const [userId, setUserId] = useState<number | null>(null);
  
  return (
    <AuthContext.Provider
      value={{
        email,
        setEmail,
        userId,
        setUserId
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}  