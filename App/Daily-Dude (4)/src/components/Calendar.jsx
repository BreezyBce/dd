import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import moment from 'moment';
import { parseISO, format, addDays, addWeeks, addMonths, isSameDay } from 'date-fns';
import { collection, addDoc, updateDoc, deleteDoc, getDocs, query, where, doc } from 'firebase/firestore';
import { db, auth } from '../firebase'; // Adjust the path as necessary

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(BigCalendar);

const eventCategories = ['Work', 'Personal', 'Family', 'Other'];

  const Calendar = () => {
    const [events, setEvents] = useState([]);
    const [newEvent, setNewEvent] = useState({
      title: '',
      start: new Date(),
      end: new Date(),
      recurring: 'none',
      color: '#4a90e2',
      category: 'Other'
    });
    const [editingEvent, setEditingEvent] = useState(null);
    const [view, setView] = useState('month');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');


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

    const handleAddEvent = async (e) => {
      e.preventDefault();
      try {
        const docRef = await addDoc(collection(db, 'events'), {
          ...newEvent,
          userId: auth.currentUser.uid,
          start: newEvent.start,
          end: newEvent.end
        });
        const addedEvent = { ...newEvent, id: docRef.id };
        setEvents(prevEvents => [...prevEvents, addedEvent]);
        setNewEvent({ 
          title: '', 
          start: new Date(selectedDate), 
          end: new Date(selectedDate), 
          recurring: 'none', 
          color: '#4a90e2',
          category: 'Other'
        });
      } catch (error) {
        console.error("Error adding event: ", error);
      }
    };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setNewEvent({ ...event });
    setIsSidebarOpen(true);
  };

    const handleUpdateEvent = async (e) => {
      e.preventDefault();
      try {
        const eventRef = doc(db, 'events', editingEvent.id);
        await updateDoc(eventRef, {
          ...newEvent,
          start: newEvent.start,
          end: newEvent.end
        });
        setEvents(prevEvents => prevEvents.map(event => 
          event.id === editingEvent.id ? newEvent : event
        ));
        setEditingEvent(null);
        setNewEvent({ 
          title: '', 
          start: new Date(selectedDate), 
          end: new Date(selectedDate), 
          recurring: 'none', 
          color: '#4a90e2',
          category: 'Other'
        });
      } catch (error) {
        console.error("Error updating event: ", error);
      }
    };

    const handleDeleteEvent = async (id) => {
      try {
        // Delete from Firebase
        await deleteDoc(doc(db, 'events', id));

        // Delete from local state
        setEvents(prevEvents => prevEvents.filter(event => event.id !== id));

        console.log("Event successfully deleted");
      } catch (error) {
        console.error("Error deleting event: ", error);
      }
    };

  const handleCancelEdit = () => {
    setEditingEvent(null);
    setNewEvent({ 
      title: '', 
      start: new Date(selectedDate), 
      end: new Date(selectedDate), 
      recurring: 'none', 
      color: '#4a90e2',
      category: 'Other'
    });
  };

    const moveEvent = async ({ event, start, end }) => {
      try {
        const eventRef = doc(db, 'events', event.id);
        await updateDoc(eventRef, { start, end });
        setEvents(prevEvents => {
          const idx = prevEvents.indexOf(event);
          const updatedEvent = { ...event, start, end };
          const nextEvents = [...prevEvents];
          nextEvents.splice(idx, 1, updatedEvent);
          return nextEvents;
        });
      } catch (error) {
        console.error("Error moving event: ", error);
      }
    };

    const resizeEvent = async ({ event, start, end }) => {
      try {
        const eventRef = doc(db, 'events', event.id);
        await updateDoc(eventRef, { start, end });
        setEvents(prevEvents => {
          const idx = prevEvents.indexOf(event);
          const updatedEvent = { ...event, start, end };
          const nextEvents = [...prevEvents];
          nextEvents.splice(idx, 1, updatedEvent);
          return nextEvents;
        });
      } catch (error) {
        console.error("Error resizing event: ", error);
      }
    };

  const generateRecurringEvents = useMemo(() => {
    const recurringEvents = [];
    events.forEach(event => {
      if (event.recurring !== 'none') {
        let currentDate = new Date(event.start);
        const endDate = addMonths(currentDate, 3); // Generate events for the next 3 months
        while (currentDate < endDate) {
          recurringEvents.push({
            ...event,
            id: `${event.id}-${currentDate.getTime()}`,
            start: new Date(currentDate),
            end: new Date(currentDate.getTime() + (event.end - event.start)),
          });
          switch (event.recurring) {
            case 'daily':
              currentDate = addDays(currentDate, 1);
              break;
            case 'weekly':
              currentDate = addWeeks(currentDate, 1);
              break;
            case 'monthly':
              currentDate = addMonths(currentDate, 1);
              break;
            default:
              break;
          }
        }
      }
    });
    return recurringEvents;
  }, [events]);

  const allEvents = useMemo(() => {
    return [...events, ...generateRecurringEvents];
  }, [events, generateRecurringEvents]);

    const filteredEvents = useMemo(() => {
      return allEvents.filter(event => 
        (selectedCategory === 'All' || event.category === selectedCategory) &&
        isSameDay(new Date(event.start), selectedDate)
      );
    }, [allEvents, selectedCategory, selectedDate]);

  const getContrastColor = (hexcolor) => {
    if (!hexcolor || hexcolor.length !== 7) return '#000000';
    const r = parseInt(hexcolor.substr(1,2),16);
    const g = parseInt(hexcolor.substr(3,2),16);
    const b = parseInt(hexcolor.substr(5,2),16);
    const yiq = ((r*299)+(g*587)+(b*114))/1000;
    return (yiq >= 128) ? '#000000' : '#ffffff';
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col md:flex-row bg-white rounded-lg shadow-lg max-w-6xl mx-auto dark:bg-dark-background-2 text-gray-800 dark:text-gray-400">
        {/* Sidebar Toggle Button (visible on mobile) */}
        <button 
          className="md:hidden bg-primary text-white p-2 m-2 rounded"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? 'Close Sidebar' : 'Open Sidebar'}
        </button>

        {/* Left Sidebar */}
        <div className={`w-full md:w-1/3 p-4 border-r overflow-y-auto transition-all duration-300 ease-in-out ${isSidebarOpen ? 'max-h-screen' : 'max-h-0 md:max-h-screen'}`}>
          <h2 className="text-xl font-bold mb-4">
            {format(selectedDate, 'MMMM d, yyyy')}
          </h2>
          <div className="mb-4">
            <label className="block mb-2">Filter by Category:</label>
            <select
              value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                              className="w-full p-2 border rounded"
                            >
                              <option value="All">All Categories</option>
                              {eventCategories.map(category => (
                                <option key={category} value={category}>{category}</option>
                              ))}
                            </select>
                          </div>
                          <h3 className="text-lg font-semibold mb-2">Events</h3>
                          {filteredEvents.length > 0 ? (
                            <ul className="mb-4 max-h-60 overflow-y-auto">
                              {filteredEvents.map(event => (
                                <li key={event.id} className="mb-2 p-2 rounded" style={{backgroundColor: event.color}}>
                                  <div className="flex justify-between items-center">
                                    <span style={{color: getContrastColor(event.color)}}>{event.title}</span>
                                    <button 
                                      onClick={() => handleEditEvent(event)} 
                                      className="px-2 py-1 bg-white bg-opacity-25 rounded"
                                      style={{color: getContrastColor(event.color)}}
                                    >
                                      Edit
                                    </button>
                                  </div>
                                  <div className="text-sm" style={{color: getContrastColor(event.color)}}>
                                    {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
                                  </div>
                                  <div className="text-sm" style={{color: getContrastColor(event.color)}}>
                                    Category: {event.category}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mb-4">No events for this day.</p>
                          )}
                          <h3 className="text-lg font-semibold mb-2">
                            {editingEvent ? 'Edit Event' : 'Add Event'}
                          </h3>
                          <form onSubmit={editingEvent ? handleUpdateEvent : handleAddEvent}>
                            <input
                              type="text"
                              placeholder="Event title"
                              value={newEvent.title}
                              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                              className="w-full p-2 border rounded mb-2"
                              required
                            />
                            <input
                              type="datetime-local"
                              value={format(newEvent.start, "yyyy-MM-dd'T'HH:mm")}
                              onChange={(e) => setNewEvent({ ...newEvent, start: new Date(e.target.value) })}
                              className="w-full p-2 border rounded mb-2"
                              required
                            />
                            <input
                              type="datetime-local"
                              value={format(newEvent.end, "yyyy-MM-dd'T'HH:mm")}
                              onChange={(e) => setNewEvent({ ...newEvent, end: new Date(e.target.value) })}
                              className="w-full p-2 border rounded mb-2"
                              required
                            />
                            <select
                              value={newEvent.recurring}
                              onChange={(e) => setNewEvent({ ...newEvent, recurring: e.target.value })}
                              className="w-full p-2 border rounded mb-2"
                            >
                              <option value="none">No Recurrence</option>
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                            </select>
                            <select
                              value={newEvent.category}
                              onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
                              className="w-full p-2 border rounded mb-2"
                            >
                              {eventCategories.map(category => (
                                <option key={category} value={category}>{category}</option>
                              ))}
                            </select>
                            <input
                              type="color"
                              value={newEvent.color}
                              onChange={(e) => setNewEvent({ ...newEvent, color: e.target.value })}
                              className="w-full p-2 border rounded mb-2"
                            />
                            <button type="submit" className="w-full bg-primary text-white p-2 rounded hover:bg-primary-dark mb-2">
                              {editingEvent ? 'Update Event' : 'Add Event'}
                            </button>
                          </form>
                          {editingEvent && (
                            <>
                              <button
                                onClick={handleCancelEdit}
                                className="w-full bg-gray-300 text-gray-800 p-2 rounded hover:bg-gray-400 mb-2"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleDeleteEvent(editingEvent.id)}
                                className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-600"
                              >
                                Delete Event
                              </button>
                            </>
                          )}
                        </div>

                        {/* Main Calendar Area */}
                        <div className="w-full md:w-2/3 p-4">
                          <div className="mb-4 flex justify-between items-center">
                            <select
                              value={view}
                              onChange={(e) => setView(e.target.value)}
                              className="p-2 border rounded"
                            >
                              <option value="month">Month</option>
                              <option value="week">Week</option>
                              <option value="day">Day</option>
                            </select>
                          </div>

                          <DnDCalendar
                            localizer={localizer}
                            events={allEvents}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: 500 }}
                            onEventDrop={moveEvent}
                            onEventResize={resizeEvent}
                            resizable
                            selectable
                            onSelectSlot={(slotInfo) => {
                              setSelectedDate(slotInfo.start);
                              setNewEvent({
                                ...newEvent,
                                start: slotInfo.start,
                                end: slotInfo.end
                              });
                              setIsSidebarOpen(true);
                            }}
                            onSelectEvent={(event) => {
                              setSelectedDate(event.start);
                              handleEditEvent(event);
                            }}
                            eventPropGetter={(event) => ({
                              style: {
                                backgroundColor: event.color,
                              },
                            })}
                            view={view}
                            onView={setView}
                            onNavigate={(date) => setSelectedDate(date)}
                          />
                        </div>
                      </div>
                    </DndProvider>
                  );
                };

                export default Calendar;