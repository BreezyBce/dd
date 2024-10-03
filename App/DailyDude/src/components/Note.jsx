import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { updateDoc } from 'firebase/firestore';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

const Note = () => {
  const [notes, setNotes] = useState([]);
  const [categories, setCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', category: '' });
  const [editingNote, setEditingNote] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [expandedNotes, setExpandedNotes] = useState({});
  const [noteOrder, setNoteOrder] = useState([]);

   useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("User is signed in:", user.uid);
        fetchNotes();
      } else {
        console.log("No user signed in");
        setNotes([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchNotes = async () => {
    try {
      console.log("Fetching notes...");
      const q = query(collection(db, 'notes'), where("userId", "==", auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      const fetchedNotes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        completed: doc.data().completed || false
      }));
      console.log("Fetched notes:", fetchedNotes);
      // Sort notes by their order field
      fetchedNotes.sort((a, b) => a.order - b.order);
      setNotes(fetchedNotes);
    } catch (error) {
      console.error("Error fetching notes: ", error);
    }
  };

  const addNote = async (noteToAdd) => {
    try {
      console.log("Adding note:", noteToAdd);
      const docRef = await addDoc(collection(db, 'notes'), {
        ...noteToAdd,
        userId: auth.currentUser.uid,
        createdAt: new Date().toISOString(),
        order: notes.length // Set the order to the current number of notes
      });
      console.log("Note added with ID: ", docRef.id);
      fetchNotes(); // Refresh notes after adding
    } catch (error) {
      console.error("Error adding note: ", error);
    }
  };

  const updateNote = async (noteId, updatedNote) => {
    try {
      console.log("Updating note:", noteId, updatedNote);
      await updateDoc(doc(db, 'notes', noteId), updatedNote);
      console.log("Note updated successfully");
      fetchNotes();
    } catch (error) {
      console.error("Error updating note: ", error);
    }
  };

  const deleteNote = async (noteId) => {
    try {
      console.log("Deleting note:", noteId);
      await deleteDoc(doc(db, 'notes', noteId));
      console.log("Note deleted successfully");
      fetchNotes();
    } catch (error) {
      console.error("Error deleting note: ", error);
    }
  };

  const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  const getContrastColor = (hexColor) => {
    hexColor = hexColor.replace('#', '');
    const r = parseInt(hexColor.substr(0, 2), 16);
    const g = parseInt(hexColor.substr(2, 2), 16);
    const b = parseInt(hexColor.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? 'black' : 'white';
  };

  const handleAddCategory = () => {
    if (newCategory && !categories[newCategory]) {
      setCategories({ ...categories, [newCategory]: getRandomColor() });
      setNewNote({ ...newNote, category: newCategory });
      setNewCategory('');
    }
  };

  const handleAddNote = async () => {
    if (newNote.title) {
      try {
        const date = new Date();
        const formattedDate = `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}, ${date.getFullYear()}`;
        const noteToAdd = {
          ...newNote,
          content: newNote.content || '',
          completed: false,
          createdAt: formattedDate
        };
        await addNote(noteToAdd);
        setNewNote({ title: '', content: '', category: '' });
        setIsAddNoteOpen(false);
      } catch (error) {
        console.error("Error in handleAddNote:", error);
      }
    }
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setNewNote({ title: note.title, content: note.content, category: note.category });
    setIsAddNoteOpen(true);
  };

  const handleUpdateNote = async () => {
    if (editingNote) {
      try {
        const noteRef = doc(db, 'notes', editingNote.id);
        await updateDoc(noteRef, {
          title: newNote.title,
          content: newNote.content,
          category: newNote.category,
          updatedAt: new Date().toISOString()
        });
        console.log("Note updated successfully");
        setEditingNote(null);
        setNewNote({ title: '', content: '', category: '' });
        setIsAddNoteOpen(false);
        fetchNotes();
      } catch (error) {
        console.error("Error updating note: ", error);
      }
    }
  };

  const handleDeleteNote = (id) => {
    if (window.confirm('Delete note?')) {
      deleteNote(id);
    }
  };

  const handleDeleteCategory = (categoryToDelete) => {
    if (window.confirm(`Are you sure you want to delete the category "${categoryToDelete}"? This will remove the category from all notes.`)) {
      const updatedCategories = { ...categories };
      delete updatedCategories[categoryToDelete];
      setCategories(updatedCategories);

      const updatedNotes = notes.map(note => 
        note.category === categoryToDelete ? { ...note, category: '' } : note
      );
      setNotes(updatedNotes);

      if (selectedCategory === categoryToDelete) {
        setSelectedCategory('All');
      }
    }
  };

  const toggleNoteCompletion = async (noteId, currentCompletionStatus) => {
    try {
      const noteRef = doc(db, 'notes', noteId);
      await updateDoc(noteRef, {
        completed: !currentCompletionStatus
      });
      console.log(`Note ${noteId} completion toggled`);
      fetchNotes();
    } catch (error) {
      console.error("Error toggling note completion:", error);
    }
  };

 const toggleNoteExpansion = (id) => {
    setExpandedNotes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

   const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(notes);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update the order of items
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index
    }));

    setNotes(updatedItems);

    // Update the order in Firestore
    try {
      const batch = writeBatch(db);
      updatedItems.forEach((item) => {
        const noteRef = doc(db, 'notes', item.id);
        batch.update(noteRef, { order: item.order });
      });
      await batch.commit();
      console.log("Note order updated in database");
    } catch (error) {
      console.error("Error updating note order:", error);
    }
  };

  const filteredNotes = noteOrder
    .map(id => notes.find(note => note.id === id))
    .filter(note => 
      (selectedCategory === 'All' || note.category === selectedCategory) &&
      (note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
       note.content.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  const completedNotes = notes.filter(note => note.completed).length;
  const totalNotes = notes.length;
  const progressPercentage = totalNotes > 0 ? (completedNotes / totalNotes) * 100 : 0;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border rounded shadow-sm"
        />
      </div>
      <div className="mb-4 flex flex-wrap items-center">
        <button
          className={`px-4 py-2 rounded mr-2 mb-2 ${selectedCategory === 'All' ? 'bg-customorange-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setSelectedCategory('All')}
        >
          All
        </button>
        {Object.entries(categories).map(([category, color]) => (
          <div key={category} className="relative mr-2 mb-2">
            <button
              className={`px-4 py-2 rounded text-white flex items-center ${selectedCategory === category ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
              style={{ backgroundColor: color, color: getContrastColor(color) }}
              onClick={() => setSelectedCategory(category)}
            >
              <span className="truncate max-w-xs">{category}</span>
            </button>
            <button
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteCategory(category);
              }}
            >
              <FaTimes />
            </button>
          </div>
        ))}
        <button
          className="bg-customorange-500 text-white px-4 py-2 rounded flex items-center whitespace-nowrap mb-2"
          onClick={() => setIsAddNoteOpen(true)}
        >
          <FaPlus className="mr-2" /> ADD NOTE
        </button>
      </div>
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-800 dark:text-gray-400">
          You have {completedNotes}/{totalNotes} notes completed
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4 dark:bg-gray-700">
          <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
        </div>
      </div>
     
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="notes">
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {notes.map((note, index) => {
              const backgroundColor = categories[note.category] || '#ffffff';
              const textColor = getContrastColor(backgroundColor);
              const isExpanded = expandedNotes[note.id];
              const shouldTruncate = note.content.length > 100;
              return (
                <Draggable key={note.id} draggableId={note.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`p-4 rounded shadow-md ${note.completed ? 'opacity-50' : ''}`}
                      style={{
                        backgroundColor,
                        color: textColor,
                        ...provided.draggableProps.style
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={note.completed}
                            onChange={() => toggleNoteCompletion(note.id, note.completed)}
                            className="mr-2"
                          />
                          <h3 className={`font-bold ${note.completed ? 'line-through' : ''}`}>{note.title}</h3>
                        </div>
                        <div>
                          <button onClick={() => handleEditNote(note)} className="mr-2" style={{ color: textColor }}><FaEdit /></button>
                          <button onClick={() => handleDeleteNote(note.id)} style={{ color: textColor }}><FaTrash /></button>
                        </div>
                      </div>
                      <div className={`mb-2 ${note.completed ? 'line-through' : ''}`}>
                        <p className="whitespace-pre-wrap break-words">
                          {shouldTruncate && !isExpanded
                            ? truncateText(note.content, 100)
                            : note.content}
                        </p>
                        {shouldTruncate && (
                          <button 
                            onClick={() => toggleNoteExpansion(note.id)} 
                            className="text-sm font-medium mt-2"
                            style={{ color: textColor }}
                          >
                            {isExpanded ? (
                              <>Show Less <FaChevronUp className="inline ml-1" /></>
                            ) : (
                              <>Show More <FaChevronDown className="inline ml-1" /></>
                            )}
                          </button>
                        )}
                      </div>
                      <p className="text-sm mt-2" style={{ color: textColor, opacity: 0.7 }}>
                        {formatDate(note.createdAt)}
                      </p>
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      </DragDropContext>
        {isAddNoteOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-4 rounded-lg w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">{editingNote ? 'Edit note' : 'Add note'}</h2>
              <input
                type="text"
                placeholder="Title"
                value={newNote.title}
                onChange={(e) => setNewNote({...newNote, title: e.target.value})}
                className="w-full p-2 mb-2 border rounded"
              />
              <textarea
                placeholder="Content (optional)"
                value={newNote.content}
                onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                className="w-full p-2 mb-2 border rounded h-32"
              />
              <div className="flex mb-4">
                <select
                  value={newNote.category}
                  onChange={(e) => setNewNote({...newNote, category: e.target.value})}
                  className="w-full p-2 border rounded mr-2"
                >
                  <option value="">Select Category</option>
                  {Object.keys(categories).map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <div className="flex">
                  <input
                    type="text"
                    placeholder="New Category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="p-2 border rounded-l"
                  />
                  <button
                    onClick={handleAddCategory}
                    className="bg-customorange-500 text-white px-4 py-2 rounded-r"
                  >
                    Add
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setIsAddNoteOpen(false);
                    setEditingNote(null);
                    setNewNote({ title: '', content: '', category: '' });
                  }}
                  className="px-4 py-2 rounded mr-2 bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={editingNote ? handleUpdateNote : handleAddNote}
                  className="px-4 py-2 rounded bg-customorange-500 text-white"
                >
                  {editingNote ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
        );
        };

        export default Note;
