import React, { useState, useEffect, useRef } from 'react';
import { FaPlay, FaPause, FaStop, FaPlus, FaTrash } from 'react-icons/fa';

const Clock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [alarms, setAlarms] = useState([]);
  const [newAlarm, setNewAlarm] = useState({ time: '', label: '', sound: 'Alarm.wav' });
  const [activeAlarms, setActiveAlarms] = useState([]);
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const [timerTime, setTimerTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerInput, setTimerInput] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [timerPresets] = useState([60, 300, 600, 1800, 3600]); // 1min, 5min, 10min, 30min, 1hour
  const [activeTab, setActiveTab] = useState('clock');
  const [alarmSound] = useState(new Audio('./sound/Alarm.wav')); // Add your alarm sound file
  const [timerSound] = useState(new Audio('./sound/Beep.wav')); // Add your timer sound file
  const alarmIntervalRef = useRef(null);

  const alarmSounds = [
    { name: 'Alarm', file: 'Alarm.wav' },
    { name: 'Beep', file: 'Beep.wav' },
    { name: 'Rooster', file: 'Rooster.wav' },
    { name: 'Morning', file: 'Morning.wav' },
    { name: 'Retro', file: 'Retro.wav' },
  ];


  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkAlarms = setInterval(() => {
      const now = new Date();
      alarms.forEach(alarm => {
        const [hours, minutes] = alarm.time.split(':');
        if (parseInt(hours) === now.getHours() && parseInt(minutes) === now.getMinutes() && !activeAlarms.includes(alarm.id)) {
          setActiveAlarms(prev => [...prev, alarm.id]);
          playAlarmSound(alarm.tone);
        }
      });
    }, 1000);
    return () => clearInterval(checkAlarms);
  }, [alarms, activeAlarms]);

  useEffect(() => {
    let interval;
    if (isStopwatchRunning) {
      interval = setInterval(() => {
        setStopwatchTime(prev => prev + 10);
      }, 10);
    }
    return () => clearInterval(interval);
  }, [isStopwatchRunning]);

  useEffect(() => {
    let interval;
    if (isTimerRunning && timerTime > 0) {
      interval = setInterval(() => {
        setTimerTime(prev => prev - 1);
      }, 1000);
    } else if (timerTime === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      playTimerSound();
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerTime]);

  useEffect(() => {
    alarmSound.addEventListener('ended', () => {
      alarmSound.currentTime = 0;
      alarmSound.play();
    });

    return () => {
      alarmSound.removeEventListener('ended', () => {
        alarmSound.currentTime = 0;
        alarmSound.play();
      });
    };
  }, [alarmSound]);

 useEffect(() => {
    const loadAudio = async (file) => {
      try {
        const response = await fetch(`${process.env.PUBLIC_URL}/sound/${file}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        const audio = new Audio(URL.createObjectURL(blob));
        return audio;
      } catch (error) {
        console.error(`Failed to load audio file ${file}:`, error);
        return null;
      }
    };

   const loadAllSounds = async () => {
      const loadedSounds = await Promise.all(alarmSounds.map(sound => loadAudio(sound.file)));
      setAlarmSounds(prevSounds => 
        prevSounds.map((sound, index) => ({
          ...sound,
          audio: loadedSounds[index]
        }))
      );
    };

    loadAllSounds();
  }, []);

 const addAlarm = () => {
    if (newAlarm.time) {
      setAlarms([...alarms, { ...newAlarm, id: Date.now() }]);
      setNewAlarm({ time: '', label: '', sound: 'Alarm.wav' });
    }
  };

  const deleteAlarm = (id) => {
    setAlarms(alarms.filter(alarm => alarm.id !== id));
    setActiveAlarms(activeAlarms.filter(alarmId => alarmId !== id));
    stopAlarmSound();
  };

  const snoozeAlarm = (id) => {
    setActiveAlarms(activeAlarms.filter(alarmId => alarmId !== id));
    const alarm = alarms.find(a => a.id === id);
    const snoozeTime = new Date();
    snoozeTime.setMinutes(snoozeTime.getMinutes() + 5);
    const updatedAlarm = {
      ...alarm,
      time: `${snoozeTime.getHours().toString().padStart(2, '0')}:${snoozeTime.getMinutes().toString().padStart(2, '0')}`
    };
    setAlarms(alarms.map(a => a.id === id ? updatedAlarm : a));
    stopAlarmSound();
  };

  const dismissAlarm = (id) => {
    setActiveAlarms(activeAlarms.filter(alarmId => alarmId !== id));
    stopAlarmSound();
  };

  const startStopwatch = () => setIsStopwatchRunning(true);
  const pauseStopwatch = () => setIsStopwatchRunning(false);
  const resetStopwatch = () => {
    setIsStopwatchRunning(false);
    setStopwatchTime(0);
  };

  const startTimer = () => {
    if (timerTime > 0) {
      setIsTimerRunning(true);
    }
  };
  const pauseTimer = () => setIsTimerRunning(false);
  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerTime(0);
    setTimerInput({ hours: 0, minutes: 0, seconds: 0 });
  };
  const setTimerPreset = (time) => {
    setTimerTime(time);
    setTimerInput({
      hours: Math.floor(time / 3600),
      minutes: Math.floor((time % 3600) / 60),
      seconds: time % 60
    });
  };

  const handleTimerInputChange = (e) => {
    const { name, value } = e.target;
    setTimerInput({ ...timerInput, [name]: parseInt(value) || 0 });
  };

  const setCustomTimer = () => {
    const totalSeconds = timerInput.hours * 3600 + timerInput.minutes * 60 + timerInput.seconds;
    setTimerTime(totalSeconds);
  };

 const playAlarmSound = (soundFile) => {
    const sound = alarmSounds.find(s => s.file === soundFile);
    if (sound && sound.audio) {
      sound.audio.play().catch(error => {
        console.error('Failed to play alarm sound:', error);
        // Fallback to browser's built-in alert sound
        try {
          new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+ltryxnMpBSl+zPLaizsIGGS57OihUBELTKXh8bllHgU2jdXzzn0vBSF1xe/glEILElyx6OyrWBUIQ5zd8sFuJAUuhM/z1YU2Bhxqvu7mnEoODlOq5O+zYBoGPJPY88p2KwUme8rx3I4+CRZiturqpVITC0mi4PK8aB8GM4nU8tGAMQYeb8Lv45ZFDBFYr+ftrVoXCECY3PLEcSYELIHO8diJOQcZaLvt559NEAxPqOPwtmMcBjiP1/PMeS0GI3fH8N2RQAoUXrTp66hVFApGnt/yvmwhBTCG0fPTgjQGHW/A7eSaRw0PVqzl77BeGQc9ltvyxnUoBSh+zPDaizsIGGS56+mjTxELTKXh8bllHgU1jdT0z3wvBSJ0xe/glEILElyx6OyrWBUIRJve8sFuJAUug8/z1oU2Bhxqvu3mnEoPDlOq5O+zYRsGPJLZ88p3KgUme8rx3I4+CRVht+rqpVMSC0mh4fK8aiAFM4nU8tGAMQYfbsLv45ZFDBFYr+ftrVwWCECY3PLEcSYGK4DN8tiIOQcZZ7zs56BODwxPpuPxtmQcBjiP1/PMeywGI3fH8N+RQAoUXrTp66hWEwlGnt/yv2wiBDCG0fPTgzQGHm7A7eSaSQ0PVqvm77BeGAc+ltvyxnUoBSh+y/HajDsIF2W56+mjUREKTKPi8blnHgU1jdTy0HwvBSF0xPDglEQKElux6eyrWRQIRJzd8sFwJAQug8/y1oY2Bhxqvu3mnEwODVKp5e+zYRsGOpPX88p3KgUmecnx3Y4/CBVhtuvqpVMSC0mh4PG9aiAFM4nS89GAMQYfbsLu5JZGCxFYrufur1sXCECY3PLEcycFKoDN8tiKOQcZZ7rs56BODwxPpuPxtmQdBTiP1/PMey4FI3bH8d+RQQkUXbPq66hWEwlGnt/yv2wiBDCG0PPTgzUFHm3A7eSaSQ0PVKzm77FfGQc+ltnzxnUoBSh9y/HajDwIF2S46+mjUREKTKPi8blnHwU1jdTy0H4wBiF0xPDglEQKElux5+2sWRUIQ5vd8sNwJAUtg87y1oY3Bxtpve3mnEwODVKp5e+zYhsGOpHY88p3LAUlecnx3Y8/CBZhtuvqpVMSC0mh4PG9aiAFM4nS89GBMgUfbcLu5JZGDBBYrufur1sXCECX2/PEcycFKoDN8tiKOQcZZ7vs56BOEQxPpuLxt2QdBTeP1vTNei4FI3bH79+RQQsUXbTo7KlXEglGnt/yv2wiBDCF0fLUgzUFHm3A7eSaSg0PVKzm77FfGQc+ltnzxnYpBSd9y/HajDwJFmS46+mjUhEKS6Pi8bpoHwU1jdTy0H4wBiFzxfDglUMKElux5+2sWhUIQ5vd8sNxJQUsgs/y1oY3Bxpqve3mnU0ODFKp5e+zYhsGOpHY88p5KwUlecnw3Y8/CBZhterqpVQSCkig4PG9ayEEMojT89GBMgUfbcLu5JdHDBBXrefur1wWCECX2/PGcicFKn/M8tiKOgcZZrvs56FPEAxOpePxt2UcBjeP1vTNei4FI3bH79+RQgsTXbTo7KlXFAlFnd7zv20jBi+F0fLUhDYEH2zA7eSaSg0PVKzm77FfGQc+ltnzxnYpBSd9y/HajTwJFmS46+mjUhEKS6Li8bpoHwU1jNTy0H4wBiFzxe/hlUUJElux5+2sWhUIQ5vd8sNxJQUsgs7z14Y3Bxpqve3mnU0ODFKo5u+zYxsFOpHY88p5KwUleMjw3Y9ACBVgterqpVQSCkig4PG9ayEEMojT89GBMgUfbcHv5JdHDBBXrefur1wXB0CX2/PGcicFKn/M8tiLOgcZZrrs56FPEAxOpd</sound.audio.src>')).play();
        } catch (fallbackError) {
          console.error('Failed to play fallback sound:', fallbackError);
        }
      });
    } else {
      console.error('Sound not found or not loaded:', soundFile);
    }
  };


 const stopAlarmSound = () => {
    if (alarmSound) {
      alarmSound.pause();
      alarmSound.currentTime = 0;
    }
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
  };

const playTimerSound = () => {
    if (timerSound) {
      timerSound.play().catch(error => console.error('Failed to play timer sound:', error));
    }
  };

  const formatTime = (time) => {
    const hours = Math.floor(time / 3600000);
    const minutes = Math.floor((time % 3600000) / 60000);
    const seconds = Math.floor((time % 60000) / 1000);
    const milliseconds = Math.floor((time % 1000) / 10);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  const formatTime12Hour = (time) => {
    const [hours, minutes] = time.split(':');
    const parsedHours = parseInt(hours, 10);
    const ampm = parsedHours >= 12 ? 'PM' : 'AM';
    const formattedHours = parsedHours % 12 || 12;
    return `${formattedHours}:${minutes} ${ampm}`;
  };

  return (
    <div className="p-4 max-w-4xl mx-auto text-gray-800 dark:text-gray-400">
      <div className="mb-4 flex justify-center space-x-4">
        <button onClick={() => setActiveTab('clock')} className={`px-4 py-2 rounded ${activeTab === 'clock' ? 'bg-customorange-500 text-white' : ''}`}>Clock</button>
        <button onClick={() => setActiveTab('alarm')} className={`px-4 py-2 rounded ${activeTab === 'alarm' ? 'bg-customorange-500 text-white' : ''}`}>Alarm</button>
        <button onClick={() => setActiveTab('stopwatch')} className={`px-4 py-2 rounded ${activeTab === 'stopwatch' ? 'bg-customorange-500 text-white' : ''}`}>Stopwatch</button>
        <button onClick={() => setActiveTab('timer')} className={`px-4 py-2 rounded ${activeTab === 'timer' ? 'bg-customorange-500 text-white' : ''}`}>Timer</button>
      </div>

      {activeTab === 'clock' && (
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-4">{currentTime.toLocaleTimeString()}</h2>
          <p>{currentTime.toLocaleDateString()}</p>
        </div>
      )}

      {activeTab === 'alarm' && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Alarms</h2>
          <div className="mb-4 flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
            <input
              type="time"
              value={newAlarm.time}
              onChange={(e) => setNewAlarm({...newAlarm, time: e.target.value})}
              className="p-2 border rounded text-gray-800 w-full md:w-auto"
            />
            <input
              type="text"
              placeholder="Alarm label"
              value={newAlarm.label}
              onChange={(e) => setNewAlarm({...newAlarm, label: e.target.value})}
              className="p-2 border rounded w-full md:w-auto"
            />
            <select
              value={newAlarm.sound}
              onChange={(e) => setNewAlarm({...newAlarm, sound: e.target.value})}
              className="p-2 border rounded text-gray-800 w-full md:w-auto"
            >
              {alarmSounds.map((sound) => (
                <option key={sound.file} value={sound.file}>{sound.name}</option>
              ))}
            </select>
            <button onClick={addAlarm} className="bg-customorange-500 text-white px-4 py-2 rounded w-full md:w-auto">
              <FaPlus className="inline-block mr-2" /> Add Alarm
            </button>
          </div>
          <ul className="space-y-2">
            {alarms.map(alarm => (
              <li key={alarm.id} className="flex flex-col md:flex-row items-center justify-between p-2 bg-gray-100 rounded">
                <span className="mb-2 md:mb-0">{alarm.time} - {alarm.label} ({alarm.sound})</span>
                <div className="space-x-2">
                  <button onClick={() => deleteAlarm(alarm.id)} className="text-red-500"><FaTrash /></button>
                  {activeAlarms.includes(alarm.id) && (
                    <>
                      <button onClick={() => snoozeAlarm(alarm.id)} className="bg-yellow-500 text-white px-2 py-1 rounded">Snooze</button>
                      <button onClick={() => dismissAlarm(alarm.id)} className="bg-red-500 text-white px-2 py-1 rounded">Dismiss</button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === 'stopwatch' && (
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-4">{formatTime(stopwatchTime)}</h2>
          <div className="space-x-2">
            {!isStopwatchRunning ? (
              <button onClick={startStopwatch} className="bg-green-500 text-white px-4 py-2 rounded"><FaPlay /></button>
            ) : (
              <button onClick={pauseStopwatch} className="bg-yellow-500 text-white px-4 py-2 rounded"><FaPause /></button>
            )}
            <button onClick={resetStopwatch} className="bg-red-500 text-white px-4 py-2 rounded"><FaStop /></button>
          </div>
        </div>
      )}

      {activeTab === 'timer' && (
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-4">{formatTime(timerTime * 1000)}</h2>
          <div className="mb-4">
            <input
              type="number"
              name="hours"
              value={timerInput.hours}
              onChange={handleTimerInputChange}
              min="0"
              max="23"
              className="w-16 p-2 border rounded mr-2 text-gray-800"
              placeholder="HH"
            />
            <input
              type="number"
              name="minutes"
              value={timerInput.minutes}
              onChange={handleTimerInputChange}
              min="0"
              max="59"
              className="w-16 p-2 border rounded mr-2 text-gray-800"
              placeholder="MM"
            />
            <input
              type="number"
              name="seconds"
              value={timerInput.seconds}
              onChange={handleTimerInputChange}
              min="0"
              max="59"
              className="w-16 p-2 border rounded mr-2 text-gray-800"
              placeholder="SS"
            />
            <button onClick={setCustomTimer} className="bg-customorange-500 text-white px-4 py-2 rounded">Set Timer</button>
          </div>
          <div className="space-x-2 mb-4">
            {!isTimerRunning ? (
              <button onClick={startTimer} className="bg-green-500 text-white px-4 py-2 rounded"><FaPlay /></button>
            ) : (
              <button onClick={pauseTimer} className="bg-yellow-500 text-white px-4 py-2 rounded"><FaPause /></button>
            )}
            <button onClick={resetTimer} className="bg-red-500 text-white px-4 py-2 rounded"><FaStop /></button>
          </div>
          <div className="space-x-2">
            {timerPresets.map(preset => (
              <button key={preset} onClick={() => setTimerPreset(preset)} className="px-2 py-1 rounded">
                {preset >= 3600 ? `${preset / 3600}h` : `${preset / 60}m`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Clock;
