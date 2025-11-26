import React, { useState, useRef, useEffect } from 'react';
import { Plus, Clock, ChevronLeft, ChevronRight, Printer, QrCode, X, Download, Upload, Menu } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import ReactDOM from "react-dom";

// DropdownMenu (portal + click-outside)
const DropdownMenu = ({ open, onClose, position, children }) => {
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (!ref.current || ref.current.contains(e.target)) return;
      onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  if (!open) return null;

  const style = {
    position: "absolute",
    left: position?.left ?? 0,
    top: position?.top ?? 0,
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <div
        ref={ref}
        className="pointer-events-auto bg-white rounded-lg shadow-lg py-2 min-w-[160px]"
        style={style}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

// MenuItem (shared button style)
const MenuItem = ({ icon: Icon, children, danger, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-100
      ${danger ? "text-red-600" : "text-gray-800"}`}
  >
    {Icon && <Icon size={16} />}
    {children}
  </button>
);

const ActivityLog = () => {
  const [currentDay, setCurrentDay] = useState(0);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [activities, setActivities] = useState({});
  const [moods, setMoods] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [showMoodForm, setShowMoodForm] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [viewMode, setViewMode] = useState('day');
  const [showQR, setShowQR] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef(null);
  const dayViewRef = useRef(null);
  const [formData, setFormData] = useState({
    activity: '',
    pleasure: '',
    mastery: '',
    time: '',
    day: 0,
    week: 0,
    color: ''
  });
  const [moodFormData, setMoodFormData] = useState({
    mood: '',
    day: 0,
    week: 0
  });

  const getColorRgba = (color, alpha = 0.2) => {
  const colorMap = {
    white: `rgba(255, 255, 255, ${alpha})`,
    gray: `rgba(128, 128, 128, ${alpha})`,
    yellow: `rgba(255, 255, 0, ${alpha})`,
    orange: `rgba(255, 165, 0, ${alpha})`,
    green: `rgba(0, 128, 0, ${alpha})`,
    blue: `rgba(59, 130, 246, ${alpha})`,
    purple: `rgba(128, 0, 128, ${alpha})`
  };
  return colorMap[color] || '';
};

  const getActivityStatus = (week, day, timeSlot, currentStatus) => {
    // If already completed, don't change
    if (currentStatus === 'completed') return 'completed';
    
    const now = new Date();
    const currentDayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const currentHour = now.getHours();
    const slotIndex = timeSlots.indexOf(timeSlot);
    
    // Future week
    if (week > 0) return 'planned';
    // Past week
    if (week < 0) return currentStatus;
    
    // Current week - check day
    if (day > currentDayOfWeek) return 'planned';
    if (day < currentDayOfWeek) {
      return currentStatus === 'planned' ? 'needs-review' : currentStatus;
    }
    
    // Same day - only planned if slot is strictly in the future
    if (slotIndex > currentHour) return 'planned';
    return currentStatus === 'planned' ? 'needs-review' : currentStatus;
  };

  const [loaded, setLoaded] = useState(false); 

 useEffect(() => {
  const savedActivities = localStorage.getItem('activityLog');
  const savedMoods = localStorage.getItem('activityMoods');

  if (savedActivities) {
    try {
      setActivities(JSON.parse(savedActivities));
    } catch (e) {
      console.error('Failed to parse saved activities:', e);
    }
  }

  if (savedMoods) {
    try {
      setMoods(JSON.parse(savedMoods));
    } catch (e) {
      console.error('Failed to parse saved moods:', e);
    }
  }

  setLoaded(true); // mark that loading is complete
}, []);

  // Save to localStorage whenever activities or moods change
  useEffect(() => {
    if (!loaded) return; // skip saving until initial load is done
    localStorage.setItem('activityLog', JSON.stringify(activities));
  }, [activities, loaded]);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem('activityMoods', JSON.stringify(moods));
  }, [moods, loaded]);

  // Scroll to current time on day view mount/change
  useEffect(() => {
    if (viewMode === 'day' && currentWeek === 0 && dayViewRef.current) {
      const now = new Date();
      const hour = now.getHours();
      let scrollIndex;
      
      if (hour < 12) {
        scrollIndex = Math.max(0, 7 - 0); // 7am
      } else {
        scrollIndex = Math.max(0, 12 - 0); // 12pm
      }
      
      const timeSlotHeight = 60;
      const scrollPosition = scrollIndex * timeSlotHeight;
      
      setTimeout(() => {
        dayViewRef.current?.scrollTo({ top: scrollPosition, behavior: 'smooth' });
      }, 100);
    }
  }, [viewMode, currentWeek, currentDay]);

  // Update activity statuses based on current time
  useEffect(() => {
    if (!loaded) return;
    
    const now = new Date();
    let updated = false;
    const newActivities = { ...activities };
    
    Object.keys(newActivities).forEach(key => {
      const [week, day, time] = key.split('-');
      const activity = newActivities[key];
      const currentStatus = activity.status;
      const newStatus = getActivityStatus(parseInt(week), parseInt(day), time, currentStatus);
      
      if (newStatus !== currentStatus) {
        console.log('Status change detected:', {key, time, currentStatus, newStatus});
        newActivities[key] = { ...activity, status: newStatus };
        updated = true;
      }
    });
    
    if (updated) {
      setActivities(newActivities);
    }
  }, [loaded, currentWeek, currentDay]);

  const days = ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'];
  const timeSlots = [
    '12-1 am', '1-2 am', '2-3 am', '3-4 am', '4-5 am', '5-6 am',
    '6-7 am', '7-8 am', '8-9 am', '9-10 am', '10-11 am', '11 am-12 pm',
    '12-1 pm', '1-2 pm', '2-3 pm', '3-4 pm', '4-5 pm', '5-6 pm',
    '6-7 pm', '7-8 pm', '8-9 pm', '9-10 pm', '10-11 pm', '11 pm-12 am'
  ];

  const getActivityKey = (week, day, time) => `${week}-${day}-${time}`;
  const getMoodKey = (week, day) => `${week}-${day}`;

  const getWeekDates = (weekOffset) => {
    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset + (weekOffset * 7));
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const formatDate = (date) => {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getWeekRange = (weekOffset) => {
    const dates = getWeekDates(weekOffset);
    return `${formatDate(dates[0])} - ${formatDate(dates[6])}`;
  };

  const handleCellClick = (day, time) => {
    const key = getActivityKey(currentWeek, day, time);
    const existing = activities[key];
    
    setFormData({
      activity: existing?.activity || '',
      pleasure: existing?.pleasure || '',
      mastery: existing?.mastery || '',
      time,
      day,
      week: currentWeek,
      color: existing?.color || ''
    });
    setEditingCell(existing ? { day, time } : null);
    setShowForm(true);
  };

  const handleMoodClick = (day) => {
    const key = getMoodKey(currentWeek, day);
    const existing = moods[key];
    
    setMoodFormData({
      mood: existing || '',
      day,
      week: currentWeek
    });
    setShowMoodForm(true);
  };

  const handleQuickAdd = () => {
    const now = new Date();
    const hour = now.getHours();
    let timeIndex = Math.max(0, hour);
    if (timeIndex >= timeSlots.length) timeIndex = timeSlots.length - 1;
    
    setFormData({
      activity: '',
      pleasure: '',
      mastery: '',
      time: timeSlots[timeIndex],
      day: currentDay,
      week: currentWeek
    });
    setEditingCell(null);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!formData.activity) return;
    
    const key = getActivityKey(formData.week, formData.day, formData.time);
    const existing = activities[key];
    
    // If saving a replacement for an incomplete activity
    if (existing?.status === 'incomplete' && !editingCell) {
      setActivities({
        ...activities,
        [key]: {
          ...existing,
          replacement: {
            activity: formData.activity,
            pleasure: formData.pleasure,
            mastery: formData.mastery,
            color: formData.color
          }
        }
      });
      
      setShowForm(false);
      setEditingCell(null);
      setFormData({ activity: '', pleasure: '', mastery: '', time: '', day: 0, week: 0, color: '' });
      return;
    }
    
    let autoStatus;
    if (editingCell) {
      // Keep existing status if editing
      autoStatus = activities[key]?.status || null;
    } else {
      // For new activities, check if it's in the future
      const now = new Date();
      const currentDayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
      const currentHour = now.getHours();
      const slotIndex = timeSlots.indexOf(formData.time);
      
      // Future week
      if (formData.week > 0) {
        autoStatus = 'planned';
      }
      // Current week, future day
      else if (formData.week === 0 && formData.day > currentDayOfWeek) {
        autoStatus = 'planned';
      }
      // Current week, current day, future hour
      else if (formData.week === 0 && formData.day === currentDayOfWeek && slotIndex > currentHour) {
        autoStatus = 'planned';
      }
      // Otherwise, regular activity
      else {
        autoStatus = null;
      }
    }
    
    console.log('Saving with status:', autoStatus);
    
    setActivities({
      ...activities,
      [key]: {
        activity: formData.activity,
        pleasure: formData.pleasure,
        mastery: formData.mastery,
        color: formData.color,
        status: autoStatus
      }
    });
    
    setShowForm(false);
    setEditingCell(null);
    setFormData({ activity: '', pleasure: '', mastery: '', time: '', day: 0, week: 0, color: '' });
  };

  const handleMoodSave = (e) => {
    e.preventDefault();
    if (!moodFormData.mood) return;
    
    const key = getMoodKey(moodFormData.week, moodFormData.day);
    setMoods({
      ...moods,
      [key]: moodFormData.mood
    });
    
    setShowMoodForm(false);
    setMoodFormData({ mood: '', day: 0, week: 0 });
  };

  const handleDelete = () => {
    const key = getActivityKey(formData.week, formData.day, formData.time);
    const newActivities = { ...activities };
    delete newActivities[key];
    setActivities(newActivities);
    setShowForm(false);
    setEditingCell(null);
  };

  const handlePrint = () => {
    setShowMenu(false);
    window.print();
  };

  const handleExport = () => {
    setShowMenu(false);
    alert('Export functionality coming soon!');
  };

  const handleImportClick = () => {
    setShowMenu(false);
    alert('Import functionality coming soon!');
  };

  const handleClearData = () => {
    setActivities({});
    setMoods({});
    localStorage.removeItem('activityLog');
    localStorage.removeItem('activityMoods');
    setShowClearConfirm(false);
    setShowMenu(false);
    setCurrentWeek(0);
    setCurrentDay(0);
  };

  const getTimeSlotActivities = (week, time) => {
    const activities_in_slot = [];
    for (let day = 0; day < 7; day++) {
      const key = getActivityKey(week, day, time);
      if (activities[key]) {
        activities_in_slot.push(activities[key]);
      }
    }
    return activities_in_slot;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 sticky top-0 z-10 shadow-md print:static print:shadow-none">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="bg-blue-500 p-2 rounded-lg hover:bg-blue-400 transition-colors print:hidden"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-xl font-bold">Activity Log</h1>
          </div>
          <div className="flex gap-2 print:hidden">
            {currentWeek !== 0 && (
              <button
                onClick={() => {
                  setCurrentWeek(0);
                  const today = new Date();
                  const dayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
                  setCurrentDay(dayIndex);
                }}
                className="bg-blue-500 px-3 py-2 rounded-lg hover:bg-blue-400 transition-colors text-sm font-semibold"
              >
                Today
              </button>
            )}
            <button
              onClick={() => {
                if (viewMode === 'week') {
                  // switching from week -> day, default to today
                  const today = new Date();
                  const dayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
                  setCurrentDay(dayIndex);
                }
                setViewMode(viewMode === 'day' ? 'week' : 'day');
              }}
              className="bg-blue-500 px-3 py-2 rounded-lg hover:bg-blue-400 transition-colors text-sm font-semibold"
            >
              {viewMode === 'day' ? 'Week View' : 'Day View'}
            </button>
          </div>
        </div>
        
        <DropdownMenu
          open={showMenu}
          onClose={() => setShowMenu(false)}
          position={{ left: 16, top: 64 }} // matches your old menu position
        >
          <MenuItem icon={Upload} onClick={handleExport}>Export</MenuItem>
          <MenuItem icon={Download} onClick={handleImportClick}>Import</MenuItem>
          <MenuItem icon={Printer} onClick={handlePrint}>PDF</MenuItem>

          <MenuItem
            icon={QrCode}
            onClick={() => {
              setShowQR(true);
              setShowMenu(false);
            }}
          >
            Link
          </MenuItem>

          <MenuItem
            icon={X}
            danger
            onClick={() => {
              setShowClearConfirm(true);
              setShowMenu(false);
            }}
          >
            Clear Data
          </MenuItem>
        </DropdownMenu>
        
        {/* Week Navigation with Date Range */}
        <div className="flex items-center justify-between mb-3 print:hidden">
          <button
            onClick={() => setCurrentWeek(currentWeek - 1)}
            className="bg-blue-500 p-2 rounded-lg hover:bg-blue-400 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-semibold">
            {getWeekRange(currentWeek)}
          </span>
          <button
            onClick={() => setCurrentWeek(currentWeek + 1)}
            className="bg-blue-500 p-2 rounded-lg hover:bg-blue-400 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {viewMode === 'day' && (
          <>        
            <div className="flex gap-1 overflow-x-auto pb-2 justify-center">
              {days.map((day, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentDay(idx)}
                  className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors text-sm ${
                    currentDay === idx 
                      ? 'bg-white text-blue-600 font-semibold' 
                      : 'bg-blue-500 hover:bg-blue-400'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
            <div className="mt-2 text-center text-sm">
              {moods[getMoodKey(currentWeek, currentDay)] && (
                <span>Mood: {moods[getMoodKey(currentWeek, currentDay)]}</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Day View */}
      {viewMode === 'day' && (
        <div ref={dayViewRef} className="p-4 overflow-y-auto" style={{ height: 'calc(100vh - 250px)' }}>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {timeSlots.map((time, idx) => {
              const key = getActivityKey(currentWeek, currentDay, time);
              const activity = activities[key];
              
              return (
                <div
                  key={idx}
                  onClick={() => handleCellClick(currentDay, time)}
                  className={`p-3 min-h-[60px] cursor-pointer hover:bg-gray-50 transition-colors ${
                    activity?.status === 'planned' || activity?.status === 'needs-review' || activity?.status === 'completed' ? '' : 'border-b border-gray-200'
                  } ${
                    activity?.status === 'planned' ? 'bg-blue-100 border-4 border-dashed border-blue-600' : ''
                  } ${
                    activity?.status === 'needs-review' ? 'bg-red-100 border-4 border-dashed border-red-600' : ''
                  } ${
                    activity?.status === 'completed' ? 'bg-green-100 border-4 border-dashed border-green-600' : ''
                  }`}
                  style={activity?.color ? { backgroundColor: getColorRgba(activity.color, 0.2) } : {}}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-gray-600 text-sm">{time}</span>
                    {activity && (
                      <span className="text-xs text-gray-500">
                        P:{activity.pleasure} M:{activity.mastery}
                      </span>
                    )}
                  </div>
                    {activity && (
                      <div className={`mt-1 text-sm text-gray-800`}>
                        {activity.status === 'incomplete' && (
                          <div className="line-through text-gray-500">
                            {activity.activity}
                          </div>
                        )}
                        {activity.replacement && (
                          <div className="mt-1">
                            {activity.replacement.activity}
                          </div>
                        )}
                        {activity.status !== 'incomplete' && !activity.replacement && (
                          <div className={activity.status === 'planned' ? 'italic' : ''}>
                            {activity.activity}
                          </div>
                        )}
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="p-4 print:p-0">
          <div className="bg-white rounded-lg shadow-md overflow-x-auto print:shadow-none">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="p-2 text-left sticky left-0 bg-gray-100 min-w-[70px] border-r border-gray-300">Time</th>
                  {days.map((day, idx) => {
                    const date = getWeekDates(currentWeek)[idx];
                    const moodKey = getMoodKey(currentWeek, idx);
                    const mood = moods[moodKey];
                    return (
                      <th key={idx} className="p-2 text-center border-r border-gray-200 last:border-r-0">
                        <div className="font-semibold">{day}</div>
                        <div className="text-[10px] text-gray-600 font-normal">{formatDate(date)}</div>
                        <button
                          onClick={() => handleMoodClick(idx)}
                          className="text-[10px] text-gray-500 font-normal hover:text-blue-600 print:pointer-events-none"
                        >
                          {mood ? `Mood: ${mood}` : 'Tap to add mood'}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((time, timeIdx) => {
                  const hasActivity = getTimeSlotActivities(currentWeek, time).length > 0;
                  if (!hasActivity) return null;
                  
                  return (
                    <tr key={timeIdx} className="border-b border-gray-200">
                      <td className="p-2 font-semibold text-gray-600 sticky left-0 bg-white border-r border-gray-300 align-top">
                        {time}
                      </td>
                      {days.map((_, dayIdx) => {
                        const key = getActivityKey(currentWeek, dayIdx, time);
                        const activity = activities[key];
                        
                        return (
                          <td
                            key={dayIdx}
                            onClick={() => handleCellClick(dayIdx, time)}
                            className={`p-2 cursor-pointer hover:bg-gray-50 transition-colors align-top print:cursor-default ${
                              activity?.status === 'planned' || activity?.status === 'needs-review' || activity?.status === 'completed' ? '' : 'border-r border-gray-200'
                            } last:border-r-0 ${
                              activity?.status === 'planned' ? 'bg-blue-100 border-4 border-dashed border-blue-600' : ''
                            } ${
                              activity?.status === 'needs-review' ? 'bg-red-100 border-4 border-dashed border-red-600' : ''
                            } ${
                              activity?.status === 'completed' ? 'bg-green-100 border-4 border-dashed border-green-600' : ''
                            }`}
                            style={activity?.color ? { backgroundColor: getColorRgba(activity.color, 0.2) } : {}}
                          >
                            {activity && (
                              <div className="w-fit">
                                <div className="text-[10px] text-gray-500 mb-1 whitespace-nowrap">
                                  P:{activity.pleasure} M:{activity.mastery}
                                </div>
                                {activity.status === 'incomplete' && (
                                  <div className="line-through text-gray-500 text-gray-800">
                                    {activity.activity}
                                  </div>
                                )}
                                {activity.replacement && (
                                  <div className="mt-1 text-gray-800">
                                    {activity.replacement.activity}
                                  </div>
                                )}
                                {activity.status !== 'incomplete' && !activity.replacement && (
                                  <div className={`text-gray-800 ${activity.status === 'planned' ? 'italic' : ''}`}>
                                    {activity.activity}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {viewMode === 'day' && currentWeek === 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex gap-2 print:hidden">
          <button
            onClick={handleQuickAdd}
            className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
          >
            <Clock size={20} />
            Now
          </button>
          <button
            onClick={() => handleMoodClick(currentDay)}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
          >
            Daily Mood
          </button>
        </div>
      )}

      {/* Hidden file input - for future use */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        disabled
      />

      {/* Clear Data Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4 text-red-600">Clear All Data?</h2>
            
            <div className="mb-6 space-y-2">
              <p className="text-sm text-gray-700">
                This will permanently delete all activities and moods from all weeks.
              </p>
              <p className="text-sm font-semibold text-red-600">
                This action cannot be undone.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleClearData}
                className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Yes, delete all data
              </button>

              <button
                onClick={() => setShowClearConfirm(false)}
                className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Link</h2>
              <button onClick={() => setShowQR(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            
            <p className="text-sm text-gray-700 mb-4">
              Use the QR code or the link below to access the activity log.
            </p>
            
            <div className="flex justify-center mb-4">
              <QRCodeSVG 
                value="https://avivino-eng.github.io/BAlog/"
                size={200}
                level="H"
              />
            </div>
            
            <p className="text-sm text-center text-gray-700 mb-4 break-all">
              https://avivino-eng.github.io/BAlog/
            </p>

            <button
              onClick={() => {
                navigator.clipboard.writeText('https://avivino-eng.github.io/BAlog/');
                alert('URL copied to clipboard!');
              }}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Copy URL
            </button>
          </div>
        </div>
      )}

      {/* Mood Form Modal */}
      {showMoodForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-t-2xl rounded-t-2xl max-h-[80vh] overflow-y-auto">
            <form onSubmit={handleMoodSave} className="p-6">
              <h2 className="text-xl font-bold mb-4">Daily Mood</h2>
              
              <div className="mb-4 text-sm text-gray-600">
                {days[moodFormData.day]} - {formatDate(getWeekDates(moodFormData.week)[moodFormData.day])}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Mood (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={moodFormData.mood}
                  onChange={(e) => setMoodFormData({ ...moodFormData, mood: e.target.value })}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleMoodSave(e);
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg p-3"
                  placeholder="1-10"
                  autoFocus
                  inputMode="numeric"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowMoodForm(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activity Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex items-end sm:items-center justify-center">
            <div className="bg-white w-full sm:max-w-lg sm:rounded-t-2xl rounded-t-2xl max-h-[80vh] overflow-y-auto">
              {/* Check if this is a needs-review activity */}
              {editingCell && activities[getActivityKey(formData.week, formData.day, formData.time)]?.status === 'needs-review' ? (
                // REVIEW PROMPT
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-4">Planned Activity</h2>
                  
                  <div className="mb-4 text-sm text-gray-600">
                    {days[formData.day]} at {formData.time}
                  </div>

                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">You planned:</p>
                    <p className="font-semibold">{formData.activity}</p>
                  </div>

                  <p className="text-center mb-6 font-medium">Did you complete this activity?</p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const key = getActivityKey(formData.week, formData.day, formData.time);
                        setActivities({
                          ...activities,
                          [key]: { 
                            ...activities[key], 
                            status: 'completed' 
                          }
                        });
                        setShowForm(false);
                        setEditingCell(null);
                      }}
                      className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => {
                        const key = getActivityKey(formData.week, formData.day, formData.time);
                        setActivities({
                          ...activities,
                          [key]: { 
                            ...activities[key], 
                            status: 'incomplete'
                          }
                        });
                        // Clear form for replacement entry but keep it open
                        setFormData({
                          ...formData,
                          activity: '',
                          pleasure: '',
                          mastery: '',
                          color: ''
                        });
                        setEditingCell(null); // Clear editing state so it saves as replacement
                      }}
                      className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                    >
                      No
                    </button>
                  </div>
                </div>
              ) : (
                // NORMAL FORM
                <form
                  className="p-6"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSave();
                  }}
                >
                  <h2 className="text-xl font-bold mb-4">
                    {editingCell ? 'Edit Activity' : 'Add Activity'}
                  </h2>
                  
                  <div className="mb-4 text-sm text-gray-600">
                    {days[formData.day]} at {formData.time}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Activity</label>
                    <input
                      type="text"
                      value={formData.activity}
                      onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-3"
                      placeholder="What did you do?"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Color</label>
                    <div className="flex gap-2">
                      {['white', 'gray', 'yellow', 'orange', 'green', 'blue', 'purple'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          className={`w-10 h-10 rounded-lg border-2 transition-all ${
                            formData.color === color ? 'border-blue-600 scale-110' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Pleasure (1-10)</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.pleasure}
                        onChange={(e) => setFormData({ ...formData, pleasure: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg p-3"
                        inputMode="numeric"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Mastery (1-10)</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.mastery}
                        onChange={(e) => setFormData({ ...formData, mastery: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg p-3"
                        inputMode="numeric"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    {editingCell && activities[getActivityKey(formData.week, formData.day, formData.time)] && (
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

      <style>{`
        @media print {
          body { margin: 0; }
          .print\\:hidden { display: none !important; }
          .print\\:static { position: static !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:cursor-default { cursor: default !important; }
          .print\\:pointer-events-none { pointer-events: none !important; }
        }
      `}</style>
    </div>
  );
};

export default ActivityLog;