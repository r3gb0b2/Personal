import React, { useState, useMemo } from 'react';
import { Student } from '../types';

interface ScheduleViewProps {
  students: Student[];
}

const timeToMinutes = (time: string): number => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
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
  
  const dayMap: { [key: number]: string } = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
  const todayKey = dayMap[new Date().getDay()];
  const [selectedDay, setSelectedDay] = useState<string>(todayKey);

  const timeSlots = Array.from({ length: (22 - 6) * 2 }, (_, i) => {
    const hours = 6 + Math.floor(i / 2);
    const minutes = (i % 2) * 30;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  });

  const appointments = useMemo(() => students.flatMap(student => 
    (student.schedule || []).map(item => ({
      studentId: student.id,
      studentName: student.name,
      ...item
    }))
  ).filter(item => item.startTime && item.endTime), [students]);
  
  const studentColors = useMemo(() => {
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

  const mobileAppointmentsForDay = useMemo(() => {
      return appointments
          .filter(appt => appt.day === selectedDay)
          .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }, [appointments, selectedDay]);

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
       <h2 className="text-xl font-bold mb-4">Agenda da Semana</h2>
       
       {/* Mobile View: Tabs for days */}
       <div className="md:hidden">
          <div className="border-b border-gray-200">
             <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
                {days.map(day => (
                   <button
                      key={day.key}
                      onClick={() => setSelectedDay(day.key)}
                      className={`${
                         selectedDay === day.key
                            ? 'border-brand-primary text-brand-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                   >
                      {day.name}
                   </button>
                ))}
             </nav>
          </div>
          <div className="mt-4 space-y-3">
             {mobileAppointmentsForDay.length > 0 ? (
                mobileAppointmentsForDay.map((appt, index) => {
                   const color = studentColors.get(appt.studentId) || 'bg-gray-200 border-gray-400';
                   return (
                      <div key={index} className={`p-3 rounded-lg border-l-4 ${color}`}>
                         <p className="font-bold">{appt.studentName}</p>
                         <p className="text-sm">{appt.startTime} - {appt.endTime}</p>
                      </div>
                   )
                })
             ) : (
                <p className="text-center text-gray-500 py-8">Nenhum aluno agendado para este dia.</p>
             )}
          </div>
       </div>

      {/* Desktop View: Full Grid */}
      <div className="hidden md:block overflow-x-auto">
        <div className="grid grid-cols-[auto,1fr,1fr,1fr,1fr,1fr,1fr,1fr] gap-x-2 text-sm text-center font-semibold text-gray-600">
          <div className="sticky left-0 bg-white z-10"></div> {/* Empty corner */}
          {days.map(day => (
            <div key={day.key} className="sticky top-0 bg-white z-10 py-2 border-b-2">{day.name}</div>
          ))}
        </div>
        <div className="relative grid grid-cols-[auto,1fr,1fr,1fr,1fr,1fr,1fr,1fr] gap-x-2 -mt-px">
          {/* Time slots */}
          <div className="col-start-1 col-end-2 row-start-1 row-end-[-1] sticky left-0 bg-white z-10">
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
          
          {/* Appointments container */}
          <div className="col-start-2 col-end-9 row-start-1 row-end-[-1] relative">
            {appointments.map((appt, index) => {
              const dayIndex = days.findIndex(d => d.key === appt.day);
              if (dayIndex === -1) return null;

              const startMinutes = timeToMinutes(appt.startTime);
              const endMinutes = timeToMinutes(appt.endTime);
              const durationMinutes = endMinutes - startMinutes;
              const topOffset = ((startMinutes - (6 * 60)) / 60) * 3; // 3rem per hour
              const height = (durationMinutes / 60) * 3; // 3rem per hour
              
              const color = studentColors.get(appt.studentId) || 'bg-gray-200 border-gray-400';

              return (
                <div
                  key={index}
                  className="absolute p-0.5"
                  style={{
                    left: `${(100/7) * dayIndex}%`,
                    width: `${100/7}%`,
                    top: `${topOffset}rem`,
                    height: `${height}rem`,
                  }}
                >
                  <div className={`h-full w-full ${color} p-1 rounded overflow-hidden text-xs`}>
                    <p className="font-bold truncate">{appt.studentName}</p>
                    <p className="truncate">{appt.startTime} - {appt.endTime}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleView;
