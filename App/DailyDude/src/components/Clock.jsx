import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [timerPresets] = useState([60, 300, 600, 1800, 3600]);
  const [activeTab, setActiveTab] = useState('clock');

  const alarmSoundsRef = useRef({});
  const timerSoundRef = useRef(null);

  useEffect(() => {
    // Initialize audio objects
    alarmSoundsRef.current = {
      'Alarm.wav': new Audio('./sound/Alarm.wav'),
      'Rooster.wav': new Audio('./sound/Rooster.wav'),
      'Beep.wav': new Audio('./sound/Beep.wav'),
      'Retro.wav': new Audio('./sound/Retro.wav'),
      'Morning.wav': new Audio('./sound/Morning.wav')
    };
    timerSoundRef.current = new Audio('./sound/Beep.wav');

    // Cleanup function
    return () => {
      Object.values(alarmSoundsRef.current).forEach(audio => audio.pause());
      timerSoundRef.current.pause();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const checkAlarms = useCallback(() => {
    const now = new Date();
    alarms.forEach(alarm => {
      const [hours, minutes] = alarm.time.split(':');
      if (parseInt(hours) === now.getHours() && parseInt(minutes) === now.getMinutes() && !activeAlarms.includes(alarm.id)) {
        setActiveAlarms(prev => [...prev, alarm.id]);
        playAlarmSound(alarm.sound);
      }
    });
  }, [alarms, activeAlarms]);

  useEffect(() => {
    const interval = setInterval(checkAlarms, 1000);
    return () => clearInterval(interval);
  }, [checkAlarms]);

  useEffect(() => {
    let interval;
    if (isStopwatchRunning) {
      interval = setInterval(() => setStopwatchTime(prev => prev + 10), 10);
    }
    return () => clearInterval(interval);
  }, [isStopwatchRunning]);

  useEffect(() => {
    let interval;
    if (isTimerRunning && timerTime > 0) {
      interval = setInterval(() => setTimerTime(prev => prev - 1), 1000);
    } else if (timerTime === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      playTimerSound();
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerTime]);

  const playAlarmSound = (soundFile) => {
    stopAlarmSound();
    const sound = alarmSoundsRef.current[soundFile];
    if (sound) {
      sound.loop = true;
      sound.play().catch(error => console.error('Failed to play alarm sound:', error));
    }
  };

  const stopAlarmSound = () => {
    Object.values(alarmSoundsRef.current).forEach(sound => {
      sound.pause();
      sound.currentTime = 0;
    });
  };

  const playTimerSound = () => {
    timerSoundRef.current.play().catch(error => console.error('Failed to play timer sound:', error));
  };

  const stopTimerSound = () => {
    timerSoundRef.current.pause();
    timerSoundRef.current.currentTime = 0;
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
          <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              type="time"
              value={newAlarm.time}
              onChange={(e) => setNewAlarm({...newAlarm, time: e.target.value})}
              className="p-2 border rounded text-gray-800 w-full"
            />
            <input
              type="text"
              placeholder="Alarm label"
              value={newAlarm.label}
              onChange={(e) => setNewAlarm({...newAlarm, label: e.target.value})}
              className="p-2 border rounded w-full"
            />
            <select
      value={newAlarm.sound}
      onChange={(e) => setNewAlarm({...newAlarm, sound: e.target.value})}
      className="p-2 border rounded text-gray-800 w-full"
    >
      <option value="Alarm.wav">Default Tone</option>
      <option value="Rooster.wav">Rooster</option>
      <option value="Beep.wav">Beep</option>
      <option value="Retro.wav">Retro</option>
      <option value="Morning.wav">Morning</option>
    </select>
            <button onClick={addAlarm} className="bg-customorange-500 text-white px-4 py-2 rounded w-full flex items-center justify-center">
              <FaPlus className="mr-2" /> Add
            </button>
          </div>
          <ul className="space-y-2">
            {alarms.map(alarm => (
              <li key={alarm.id} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                <span>{formatTime12Hour(alarm.time)} - {alarm.label} ({alarm.sound})</span>
                <div className="space-x-2">
                  <button onClick={() => deleteAlarm(alarm.id)} className="text-red-500"><FaTrash /></button>
                  {activeAlarms.includes(alarm.id) && (
                    <>
                      <button onClick={() => snoozeAlarm(alarm.id)} className="bg-yellow-500 text-white px-2 py-1 rounded">Snooze</button>
                      <button onClick={() => stopAlarm(alarm.id)} className="bg-red-500 text-white px-2 py-1 rounded">Stop</button>
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
