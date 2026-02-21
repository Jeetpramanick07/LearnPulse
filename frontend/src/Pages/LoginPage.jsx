import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function LoginPage() {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, googleSignIn } = useAuth();
  const navigate = useNavigate();


  // EMAIL LOGIN
  const handleLogin = async (e) => {

    e.preventDefault();

    setLoading(true);
    setError('');

    try {

      // login using AuthContext (Firebase)
      const firebaseUser = await login(email, password);

      // fetch role from Firestore
      const userRef = doc(db, "users", firebaseUser.uid);

      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        throw new Error("User role not found in database");
      }

      const userData = userSnap.data();

      // save full user info including role
      localStorage.setItem("learnpulse_user", JSON.stringify({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        role: userData.role
      }));

      navigate('/dashboard');

    } catch (err) {

      setError('Invalid email or password.');
      console.error(err);

    } finally {

      setLoading(false);

    }

  };


  // GOOGLE LOGIN
  const handleGoogleSignIn = async () => {

    setError('');

    try {

      const firebaseUser = await googleSignIn();

      const userRef = doc(db, "users", firebaseUser.uid);

      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        throw new Error("User role not found");
      }

      const userData = userSnap.data();

      localStorage.setItem("learnpulse_user", JSON.stringify({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        role: userData.role
      }));

      navigate('/dashboard');

    } catch (err) {

      setError('Google sign-in failed.');
      console.error(err);

    }

  };


  return (

    <div className="min-h-screen bg-white flex items-center justify-center p-4">

      <div className="w-full max-w-md">

        <div className="bg-white border border-gray-200 rounded-lg p-10">

          <div className="text-center mb-8">

            <div className="mb-4">
              <img src="/Logo2.png" alt="LearnPulse Logo" className="w-20 h-20 mx-auto" />
            </div>

            <h1 className="text-2xl font-medium text-gray-900 mb-1">
              LearnPulse
            </h1>

            <p className="text-sm text-gray-500">
              Faculty Portal
            </p>

          </div>


          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}


          <form onSubmit={handleLogin} className="space-y-5">

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                Email Address
              </label>

              <input
                type="email"
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
                placeholder="your.email@university.edu"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-sm"
                required
              />
            </div>


            <div>

              <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                Password
              </label>

              <div className="relative">

                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e)=>setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-sm pr-16"
                  required
                />

                <button
                  type="button"
                  onClick={()=>setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>

              </div>

            </div>


            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white py-3 rounded-md text-sm font-medium"
            >

              {loading ? "Signing in..." : "Sign In"}

            </button>

          </form>


          <div className="flex items-center gap-4 my-8">

            <div className="flex-1 h-px bg-gray-200"></div>

            <span className="text-xs text-gray-400 uppercase tracking-wider">
              or
            </span>

            <div className="flex-1 h-px bg-gray-200"></div>

          </div>


          <button
            onClick={handleGoogleSignIn}
            className="w-full py-3 border rounded-md text-sm"
          >
            Continue with Google
          </button>


          <p className="text-center text-xs text-gray-400 mt-8">
            Secured by Firebase Authentication
          </p>

        </div>

      </div>

    </div>

  );

}