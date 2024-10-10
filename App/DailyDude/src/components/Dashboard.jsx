import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import Translator from './Translator';
import Calculator from './Calculator';
import CurrencyConverter from './CurrencyConverter';
import Clock from './Clock';  
import UnitConverter from './UnitConverter';  
import WeatherForecast from './WeatherForecast';  
import { FaTrash, FaPlus, FaExpand, FaCompress } from 'react-icons/fa';
import { collection, doc, getDoc, setDoc, query, where, getDocs,  addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useLocation } from 'react-router-dom';



// Define all available widget types
const ALL_WIDGET_TYPES = [
  'TodoList',
  'EventsList',
  'ExpensesSummary',
  'Calculator',
  'CurrencyConverter',
  'Translator',
  'Clock',
  'UnitConverter',
  'WeatherForecast'
];

const Dashboard = ({ expenses = [] }) => {
  const [newNote, setNewNote] = useState('');
  const [notes, setNotes] = useState([]);
  const [events, setEvents] = useState([]);
  const currentDate = new Date();
  const [deletedWidgets, setDeletedWidgets] = useState([]);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const widgetRefs = useRef({});
  const [isLoading, setIsLoading] = useState(true);
  const [todayExpenses, setTodayExpenses] = useState([]);
  const [totalExpensesToday, setTotalExpensesToday] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const location = useLocation();
  const [widgets, setWidgets] = useState([]);


 useEffect(() => {
    const handlePostCheckoutRedirect = async () => {
      const urlParams = new URLSearchParams(location.search);
      const sessionId = urlParams.get('session_id');
      
      if (sessionId) {
        try {
          const response = await fetch('/api/subscription-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'upgrade', session_id: sessionId }),
          });

          if (!response.ok) {
            throw new Error('Failed to update subscription status');
          }

          const data = await response.json();
          console.log('Subscription status update result:', data);
          setIsPremium(data.status === 'premium');

          // Remove the session_id from the URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error('Error updating subscription status:', error);
        }
      }

      setIsLoading(false);
    };

    const checkSubscriptionStatus = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const response = await fetch(`/api/subscription-status?userId=${user.uid}`);
          if (!response.ok) {
            throw new Error('Failed to fetch subscription status');
          }
          const data = await response.json();
          setIsPremium(data.status === 'premium');
        } catch (error) {
          console.error('Error checking subscription status:', error);
        }
      }
      setIsLoading(false);
    };

    handlePostCheckoutRedirect();
    checkSubscriptionStatus();
  }, [location]);


    const fetchDashboardLayout = async (userId) => {
  setIsLoading(true);
  try {
    const docRef = doc(db, 'dashboardLayouts', userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      setWidgets(docSnap.data().widgets);
    } else {
      const defaultWidgets = [
        { id: 'todo', type: 'TodoList', size: 'third' },
        { id: 'events', type: 'EventsList', size: 'third' },
        { id: 'expenses', type: 'ExpensesSummary', size: 'third' },
        { id: 'calculator', type: 'Calculator', size: 'half' },
        { id: 'currency', type: 'CurrencyConverter', size: 'half' },
        { id: 'translator', type: 'Translator', size: 'full' },
      ];
      setWidgets(defaultWidgets);
      await setDoc(docRef, { widgets: defaultWidgets });
    }
  } catch (error) {
    console.error("Error fetching dashboard layout:", error);
  } finally {
    setIsLoading(false);
  }
};


 useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged(async (user) => {
    if (user) {
      await fetchDashboardLayout(user.uid);
    } else {
      setWidgets([]);
      setIsLoading(false);
    }
  });

  return () => unsubscribe();
}, []);

  
  useEffect(() => {
    const saveDashboardLayout = async () => {
      if (auth.currentUser && widgets.length > 0 && !isLoading) {
        try {
          const docRef = doc(db, 'dashboardLayouts', auth.currentUser.uid);
          await setDoc(docRef, { widgets }, { merge: true });
        } catch (error) {
          console.error("Error saving dashboard layout:", error);
        }
      }
    };

    saveDashboardLayout();
  }, [widgets, isLoading]);

  const fetchTodos = async () => {
  if (auth.currentUser) {
    try {
      const q = query(collection(db, 'todos'), where("userId", "==", auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      const fetchedTodos = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotes(fetchedTodos);
    } catch (error) {
      console.error("Error fetching todos:", error);
    }
  }
};

useEffect(() => {
  fetchTodos();
}, []);
  
  const handleAddNote = async () => {
  if (newNote.trim() !== '' && auth.currentUser) {
    const newTodo = {
      content: newNote,
      completed: false,
      userId: auth.currentUser.uid
    };
    try {
      const docRef = await addDoc(collection(db, 'todos'), newTodo);
      const newNoteWithId = { ...newTodo, id: docRef.id };
      setNotes(prevNotes => [...prevNotes, newNoteWithId]);
      setNewNote('');
    } catch (error) {
      console.error("Error adding new note:", error);
    }
  }
};

  const toggleNoteCompletion = async (id) => {
    const updatedNotes = notes.map(note =>
      note.id === id ? { ...note, completed: !note.completed } : note
    );
    setNotes(updatedNotes);
    const noteToUpdate = updatedNotes.find(note => note.id === id);
    await updateDoc(doc(db, 'todos', id), { completed: noteToUpdate.completed });
  };

  const handleDeleteNote = async (id) => {
    await deleteDoc(doc(db, 'todos', id));
    setNotes(notes.filter(note => note.id !== id));
  };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const q = query(collection(db, 'events'), where("userId", "==", auth.currentUser.uid));
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

    fetchEvents();
  }, []);

  const todaysEvents = events.filter(event => {
    const eventDate = new Date(event.start);
    return eventDate.toDateString() === currentDate.toDateString();
  });


   const filteredExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= today && expenseDate < new Date(today.getTime() + 86400000);
    });

    setTodayExpenses(filteredExpenses);
    const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    setTotalExpensesToday(total);
  };

 const fetchTodayExpenses = async () => {
    if (auth.currentUser) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const q = query(
        collection(db, 'transactions'),
        where("userId", "==", auth.currentUser.uid),
        where("type", "==", "expense")
      );

      try {
        const querySnapshot = await getDocs(q);
        const fetchedExpenses = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date.toDate(),
        }));

        setExpenses(fetchedExpenses); // Set all expenses

        const filteredExpenses = fetchedExpenses.filter(expense => 
          expense.date >= today && expense.date < tomorrow
        );

        setTodayExpenses(filteredExpenses);
        const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        setTotalExpensesToday(total);
      } catch (error) {
        console.error("Error fetching today's expenses:", error);
      }
    }
  };

  useEffect(() => {
    fetchTodayExpenses();
  }, []);

  useEffect(() => {
    // Adjust heights after render
    adjustWidgetHeights();
  }, [widgets]);

  const adjustWidgetHeights = () => {
    const rows = {};
    widgets.forEach((widget, index) => {
      const rowIndex = Math.floor(index / (widget.size === 'full' ? 1 : 3));
      if (!rows[rowIndex]) rows[rowIndex] = [];
      rows[rowIndex].push(widget.id);
    });

    Object.values(rows).forEach(row => {
      const maxHeight = Math.max(...row.map(id => widgetRefs.current[id]?.offsetHeight || 0));
      row.forEach(id => {
        if (widgetRefs.current[id]) {
          widgetRefs.current[id].style.height = `${maxHeight}px`;
        }
      });
    });
  };

 const onDragEnd = async (result) => {
  if (!result.destination) return;
  const newWidgets = Array.from(widgets);
  const [reorderedItem] = newWidgets.splice(result.source.index, 1);
  newWidgets.splice(result.destination.index, 0, reorderedItem);
  setWidgets(newWidgets);

  // Save the new layout to Firestore
  if (auth.currentUser) {
    try {
      const docRef = doc(db, 'dashboardLayouts', auth.currentUser.uid);
      await setDoc(docRef, { widgets: newWidgets }, { merge: true });
    } catch (error) {
      console.error("Error saving dashboard layout:", error);
    }
  }
};

  // Add this new function to get all available widget types
  const getAllWidgetTypes = () => {
    const currentTypes = widgets.map(w => w.type);
    const deletedTypes = deletedWidgets.map(w => w.type);
    return [...new Set([...currentTypes, ...deletedTypes])];
  };

 const addWidget = async (widgetType) => {
  const newWidget = { id: `${widgetType}-${Date.now()}`, type: widgetType, size: 'third' };
  const updatedWidgets = [...widgets, newWidget];
  setWidgets(updatedWidgets);
  setShowAddWidget(false);

  if (auth.currentUser) {
    try {
      const docRef = doc(db, 'dashboardLayouts', auth.currentUser.uid);
      await setDoc(docRef, { widgets: updatedWidgets }, { merge: true });
    } catch (error) {
      console.error("Error saving dashboard layout:", error);
    }
  }
};

 const deleteWidget = async (id, type) => {
  const widgetToDelete = widgets.find(w => w.id === id);
  const newWidgets = widgets.filter(w => w.id !== id);
  setWidgets(newWidgets);
  setDeletedWidgets([...deletedWidgets, { ...widgetToDelete, id: `${type}-${Date.now()}` }]);

  if (auth.currentUser) {
    try {
      const docRef = doc(db, 'dashboardLayouts', auth.currentUser.uid);
      await setDoc(docRef, { widgets: newWidgets }, { merge: true });
    } catch (error) {
      console.error("Error saving dashboard layout:", error);
    }
  }
};

  const changeWidgetSize = (id) => {
    setWidgets(widgets.map(widget => {
      if (widget.id === id) {
        const sizes = ['third', 'half', 'two-thirds', 'full'];
        const currentIndex = sizes.indexOf(widget.size);
        const nextSize = sizes[(currentIndex + 1) % sizes.length];
        return { ...widget, size: nextSize };
      }
      return widget;
    }));
  };

  const getWidgetWidth = (size) => {
    // On mobile, always return 100%
    if (window.innerWidth <= 768) {
      return '100%';
    }

    switch (size) {
      case 'full': return '100%';
      case 'two-thirds': return '66.66%';
      case 'half': return '50%';
      case 'third':
      default: return '33.33%';
    }
  };

              const renderWidget = (widget) => {
                switch (widget.type) {
                  case 'TodoList':
  return (
    <div className="bg-white p-6 rounded-lg flex flex-col h-full dark:bg-dark-background-2">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-400">To-Do List</h2>
      <div className="flex-grow overflow-y-auto mb-4">
        <ul>
          {notes.map(note => (
            <li key={note.id} className="mb-2 flex items-center justify-between text-gray-800 dark:text-gray-400">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={note.completed}
                  onChange={() => toggleNoteCompletion(note.id)}
                  className="mr-2"
                />
                <span className={note.completed ? 'line-through text-gray-500' : ''}>
                  {note.content}
                </span>
              </div>
              <button onClick={() => handleDeleteNote(note.id)} className="text-red-500">
                <FaTrash />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-auto">
        <div className="flex">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="flex-grow p-2 border rounded-l"
            placeholder="Add a new To-Do"
          />
          <button onClick={handleAddNote} className="bg-customorange-500 text-white px-4 py-2 rounded-r hover:bg-customorange-400">Add</button>
        </div>
      </div>
    </div>
  );
      case 'EventsList':
        return (
          <div className="bg-white p-6 rounded-lg dark:bg-dark-background-2">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-400">Today's Events</h2>
            {todaysEvents.length > 0 ? (
              <ul>
                {todaysEvents.map(event => (
                  <li key={event.id} className="mb-2 text-gray-800 dark:text-gray-400">
                    <span className="font-semibold">
                      {new Date(event.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span> - {event.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className='text-gray-800 dark:text-gray-400'>No events scheduled for today.</p>
            )}
          </div>
        );
        case 'ExpensesSummary':
        return (
          <div className="bg-white p-6 rounded-lg dark:bg-dark-background-2">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-400">Today's Expenses</h2>
            <p className="text-xl text-gray-800 dark:text-gray-400 mb-4">Total: ${totalExpensesToday.toFixed(2)}</p>
            {todayExpenses.length > 0 ? (
              <ul className="space-y-2">
                {todayExpenses.map((expense) => (
                  <li key={expense.id} className="flex justify-between items-center text-gray-800 dark:text-gray-400 border-b pb-2">
                    <div>
                      <span className="font-medium">{expense.description || 'Unnamed expense'}</span>
                      <span className="text-sm text-gray-500 ml-2">({expense.category || 'Uncategorized'})</span>
                    </div>
                    <span className="font-medium">${expense.amount.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">No expenses recorded for today.</p>
            )}
          </div>
        );
      case 'Calculator':
        return (
          <div className="col-span-3 md:col-span-1 bg-white p-6 rounded-lg dark:bg-dark-background-2">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-400">Calculator</h2>
            <Calculator />
          </div>
        );
      case 'CurrencyConverter':
        return (
          <div className="col-span-3 md:col-span-2 bg-white p-6 rounded-lg dark:bg-dark-background-2">
            <CurrencyConverter />
          </div>
        );
      case 'Translator':
        return (
          <div className="col-span-3 bg-white p-6 rounded-lg dark:bg-dark-background-2">
            <Translator />
          </div>
        );
      case 'Clock':
        return (
          <div className="bg-white p-6 rounded-lg dark:bg-dark-background-2">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-400">Clock</h2>
            <Clock />
          </div>
        );
      case 'UnitConverter':
        return (
          <div className="bg-white p-6 rounded-lg dark:bg-dark-background-2">
            <UnitConverter />
          </div>
        );
      case 'WeatherForecast':
        return (
          <div className="bg-white p-6 rounded-lg dark:bg-dark-background-2">
            <WeatherForecast />
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }

      return (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="dashboard">
            {(provided, snapshot) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef} 
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'stretch',
                  margin: '-8px', // Negative margin to counteract padding on child elements
                }}
              >
                {widgets.map((widget, index) => (
                  <Draggable key={widget.id} draggableId={widget.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={el => {
                          provided.innerRef(el);
                          widgetRefs.current[widget.id] = el;
                        }}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          ...provided.draggableProps.style,
                          width: getWidgetWidth(widget.size),
                          padding: '8px',
                          boxSizing: 'border-box',
                          height: 'auto',
                        }}
                      >
                        <div className='bg-white dark:bg-dark-background-2' style={{
                          borderRadius: '0.5rem',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                          position: 'relative',
                          height: '100%',
                          minHeight: '400px', // Ensure a minimum height for all widgets
                        }}>
                          <div className="absolute top-2 right-2 flex" style={{ zIndex: 10 }}>
                            <button
                              onClick={() => changeWidgetSize(widget.id)}
                              className="text-blue-500 hover:text-blue-700 mr-2"
                            >
                              <FaExpand />
                            </button>
                            <button
                              onClick={() => deleteWidget(widget.id, widget.type)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <FaTrash />
                            </button>
                          </div>
                          {renderWidget(widget)}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                <div 
                  onClick={() => setShowAddWidget(true)}
                  style={{
                    width: window.innerWidth <= 768 ? '100%' : '33.33%',
                    padding: '8px',
                    boxSizing: 'border-box',
                  }}
                >
                  <div className="bg-white dark:bg-dark-background-2" style={{
                    height: '200px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    cursor: 'pointer',
                  }}>
                    <div className="text-center">
                      <FaPlus className="text-7xl text-customorange-500 mb-2" />
                      <span className="text-customorange-500">Add Widget</span>
                    </div>
                  </div>
                </div>
               </div>
            )}
          </Droppable>
{showAddWidget && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg dark:bg-dark-background-2 text-gray-800 dark:text-gray-400" style={{ width: '50%' }}>
                <h2 className="text-2xl font-bold mb-4">Add Widget</h2>
                {ALL_WIDGET_TYPES.map(type => (
                  <button 
                    key={type} 
                    onClick={() => addWidget(type)} 
                    className={`block w-full text-left p-2 hover:bg-gray-100 ${widgets.some(w => w.type === type) ? 'line-through text-gray-500' : ''}`}
                    disabled={widgets.some(w => w.type === type)}
                  >
                    {type}
                  </button>
                ))}
                <button onClick={() => setShowAddWidget(false)} className="mt-4 bg-red-500 text-white px-4 py-2 rounded">Cancel</button>
              </div>
            </div>
          )}
        </DragDropContext>
      );
    };

export default Dashboard;
