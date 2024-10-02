import React, { useState, useRef, useEffect } from 'react';
import { FaEllipsisV, FaDownload, FaTrash, FaShare, FaGripVertical } from 'react-icons/fa';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, db, auth } from '../firebase';

const VoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mediaRecorder = useRef(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadRecordingsFromFirestore(user.uid);
      } else {
        setRecordings([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadRecordingsFromFirestore = async (userId) => {
    try {
      setLoading(true);
      const q = query(collection(db, "recordings"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const loadedRecordings = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecordings(loadedRecordings.sort((a, b) => b.timestamp - a.timestamp));
    } catch (error) {
      console.error("Error loading recordings:", error);
      setError("Failed to load recordings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

const startRecording = async () => {
  if (!auth.currentUser) {
    setError("Please log in to record audio.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream);
    mediaRecorder.current.start();

    const audioChunks = [];
    mediaRecorder.current.addEventListener("dataavailable", event => {
      audioChunks.push(event.data);
    });

    mediaRecorder.current.addEventListener("stop", async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/mp4' });
      const timestamp = Date.now();
      const fileName = `recording_${timestamp}.mp4`;
      const fileRef = ref(storage, `recordings/${auth.currentUser.uid}/${fileName}`);

      try {
        await uploadBytes(fileRef, audioBlob);
        const downloadURL = await getDownloadURL(fileRef);

        const docRef = await addDoc(collection(db, "recordings"), {
          url: downloadURL,
          name: `Recording ${recordings.length + 1}`,
          timestamp: timestamp,
          fileName: fileName,
          userId: auth.currentUser.uid
        });

        setRecordings(prev => [
          {
            id: docRef.id,
            url: downloadURL,
            name: `Recording ${prev.length + 1}`,
            timestamp: timestamp,
            fileName: fileName
          },
          ...prev,
        ]);
      } catch (error) {
        console.error("Error uploading file:", error);
        if (error.code === 'storage/unauthorized') {
          setError("CORS error: Unable to upload file. Please check your Firebase Storage rules.");
        } else {
          setError("Failed to upload recording. Please try again.");
        }
      }
    });

    setIsRecording(true);
  } catch (err) {
    console.error("Error accessing the microphone:", err);
    setError("Failed to access microphone. Please check your permissions.");
  }
};

  const stopRecording = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const deleteRecording = async (id, fileName) => {
    if (!auth.currentUser) {
      setError("Please log in to delete recordings.");
      return;
    }

    try {
      await deleteDoc(doc(db, "recordings", id));
      const fileRef = ref(storage, `recordings/${auth.currentUser.uid}/${fileName}`);
      await deleteObject(fileRef);
      setRecordings(prev => prev.filter(recording => recording.id !== id));
    } catch (error) {
      console.error("Error deleting recording:", error);
      setError("Failed to delete recording. Please try again.");
    }
  };

  const shareRecording = (url) => {
    if (navigator.share) {
      navigator.share({
        title: 'Voice Recording',
        text: 'Check out this voice recording!',
        url: url,
      }).then(() => console.log('Successful share'))
        .catch((error) => console.log('Error sharing', error));
    } else {
      console.log('Web Share API not supported');
      alert('Sharing is not supported on this browser');
    }
  };

  const onDragEnd = (result) => {
    if (!result.destination) {
      return;
    }

    const items = Array.from(recordings);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setRecordings(items);
  };

  const RecordingItem = ({ recording, index }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [name, setName] = useState(recording.name);

  const updateRecordingName = async (newName) => {
    if (newName.trim() === recording.name) return; // No change, don't update

    try {
      const recordingRef = doc(db, "recordings", recording.id);
      await updateDoc(recordingRef, { name: newName.trim() });
      console.log("Recording name updated successfully");
    } catch (error) {
      console.error("Error updating recording name:", error);
      setError("Failed to update recording name. Please try again.");
      // Revert the name if update fails
      setName(recording.name);
    }
  };

     return (
    <Draggable draggableId={recording.id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="flex items-center bg-gray-100 p-3 rounded-lg mb-2"
        >
          <div {...provided.dragHandleProps} className="mr-2 text-gray-500">
            <FaGripVertical />
          </div>
          <div className="flex-shrink-0 mr-4 text-sm text-gray-600">
            <div>{new Date(recording.timestamp).toLocaleDateString()}</div>
            <div>{new Date(recording.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <div className="flex items-center flex-grow mr-4 justify-evenly">
            <audio src={recording.url} controls className="mr-4" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => updateRecordingName(name)}
              className="bg-transparent border-b border-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
            <div className="relative">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-600 hover:text-gray-800">
                <FaEllipsisV />
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                  <a href={recording.url} download={`${name}.mp4`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                    <FaDownload className="mr-2" /> Download
                  </a>
                  <button onClick={() => deleteRecording(recording.id, recording.fileName)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                    <FaTrash className="mr-2" /> Delete
                  </button>
                  <button onClick={() => shareRecording(recording.url)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                    <FaShare className="mr-2" /> Share
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Draggable>
    );
  };

if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md dark:bg-dark-background-2 text-gray-800 dark:text-gray-400">
      <h2 className="text-2xl font-bold mb-4">Voice Recorder</h2>
      {auth.currentUser ? (
        <>
          <div className="flex justify-center mb-4">
            {!isRecording ? (
              <button onClick={startRecording} className="bg-customorange-500 text-white px-4 py-2 rounded hover:bg-customorange-400 transition duration-300">
                Start Recording
              </button>
            ) : (
              <button onClick={stopRecording} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition duration-300">
                Stop Recording
              </button>
            )}
          </div>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="recordings">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="mt-4 space-y-2">
                  {recordings.map((recording, index) => (
                    <RecordingItem key={recording.id} recording={recording} index={index} />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </>
      ) : (
        <div>Please log in to use the Voice Recorder.</div>
      )}
    </div>
  );
};

export default VoiceRecorder;
