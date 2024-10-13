import React, { useState, useRef, useEffect } from 'react';
import { FaEllipsisV, FaDownload, FaTrash, FaShare, FaGripVertical } from 'react-icons/fa';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, db, auth } from '../firebase';
import withSubscription from '../withSubscription';

const VoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transcribedText, setTranscribedText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [language, setLanguage] = useState('en-US');
  const mediaRecorder = useRef(null);
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
      audioChunks.current = [];

      mediaRecorder.current.addEventListener("dataavailable", event => {
        audioChunks.current.push(event.data);
      });

      mediaRecorder.current.addEventListener("stop", async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/mp4' });
        try {
          await saveRecording(audioBlob);
        } catch (error) {
          console.error("Error saving recording:", error);
          setError("Failed to save recording. Please try again.");
        }
      });

      mediaRecorder.current.start();
      setIsRecording(true);
      setError(null);
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

  const saveRecording = async (audioBlob) => {
    const timestamp = Date.now();
    const fileName = `recording_${timestamp}.mp4`;
    const fileRef = ref(storage, `recordings/${auth.currentUser.uid}/${fileName}`);

    try {
      await uploadBytes(fileRef, audioBlob);
      const downloadURL = await getDownloadURL(fileRef);

      // Start transcription and wait for it to complete
      const transcription = await startTranscription(audioBlob, language);

      const docRef = await addDoc(collection(db, "recordings"), {
        url: downloadURL,
        name: `Recording ${recordings.length + 1}`,
        timestamp: timestamp,
        fileName: fileName,
        userId: auth.currentUser.uid,
        transcription: transcription,
        language: language
      });

      setRecordings(prev => [
        {
          id: docRef.id,
          url: downloadURL,
          name: `Recording ${prev.length + 1}`,
          timestamp: timestamp,
          fileName: fileName,
          transcription: transcription,
          language: language
        },
        ...prev,
      ]);

      setTranscribedText('');
    } catch (error) {
      throw error;
    }
  };

  const startTranscription = (audioBlob, language) => {
    return new Promise((resolve, reject) => {
      setIsTranscribing(true);
      let fullTranscript = '';

      try {
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = language;
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              fullTranscript += formatSentence(transcript, language);
            } else {
              interimTranscript += transcript;
            }
          }
          setTranscribedText(fullTranscript + interimTranscript);
        };

        recognition.onend = () => {
          setIsTranscribing(false);
          resolve(fullTranscript.trim());
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error', event.error);
          setError('Failed to transcribe audio. Please try again.');
          setIsTranscribing(false);
          reject(event.error);
        };

        // Convert blob to audio element and play
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.addEventListener('ended', () => {
          recognition.stop();
        });
        audio.play();

        recognition.start();
      } catch (error) {
        console.error("Error starting transcription:", error);
        setIsTranscribing(false);
        setError('Speech recognition is not supported in this browser.');
        reject(error);
      }
    });
  };

  const formatSentence = (sentence, language) => {
    sentence = sentence.trim();
    
    // Capitalize the first letter
    sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);

    // Add appropriate punctuation
    if (isQuestion(sentence, language)) {
      sentence += '? ';
    } else {
      sentence += '. ';
    }

    return sentence;
  };

  const isQuestion = (sentence, language) => {
    const questionWords = {
      'en-US': /^(who|what|when|where|why|how|is|are|am|do|does|did|can|could|would|should|has|have)\b/i,
      'fr-FR': /^(qui|que|quoi|quand|où|pourquoi|comment|est-ce que|est-ce qu')\b/i,
      'zh-CN': /^(谁|什么|何时|哪里|为什么|怎么|吗|呢|吧)\b/i
    };

    return questionWords[language].test(sentence.trim());
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

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  const RecordingItem = ({ recording, index }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [name, setName] = useState(recording.name);
    const [isInteracting, setIsInteracting] = useState(false);

    const handleNameChange = async (newName) => {
      if (newName.trim() === recording.name) return;
      await updateRecording(recording.id, { name: newName.trim() });
    };

     const handlePlay = (e) => {
      e.stopPropagation();
      // Your play logic here (if needed)
    };

    const handleMenuToggle = (e) => {
      e.stopPropagation();
      setIsMenuOpen(!isMenuOpen);
    };


    return (
      <Draggable draggableId={recording.id} index={index} disableInteractiveElementBlocking>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className="flex flex-col bg-gray-100 p-3 rounded-lg mb-2"
          >
            <div className="flex items-center">
              <div {...provided.dragHandleProps} className="mr-2 text-gray-500">
                <FaGripVertical />
              </div>
              <div className="flex-grow">
                <input
                  type="text"
                  id={`recording-name-${recording.id}`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => handleNameChange(name)}
                  className="bg-transparent border-b border-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="relative">
                <button onClick={handleMenuToggle} className="text-gray-600 hover:text-gray-800">
                  <FaEllipsisV />
                </button>
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                    <a href={recording.url} download={`${name}.mp4`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center" target="_blank" rel="noopener noreferrer">
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
            <div
              onMouseEnter={() => setIsInteracting(true)}
              onMouseLeave={() => setIsInteracting(false)}
            >
              <audio 
                src={recording.url} 
                controls 
                className="mt-2 w-full"
                onPlay={handlePlay}
              />
            </div>
            {recording.transcription && (
              <div className="mt-2">
                <h4 className="font-semibold">Transcription:</h4>
                <p className="text-sm">{recording.transcription}</p>
              </div>
            )}
          </div>
        )}
      </Draggable>
    );
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(recordings);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setRecordings(items);
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
          <div className="mb-4">
            <label htmlFor="language-select" className="block mb-2">Select Language:</label>
            <select
              id="language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="en-US">English</option>
              <option value="fr-FR">French</option>
              <option value="zh-CN">Chinese (Simplified)</option>
            </select>
          </div>
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
          {isTranscribing && (
            <div className="mb-4 text-center">
              <p>Transcribing...</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                <div className="bg-blue-600 h-2.5 rounded-full w-full animate-pulse"></div>
              </div>
            </div>
          )}
          {transcribedText && (
            <div className="mb-4">
              <h3 className="font-bold mb-2">Current Transcription:</h3>
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

export default withSubscription(VoiceRecorder, 'premium');
