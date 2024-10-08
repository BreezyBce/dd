import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaGoogle } from 'react-icons/fa';

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const navigate = useNavigate();
  const location = useLocation();

  const isPremiumSignup = new URLSearchParams(location.search).get('redirect') === 'premium';

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSignup = async (e) => {
    e.preventDefault();
    await signUpUser(() => createUserWithEmailAndPassword(auth, email, password));
  };

  const handleGoogleSignup = async () => {
    const provider = new GoogleAuthProvider();
    await signUpUser(() => signInWithPopup(auth, provider));
  };

  const signUpUser = async (signUpMethod) => {
    setError(null);
    setSuccessMessage(null);

    if (!isOnline) {
      setError('You are offline. Please check your internet connection and try again.');
      return;
    }

    try {
      const userCredential = await signUpMethod();
      const user = userCredential.user;
      await createUserDocument(user);
      await handlePostSignup(user);
    } catch (error) {
      console.error('Error signing up:', error);
      setError(error.message);
    }
  };

  const createUserDocument = async (user) => {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        createdAt: new Date(),
        subscriptionStatus: 'free'
      });
    }
  };

  const handlePostSignup = async (user) => {
    console.log('User created successfully:', user.uid);

    if (isPremiumSignup) {
      try {
        const response = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            priceId: 'price_1PxwpuA9AcwovfpkLQxWKcJo',
            userId: user.uid,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create checkout session');
        }

        const { url } = await response.json();
        window.location.href = url;
      } catch (error) {
        console.error('Error creating checkout session:', error);
        setError('Failed to initiate premium signup. Please try again.');
      }
    } else {
      setSuccessMessage('Sign up successful! Redirecting to dashboard...');
      setTimeout(() => navigate('/dashboard'), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-customblue-400 via-customorange-500 to-customblue-500">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">SIGN UP</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {successMessage && <p className="text-green-500 mb-4">{successMessage}</p>}
        <form onSubmit={handleSignup}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 mb-4 border rounded-md"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 mb-4 border rounded-md"
            required
          />
          <button 
            type="submit" 
            className="w-full bg-customorange-500 text-white py-2 rounded-md hover:bg-customorange-400"
            disabled={!isOnline}
          >
            Sign Up
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-gray-600">
                    <p>Or</p>
          <div class="flex justify-center mt-4 space-x-4">
          <button
            onClick={handleGoogleSignup}
            className="w-full bg-white text-gray-700 py-2 px-4 rounded-md border border-gray-300 hover:bg-gray-100 flex items-center justify-center"
            disabled={!isOnline}
          ></div>
            <FaGoogle className="mr-2" /> Sign up with Google
          </button>
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Already have an account? <Link to="/login" className="text-customorange-500 hover:underline">Login</Link>
          </p>
        </div>
        {!isOnline && <p className="text-red-500 mt-4">You are currently offline. Please check your internet connection.</p>}
      </div>
    </div>
  );
};

export default SignupPage;
