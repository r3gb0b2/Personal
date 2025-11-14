import React, { useState, useMemo } from 'react';
import { Student, Plan } from '../types';

interface ScheduleViewProps {
  students: Student[];
  plans: Plan[];
  onStudentClick: (studentId: string) => void;
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

const ScheduleView: React.FC<ScheduleViewProps> = ({ students, plans, onStudentClick }) => {
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

  const appointmentsByDay = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    days.forEach(d => grouped[d.key] = []);
    const weekStart = getWeekStart(currentDate);

    students.forEach(student => {
        const plan = plans.find(p => p.id === student.planId);
        if (!plan) return; // Skip students without a plan

        (student.schedule || []).forEach(item => {
            if (!item.day || !item.startTime || !item.endTime || !grouped[item.day]) {
                return;
            }

            const dayIndex = days.findIndex(d => d.key === item.day);
            if (dayIndex === -1) return;
            
            // Determine the actual date of this specific appointment in the current week view
            const appointmentDate = new Date(weekStart);
            appointmentDate.setDate(weekStart.getDate() + dayIndex);
            appointmentDate.setHours(23, 59, 59, 999); // Set to end of day for comparison

            let isValidAppointment = false;

            if (plan.type === 'duration') {
                if (student.paymentDueDate) {
                    const dueDate = new Date(student.paymentDueDate);
                    // The appointment is valid if it occurs on or before the due date
                    if (appointmentDate <= dueDate) {
                        isValidAppointment = true;
                    }
                } else {
                    // If no due date, consider it valid (e.g., first month of a new student)
                    isValidAppointment = true;
                }
            } else if (plan.type === 'session') {
                // For session-based plans, they are active as long as they have sessions left.
                // The appointment will show for the entire week if they are considered "active".
                if (student.remainingSessions != null && student.remainingSessions > 0) {
                    isValidAppointment = true;
                }
            }

            if (isValidAppointment) {
                grouped[item.day].push({
                    studentId: student.id,
                    studentName: student.name,
                    ...item
                });
            }
        });
    });
    return grouped;
  }, [students, plans, currentDate]);
  
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

        {/* Day columns with appointments */}
        {days.map((day, dayIndex) => (
            <div key={day.key} className={`relative col-start-${dayIndex + 2} col-end-${dayIndex + 3} row-start-1 row-end-[-1] border-r border-gray-100`}>
                {/* Background grid cells */}
                {timeSlots.map((_, slotIndex) => (
                    <div key={slotIndex} className="h-12 border-t border-gray-100"></div>
                ))}
                
                {/* Render appointments for this day */}
                {appointmentsByDay[day.key].map((appt, index) => {
                    const startMinutes = timeToMinutes(appt.startTime);
                    const endMinutes = timeToMinutes(appt.endTime);
                    const durationMinutes = endMinutes - startMinutes;

                    if (durationMinutes <= 0) return null;

                    const remsPerHour = 6;
                    const topOffset = ((startMinutes - (6 * 60)) / 60) * remsPerHour;
                    const height = (durationMinutes / 60) * remsPerHour;
                    
                    const color = studentColors.get(appt.studentId) || 'bg-gray-200 border-gray-400 text-gray-800';

                    return (
                        <div
                            key={`${appt.studentId}-${index}`}
                            className="absolute w-full p-1"
                            style={{
                                top: `${topOffset}rem`,
                                height: `${height}rem`,
                            }}
                        >
                            <button
                                onClick={() => onStudentClick(appt.studentId)}
                                className={`h-full w-full ${color} p-1 rounded-lg shadow-sm text-xs overflow-hidden text-left focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-primary cursor-pointer`}
                            >
                                <p className="font-bold truncate">{appt.studentName}</p>
                                <p className="truncate">{appt.startTime} - {appt.endTime}</p>
                            </button>
                        </div>
                    );
                })}
            </div>
        ))}
      </div>
    </div>
  );
};

export default ScheduleView;