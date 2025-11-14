import React from 'react';
import { Student } from '../types';

interface ScheduleViewProps {
  students: Student[];
}

const timeToMinutes = (time: string): number => {
    if (!time || !time.includes(':')) return 0;
    // By creating a date object from a time string like "HH:mm", the browser
    // correctly interprets it in the user's local timezone. This prevents
    // issues where the time might be misinterpreted as UTC, causing shifts
    // in the schedule display.
    const date = new Date(`1970-01-01T${time}`);
    return date.getHours() * 60 + date.getMinutes();
};


const ScheduleView: React.FC<ScheduleViewProps> = ({ students }) => {
  const days = [
    { key: 'sunday', name: 'Domingo' },
    { key: 'monday', name: 'Segunda' },
    { key: 'tuesday', name: 'Terça' },
    { key: 'wednesday', name: 'Quarta' },
    { key: 'thursday', name: 'Quinta' },
    { key: 'friday', name: 'Sexta' },
    { key: 'saturday', name: 'Sábado' },
  ];

  const timeSlots = Array.from({ length: (22 - 6) * 2 }, (_, i) => {
    const hours = 6 + Math.floor(i / 2);
    const minutes = (i % 2) * 30;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  });

  const appointments = students.flatMap(student => 
    (student.schedule || []).map(item => ({
      studentName: student.name,
      ...item
    }))
  ).filter(item => item.startTime && item.endTime);
  
  const studentColors = React.useMemo(() => {
    const colors = [
      'bg-blue-200 border-blue-400 text-blue-800',
      'bg-green-200 border-green-400 text-green-800',
      'bg-yellow-200 border-yellow-400 text-yellow-800',
      'bg-purple-200 border-purple-400 text-purple-800',
      'bg-pink-200 border-pink-400 text-pink-800',
      'bg-indigo-200 border-indigo-400 text-indigo-800',
      'bg-red-200 border-red-400 text-red-800',
      'bg-teal-200 border-teal-400 text-teal-800',
    ];
    const map = new Map<string, string>();
    let colorIndex = 0;
    students.forEach(student => {
      if (!map.has(student.id)) {
        map.set(student.id, colors[colorIndex % colors.length]);
        colorIndex++;
      }
    });
    return map;
  }, [students]);


  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
       <h2 className="text-xl font-bold mb-4">Agenda da Semana</h2>
      <div className="grid grid-cols-[auto,1fr,1fr,1fr,1fr,1fr,1fr,1fr] gap-x-2 text-sm text-center font-semibold text-gray-600">
        <div className="sticky top-0 bg-white z-10"></div> {/* Empty corner */}
        {days.map(day => (
          <div key={day.key} className="sticky top-0 bg-white z-10 py-2 border-b-2">{day.name}</div>
        ))}
      </div>
      <div className="relative grid grid-cols-[auto,1fr,1fr,1fr,1fr,1fr,1fr,1fr] gap-x-2 -mt-px">
        {/* Time slots */}
        <div className="col-start-1 col-end-2 row-start-1 row-end-[-1]">
          {timeSlots.map(time => (
            <div key={time} className="h-12 flex items-center justify-end pr-2 text-xs text-gray-500 border-t border-gray-100">
              {time.endsWith(':00') && time}
            </div>
          ))}
        </div>

        {/* Vertical lines for days */}
        {days.map((day, index) => (
          <div key={day.key} className={`col-start-${index + 2} col-end-${index + 3} row-start-1 row-end-[-1] border-r border-gray-100`}>
             {timeSlots.map((_, slotIndex) => (
                <div key={slotIndex} className="h-12 border-t border-gray-100"></div>
            ))}
          </div>
        ))}
        
        {/* Appointments */}
        <div className="col-start-2 col-end-9 row-start-1 row-end-[-1] grid grid-cols-7 grid-rows-[repeat(32,3rem)]">
          {appointments.map((appt, index) => {
            const dayIndex = days.findIndex(d => d.key === appt.day);
            if (dayIndex === -1) return null;

            const startMinutes = timeToMinutes(appt.startTime);
            const endMinutes = timeToMinutes(appt.endTime);
            const durationMinutes = endMinutes - startMinutes;
            const topOffset = ((startMinutes - (6 * 60)) / 60) * 3; // 3rem per hour
            const height = (durationMinutes / 60) * 3; // 3rem per hour
            
            const color = studentColors.get(students.find(s => s.name === appt.studentName)?.id || '') || 'bg-gray-200 border-gray-400';

            return (
              <div
                key={index}
                className="absolute w-full p-2 overflow-hidden rounded-lg border text-xs"
                style={{
                  left: `${(100/7) * dayIndex}%`,
                  width: `${100/7}%`,
                  top: `${topOffset}rem`,
                  height: `${height}rem`,
                }}
              >
                <div className={`h-full w-full ${color} p-1 rounded`}>
                   <p className="font-bold truncate">{appt.studentName}</p>
                   <p className="truncate">{appt.startTime} - {appt.endTime}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ScheduleView;