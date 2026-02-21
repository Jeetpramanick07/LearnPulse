import { createContext, useContext, useState, useEffect } from "react";
import { signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const storedUser = localStorage.getItem("learnpulse_user");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    setLoading(false);

  }, []);

  // EMAIL LOGIN (Firebase)
  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  };

  // GOOGLE LOGIN (Firebase)
  const googleSignIn = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  };

  // LOGOUT
  const logout = async () => {
    await signOut(auth);
    setUser(null);
    localStorage.removeItem("learnpulse_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        googleSignIn,
        logout,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);