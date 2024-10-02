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
  const [transcribedText, setTranscribedText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const audioChunks = useRef([]);

  

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
      setRecordings(loadedRecordings.sort((a, b) => (a.order || 0) - (b.order || 0)));
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
    audioChunks.current = []; // Reset audioChunks

    mediaRecorder.current.addEventListener("dataavailable", event => {
      audioChunks.current.push(event.data);
    });

    mediaRecorder.current.addEventListener("stop", async () => {
      const audioBlob = new Blob(audioChunks.current, { type: 'audio/mp4' });
      const timestamp = Date.now();
      const fileName = `recording_${timestamp}.mp4`;
      const fileRef = ref(storage, `recordings/${auth.currentUser.uid}/${fileName}`);

      try {
        await uploadBytes(fileRef, audioBlob);
        const downloadURL = await getDownloadURL(fileRef);

        // Start transcription
        startTranscription(audioBlob);

        // Save recording (implement this function as needed)
        await saveRecording(audioBlob, downloadURL, fileName);
      } catch (error) {
        console.error("Error uploading file:", error);
        setError("Failed to upload recording. Please try again.");
      }
    });

    mediaRecorder.current.start();
    setIsRecording(true);
  } catch (err) {
    console.error("Error accessing the microphone:", err);
    setError("Failed to access microphone. Please check your permissions.");
  }
};

          const newRecording = {
            url: downloadURL,
            name: `Recording ${recordings.length + 1}`,
            timestamp: timestamp,
            fileName: fileName,
            userId: auth.currentUser.uid,
            order: recordings.length
          };

          const docRef = await addDoc(collection(db, "recordings"), newRecording);
          setRecordings(prev => [{ id: docRef.id, ...newRecording }, ...prev]);
        } catch (error) {
          console.error("Error uploading file:", error);
          setError("Failed to upload recording. Please try again.");
        }
      });

      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing the microphone:", err);
      setError("Failed to access microphone. Please check your permissions.");
    }
  };

  const stopRecording = () => {
  if (mediaRecorder.current && isRecording) {
    mediaRecorder.current.stop();
    setIsRecording(false);
  }
};

  const updateRecording = async (id, updatedFields) => {
    try {
      const recordingRef = doc(db, "recordings", id);
      await updateDoc(recordingRef, updatedFields);
      setRecordings(prevRecordings => 
        prevRecordings.map(rec => 
          rec.id === id ? { ...rec, ...updatedFields } : rec
        )
      );
    } catch (error) {
      console.error("Error updating recording:", error);
      setError("Failed to update recording. Please try again.");
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

  const onDragEnd = async (result) => {
    if (!result.destination) {
      return;
    }

    const items = Array.from(recordings);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedRecordings = items.map((item, index) => ({
      ...item,
      order: index
    }));

    setRecordings(updatedRecordings);

    // Update the order in Firestore
    for (let recording of updatedRecordings) {
      await updateRecording(recording.id, { order: recording.order });
    }
  };

  const RecordingItem = ({ recording, index, updateRecording, deleteRecording }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [name, setName] = useState(recording.name);

    const handleNameChange = async (newName) => {
      if (newName.trim() === recording.name) return;
      await updateRecording(recording.id, { name: newName.trim() });
    };

    const startTranscription = (audioBlob) => {
    setIsTranscribing(true);
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setTranscribedText(transcript);
      setIsTranscribing(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsTranscribing(false);
    };

    // Convert blob to audio element
    const audio = new Audio(URL.createObjectURL(audioBlob));
    audio.play();
    recognition.start();
  };

  const saveRecording = async (audioBlob, downloadURL, fileName) => {
  const timestamp = Date.now();

  try {
    const docRef = await addDoc(collection(db, "recordings"), {
      url: downloadURL,
      name: `Recording ${recordings.length + 1}`,
      timestamp: timestamp,
      fileName: fileName,
      userId: auth.currentUser.uid,
      transcription: transcribedText
    });

    setRecordings(prev => [
      {
        id: docRef.id,
        url: downloadURL,
        name: `Recording ${prev.length + 1}`,
        timestamp: timestamp,
        fileName: fileName,
        transcription: transcribedText
      },
      ...prev,
    ]);

    setTranscribedText('');
  } catch (error) {
    console.error("Error saving recording:", error);
    setError("Failed to save recording. Please try again.");
  }
};

    return (
    <Draggable draggableId={recording.id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="flex flex-col bg-gray-100 p-3 rounded-lg mb-2"
        >
            <div {...provided.dragHandleProps} className="mr-2 text-gray-500">
              <FaGripVertical />
            </div>
          {recording.transcription && (
            <div className="mt-2">
              <h4 className="font-semibold">Transcription:</h4>
              <p className="text-sm">{recording.transcription}</p>
            </div>
          )}
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
                onBlur={() => handleNameChange(name)}
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
        {isTranscribing && <p className="text-center mb-4">Transcribing...</p>}
        {transcribedText && (
          <div className="mb-4">
            <h3 className="font-bold mb-2">Transcribed Text:</h3>
            <p className="bg-gray-100 p-2 rounded">{transcribedText}</p>
          </div>
        )}
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="recordings">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="mt-4 space-y-2">
                  {recordings.map((recording, index) => (
                    <RecordingItem 
                      key={recording.id} 
                      recording={recording} 
                      index={index} 
                      updateRecording={updateRecording}
                      deleteRecording={deleteRecording}
                    />
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
