import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Link, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe('pk_live_51PxkA4A9AcwovfpkfFRUdMdw4sedFAIPEkUz1yamgloRHUMGta3aZYhwlDToLu2XCSck7sevAtNV6bu9VvXIcHSY00LRwIzPeg'); // Replace with your actual publishable key

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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
    setIsLoading(true);

    if (!isOnline) {
      setError('You are offline. Please check your internet connection and try again.');
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create a user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        createdAt: new Date(),
        subscriptionStatus: 'free'
      });

      console.log('User created successfully:', user.uid);
      setSuccessMessage('Sign up successful! Redirecting to subscription...');
      
      // Redirect to subscription process
      setTimeout(() => initiateSubscription(user.uid, user.email), 2000);
    } catch (error) {
      console.error('Error signing up:', error);
      if (error.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(error.message);
      }
      setIsLoading(false);
    }
  };

  const initiateSubscription = async (userId, userEmail) => {
    try {
      const response = await fetch('/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          email: userEmail,
          priceId: 'price_1PxwpuA9AcwovfpkLQxWKcJo', // Replace with your actual Stripe Price ID
        }),
      });

      const session = await response.json();

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error initiating subscription:', error);
      setError('An error occurred while setting up the subscription. Please try again.');
      setIsLoading(false);
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
            disabled={!isOnline || isLoading}
          >
            {isLoading ? 'Processing...' : 'Sign Up'}
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
