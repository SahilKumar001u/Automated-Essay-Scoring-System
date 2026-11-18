import { createContext, useContext, useState } from "react";
import { session } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(session.user);

  const login = (tokenResponse) => {
    session.save(tokenResponse);
    setUser(tokenResponse.user);
  };
  const logout = () => {
    session.clear();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
