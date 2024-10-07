import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if the user is signing up for premium
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
    setError(null);
    setSuccessMessage(null);

    if (!isOnline) {
      setError('You are offline. Please check your internet connection and try again.');
      return;
    }

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password,
          isPremium: isPremiumSignup
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'An error occurred during signup');
      }

      if (isPremiumSignup && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        setSuccessMessage('Sign up successful! Redirecting to dashboard...');
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    } catch (error) {
      console.error('Error signing up:', error);
      setError(error.message);
    }
  };

  const checkUserExistence = async (userId) => {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      console.log('User data:', userSnap.data());
      return true;
    } else {
      console.log('No such user!');
      return false;
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
