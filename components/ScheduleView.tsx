import React, { useState } from 'react';
import { Student } from '../types';

interface ScheduleViewProps {
  students: Student[];
}

const timeToMinutes = (time: string): number => {
    if (!time || !time.includes(':')) return 0;
    // Manually parse the time string to avoid timezone interpretation issues
    // that occur with `new Date()`. This ensures "12:00" is always treated as
    // 12 hours, regardless of the user's local timezone.
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

// Helper function to get the start of the week (Sunday) for a given date
const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0); // Normalize time
    const day = d.getDay(); // Sunday - 0, Monday - 1, ...
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
};

const ScheduleView: React.FC<ScheduleViewProps> = ({ students }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

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
      studentId: student.id,
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
    // Sort students by name to ensure consistent color assignment
    const sortedStudents = [...students].sort((a, b) => a.name.localeCompare(b.name));
    let colorIndex = 0;
    sortedStudents.forEach(student => {
      if (!map.has(student.id)) {
        map.set(student.id, colors[colorIndex % colors.length]);
        colorIndex++;
      }
    });
    return map;
  }, [students]);

  const handlePrevWeek = () => {
    setCurrentDate(prev => new Date(prev.setDate(prev.getDate() - 7)));
  };

  const handleNextWeek = () => {
    setCurrentDate(prev => new Date(prev.setDate(prev.getDate() + 7)));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const formatDateRange = (start: Date, end: Date): string => {
    const startDay = start.getDate();
    const endDay = end.getDate();
    const startMonth = start.toLocaleString('pt-BR', { month: 'long' });
    const endMonth = end.toLocaleString('pt-BR', { month: 'long' });
    const year = start.getFullYear();

    if (startMonth !== endMonth) {
      return `${startDay} de ${startMonth} - ${endDay} de ${endMonth} de ${year}`;
    }
    return `${startDay} - ${endDay} de ${startMonth} de ${year}`;
  };

  const weekStart = getWeekStart(currentDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const displayRange = formatDateRange(weekStart, weekEnd);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Agenda da Semana</h2>
        <div className="flex items-center gap-4">
            <span className="font-semibold text-brand-dark">{displayRange}</span>
            <div className="flex items-center gap-2">
                <button onClick={handlePrevWeek} className="p-2 rounded-full hover:bg-gray-100">&lt;</button>
                <button onClick={handleToday} className="px-3 py-1 text-sm font-medium rounded-md border hover:bg-gray-50">Hoje</button>
                <button onClick={handleNextWeek} className="p-2 rounded-full hover:bg-gray-100">&gt;</button>
            </div>
        </div>
      </div>
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
        <div className="col-start-2 col-end-9 row-start-1 row-end-[-1] grid grid-cols-7">
          {appointments.map((appt, index) => {
            const dayIndex = days.findIndex(d => d.key === appt.day);
            if (dayIndex === -1) return null;

            const startMinutes = timeToMinutes(appt.startTime);
            const endMinutes = timeToMinutes(appt.endTime);
            const durationMinutes = endMinutes - startMinutes;

            // CORRECTED: The grid row for a half-hour is 3rem (h-12), so an hour is 6rem.
            // The multiplier must be 6 to scale correctly.
            const remsPerHour = 6;
            const topOffset = ((startMinutes - (6 * 60)) / 60) * remsPerHour;
            const height = (durationMinutes / 60) * remsPerHour;
            
            const color = studentColors.get(appt.studentId) || 'bg-gray-200 border-gray-400 text-gray-800';

            return (
              <div
                key={index}
                className="absolute w-full p-1"
                style={{
                  left: `${(100/7) * dayIndex}%`,
                  width: `${100/7}%`,
                  top: `${topOffset}rem`,
                  height: `${height}rem`,
                }}
              >
                <div className={`h-full w-full ${color} p-1 rounded-lg shadow-sm text-xs overflow-hidden`}>
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
