import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Link } from 'react-router-dom';
import { FaBars, FaTimes, FaCalendarAlt, FaClock, FaCalculator, FaStickyNote, FaExchangeAlt, FaLanguage, FaHome, FaCloudSun, FaMicrophone, FaWallet, FaRuler, FaMoon, FaSun, FaUser, FaChevronDown } from 'react-icons/fa';
import Calendar from './components/Calendar';
import Clock from './components/Clock';
import Calculator from './components/Calculator';
import Note from './components/Note';
import CurrencyConverter from './components/CurrencyConverter';
import Translator from './components/Translator';
import Dashboard from './components/Dashboard';
import WeatherForecast from './components/WeatherForecast';
import VoiceRecorder from './components/VoiceRecorder';
import ExpenseTracker from './components/ExpenseTracker';
import HeaderWeather from './components/HeaderWeather';
import UnitConverter from './components/UnitConverter';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, setDoc, query, where, getDocs } from 'firebase/firestore';
import { SubscriptionProvider, useSubscription } from './SubscriptionContext';
import { getSubscriptionStatus } from './services/stripe';
import { AuthProvider } from './contexts/AuthContext';
import SubscriptionManager from './SubscriptionManager';
import withSubscription from './withSubscription';




function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expenses, setExpenses] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [widgets, setWidgets] = useState([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState('free');
  const [currentView, setCurrentView] = useState('dashboard');
  const PremiumCurrencyConverter = withSubscription(CurrencyConverter, 'premium');
  const PremiumWeatherForecast = withSubscription(WeatherForecast, 'premium');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };


  useEffect(() => {
    console.log('App useEffect triggered');
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      console.log('Auth state changed:', authUser ? 'User logged in' : 'No user');
      if (authUser) {
        await handleUserLogin(authUser);
      } else {
        setUser(null);
        setSubscriptionStatus('free');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
 

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const fetchDashboardLayout = async (userId) => {
    try {
      const docRef = doc(db, 'dashboardLayouts', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setWidgets(docSnap.data().widgets);
      } else {
        const defaultWidgets = [
          { id: 'todo', type: 'TodoList', size: 'full' },
          { id: 'events', type: 'EventsList', size: 'half' },
          { id: 'expenses', type: 'ExpensesSummary', size: 'half' },
          { id: 'calculator', type: 'Calculator', size: 'third' },
          { id: 'currency', type: 'CurrencyConverter', size: 'third' },
          { id: 'translator', type: 'Translator', size: 'third' },
        ];
        setWidgets(defaultWidgets);
        await setDoc(docRef, { widgets: defaultWidgets });
      }
    } catch (error) {
      console.error("Error fetching dashboard layout:", error);
    }
  };

  const fetchExpenses = async (userId) => {
    try {
      const q = query(collection(db, 'transactions'), where("userId", "==", userId), where("type", "==", "expense"));
      const querySnapshot = await getDocs(q);
      const fetchedExpenses = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
        amount: parseFloat(doc.data().amount) // Ensure amount is a number
      }));
      setExpenses(fetchedExpenses);
    } catch (error) {
      console.error("Error fetching expenses: ", error);
    }
  };

  const fetchEvents = async (userId) => {
    try {
      const q = query(collection(db, 'events'), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const fetchedEvents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        start: doc.data().start.toDate(),
        end: doc.data().end.toDate()
      }));
      setEvents(fetchedEvents);
    } catch (error) {
      console.error("Error fetching events: ", error);
    }
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'calendar':
        return <Calendar />;
      case 'clock':
        return <Clock />;
      case 'calculator':
        return <Calculator />;
      case 'note':
        return <Note />;
      case 'currency':
        return <PremiumCurrencyConverter />;
      case 'unitConverter':
        return <UnitConverter />;
      case 'translator':
        return <Translator />;
      case 'weather':
        return <PremiumWeatherForecast />;
      case 'voice':
        return <VoiceRecorder />;
      case 'expense':
        return <ExpenseTracker />;
      default:
        return <Dashboard />;
    }
  };


  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

    // Add handleLogin function
  const handleUserLogin = async (authUser) => {
    if (authUser) {
      // Reference to the user document in Firestore
      const userDocRef = doc(db, 'users', authUser.uid);

      try {
        // Check if the user document already exists
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          // If the user doesn't exist in the database, create a new user document
          await setDoc(userDocRef, {
            email: authUser.email,
            displayName: authUser.displayName,
            subscriptionStatus: 'free', // Default to free subscription
            createdAt: new Date(),
          });
        }

        // Fetch the user's current data (including subscription status)
        const currentUserDoc = await getDoc(userDocRef);
        const userData = currentUserDoc.data();

        // Update the local state with the user's data
        setUser(authUser);
        setSubscriptionStatus(userData.subscriptionStatus || 'free');

        // Fetch user-specific data
        fetchDashboardLayout(authUser.uid);
        fetchExpenses(authUser.uid);
        fetchEvents(authUser.uid);

      } catch (error) {
        console.error("Error handling user login:", error);
      }
    }
  };
  
  const handleLogout = () => {
    auth.signOut();
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  if (loading) {
    return <div>Loading...</div>;
  }
  
  
                return (
                                <AuthProvider>
                                  <SubscriptionProvider>
                                    <Router>
                                      <Routes>
                                        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
                                        <Route path="/signup" element={user ? <Navigate to="/dashboard" /> : <SignupPage />} />
                                        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
                                        <Route path="/subscription" element={user ? <SubscriptionManager /> : <Navigate to="/login" replace />} />

                                        <Route
                                          path="/*"
                                          element={
                                            user ? (
                                              <div className={`flex h-screen ${darkMode ? 'dark' : ''}`}>
                {/* Sidebar */}
                    <div className={`fixed inset-y-0 left-0 z-30 w-64 text-white bg-customblue-500 dark:bg-dark-background transition-all duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
                  <div className="flex items-center justify-between h-52 px-4 bg-customblue">
                    <img src="./img/DailyDudeLogo.png" alt="DailyDude Logo" className="h-36 w-auto" />
                    <button onClick={toggleSidebar} className="text-white">
                      <FaTimes size={24} />
                    </button>
                  </div>
                  <nav className="flex-1 overflow-y-auto bg-customblue-500 mt-5 dark:bg-dark-background transition-all duration-300">
                    <div className="px-4">
                        <a onClick={() => { setCurrentView('dashboard'); toggleSidebar(); }} className={`flex items-center px-6 py-2 mt-4 duration-200 border-l-4 ${currentView === 'dashboard' ? 'bg-gray-600 bg-opacity-25 text-gray-100 border-customorange' : 'border-white text-white-500 hover:bg-gray-600 hover:bg-opacity-25 hover:text-gray-100'}`}>
                        <FaHome className="mr-3" /> Dashboard
                      </a>
                      <a onClick={() => { setCurrentView('calendar'); toggleSidebar(); }} className={`flex items-center px-6 py-2 mt-4 duration-200 border-l-4 ${currentView === 'calendar' ? 'bg-gray-600 bg-opacity-25 text-gray-100 border-customorange' : 'border-white text-white-500 hover:bg-gray-600 hover:bg-opacity-25 hover:text-gray-100'}`}>
                        <FaCalendarAlt className="mr-3" /> Calendar
                      </a>
                      <a onClick={() => { setCurrentView('clock'); toggleSidebar(); }} className={`flex items-center px-6 py-2 mt-4 duration-200 border-l-4 ${currentView === 'clock' ? 'bg-gray-600 bg-opacity-25 text-gray-100 border-customorange' : 'border-white text-white-500 hover:bg-gray-600 hover:bg-opacity-25 hover:text-gray-100'}`}>
                        <FaClock className="mr-3" /> Clock
                      </a>
                      <a onClick={() => { setCurrentView('calculator'); toggleSidebar(); }} className={`flex items-center px-6 py-2 mt-4 duration-200 border-l-4 ${currentView === 'calculator' ? 'bg-gray-600 bg-opacity-25 text-gray-100 border-customorange' : 'border-white text-white-500 hover:bg-gray-600 hover:bg-opacity-25 hover:text-gray-100'}`}>
                        <FaCalculator className="mr-3" /> Calculator
                      </a>
                      <a onClick={() => { setCurrentView('note'); toggleSidebar(); }} className={`flex items-center px-6 py-2 mt-4 duration-200 border-l-4 ${currentView === 'note' ? 'bg-gray-600 bg-opacity-25 text-gray-100 border-customorange' : 'border-white text-white-500 hover:bg-gray-600 hover:bg-opacity-25 hover:text-gray-100'}`}>
                        <FaStickyNote className="mr-3" /> Notes
                      </a>
                      <a onClick={() => { setCurrentView('currency'); toggleSidebar(); }} className={`flex items-center px-6 py-2 mt-4 duration-200 border-l-4 ${currentView === 'currency' ? 'bg-gray-600 bg-opacity-25 text-gray-100 border-customorange' : 'border-white text-white-500 hover:bg-gray-600 hover:bg-opacity-25 hover:text-gray-100'}`}>
                        <FaExchangeAlt className="mr-3" /> Currency Converter
                      </a>
                      <a onClick={() => { setCurrentView('unitConverter'); toggleSidebar(); }} className={`flex items-center px-6 py-2 mt-4 duration-200 border-l-4 ${currentView === 'unitConverter' ? 'bg-gray-600 bg-opacity-25 text-gray-100 border-customorange' : 'border-white text-white-500 hover:bg-gray-600 hover:bg-opacity-25 hover:text-gray-100'}`}>
                        <FaRuler className="mr-3" /> Unit Converter
                      </a>
                      <a onClick={() => { setCurrentView('translator'); toggleSidebar(); }} className={`flex items-center px-6 py-2 mt-4 duration-200 border-l-4 ${currentView === 'translator' ? 'bg-gray-600 bg-opacity-25 text-gray-100 border-customorange' : 'border-white text-white-500 hover:bg-gray-600 hover:bg-opacity-25 hover:text-gray-100'}`}>
                        <FaLanguage className="mr-3" /> Translator
                      </a>
                      <a onClick={() => { setCurrentView('weather'); toggleSidebar(); }} className={`flex items-center px-6 py-2 mt-4 duration-200 border-l-4 ${currentView === 'weather' ? 'bg-gray-600 bg-opacity-25 text-gray-100 border-customorange' : 'border-white text-white-500 hover:bg-gray-600 hover:bg-opacity-25 hover:text-gray-100'}`}>
                        <FaCloudSun className="mr-3" /> Weather Forecast
                      </a>
                      <a onClick={() => { setCurrentView('voice'); toggleSidebar(); }} className={`flex items-center px-6 py-2 mt-4 duration-200 border-l-4 ${currentView === 'voice' ? 'bg-gray-600 bg-opacity-25 text-gray-100 border-customorange' : 'border-white text-white-500 hover:bg-gray-600 hover:bg-opacity-25 hover:text-gray-100'}`}>
                        <FaMicrophone className="mr-3" /> Voice Recorder
                      </a>
                      <a onClick={() => { setCurrentView('expense'); toggleSidebar(); }} className={`flex items-center px-6 py-2 mt-4 duration-200 border-l-4 ${currentView === 'expense' ? 'bg-gray-600 bg-opacity-25 text-gray-100 border-customorange' : 'border-white text-white-500 hover:bg-gray-600 hover:bg-opacity-25 hover:text-gray-100'}`}>
                        <FaWallet className="mr-3" /> Expense Tracker
                      </a>
                    </div>
                  </nav>
                </div>

<div className="flex-1 flex flex-col overflow-hidden">
  <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b-4 border-customblue-500 dark:border-gray-700">
    <div className="flex items-center">
      <button onClick={toggleSidebar} className="text-gray-500 dark:text-gray-400 focus:outline-none">
        <FaBars size={24} />
      </button>
      <h1></h1>
    </div>
    <div className="flex items-center">
      <HeaderWeather />
      <button onClick={toggleDarkMode} className="ml-4 p-2 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
        {darkMode ? <FaSun size={20} /> : <FaMoon size={20} />}
      </button>
      <div className="relative ml-4">
        <button
          onClick={toggleUserMenu}
          className="flex items-center focus:outline-none"
        >
          <FaUser className="text-gray-600 dark:text-gray-300" />
          <FaChevronDown className="ml-1 text-gray-600 dark:text-gray-300" />
        </button>
        {isUserMenuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50">
            <Link
              to="/subscription"
              className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => setIsUserMenuOpen(false)}
            >
              Manage Subscription
            </Link>
            <button
              onClick={() => {
                handleLogout();
                setIsUserMenuOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  </header>
  <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200 dark:bg-gray-900">
    <div className="container mx-auto px-6 py-8">
      {renderCurrentView()}
    </div>
  </main>
  </div>
  </div>
  ) : (
  <Navigate to="/login" replace />
  )
  }
  />
  </Routes>
  </Router>
  </SubscriptionProvider>
  </AuthProvider>
  );
  }

  export default App;
