import { createContext, useContext, useState, useEffect } from "react";
import { signInWithEmailAndPassword, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ✅ Listen to Firebase auth state — if no Firebase session, clear stale localStorage
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Firebase session exists → load from localStorage
        const storedUser = localStorage.getItem("learnpulse_user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          // ✅ Only restore if UID matches current Firebase user
          if (parsed.uid === firebaseUser.uid) {
            setUser(parsed);
          } else {
            // UID mismatch → different user logged in, clear stale data
            localStorage.removeItem("learnpulse_user");
            setUser(null);
          }
        }
      } else {
        // No Firebase session → clear everything
        localStorage.removeItem("learnpulse_user");
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // EMAIL LOGIN
  const login = async (email, password) => {
    // ✅ Clear old session before new login
    localStorage.removeItem("learnpulse_user");
    setUser(null);
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  };

  // GOOGLE LOGIN
  const googleSignIn = async () => {
    // ✅ Clear old session before new login
    localStorage.removeItem("learnpulse_user");
    setUser(null);
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
        setUser,
        login,
        googleSignIn,
        logout,
        loading
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);