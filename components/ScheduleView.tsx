import React, { useState, useMemo, useEffect, useRef } from 'react';
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
    const [now, setNow] = useState(new Date());
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const hourHeightRem = 6; // h-24 -> 6rem
    const calendarStartHour = 6;

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    // Auto-scroll to current time on initial load
    useEffect(() => {
        const currentHour = now.getHours();
        if (scrollContainerRef.current && currentHour >= calendarStartHour) {
            const hoursIntoDay = currentHour - calendarStartHour;
            // Scroll so the current hour is a little bit above the vertical center of the viewport
            const scrollTop = hoursIntoDay * (hourHeightRem * 16) - scrollContainerRef.current.clientHeight / 4;
            scrollContainerRef.current.scrollTop = scrollTop;
        }
    }, []);

    const weekDates = useMemo(() => {
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + i);
            return date;
        });
    }, []);

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    };

    const timeSlots = Array.from({ length: (22 - calendarStartHour) }, (_, i) => {
        const hour = calendarStartHour + i;
        return `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 || hour === 24 ? 'AM' : 'PM'}`;
    });

    const appointments = useMemo(() => {
        const dayMap: { [key: number]: string } = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
        return weekDates.map((date, index) => {
            const dayKey = dayMap[date.getDay()];
            return {
                date,
                dayKey,
                events: students.flatMap(student => 
                    (student.schedule || []).filter(item => item.day === dayKey && item.startTime && item.endTime)
                    .map(item => ({
                        studentId: student.id,
                        studentName: student.name,
                        ...item
                    }))
                )
            };
        });
    }, [students, weekDates]);
  
    const studentColors = useMemo(() => {
        const colors = [
            'bg-blue-100 border-blue-300 text-blue-800',
            'bg-green-100 border-green-300 text-green-800',
            'bg-yellow-100 border-yellow-300 text-yellow-800',
            'bg-purple-100 border-purple-300 text-purple-800',
            'bg-pink-100 border-pink-300 text-pink-800',
            'bg-indigo-100 border-indigo-300 text-indigo-800',
            'bg-red-100 border-red-300 text-red-800',
            'bg-teal-100 border-teal-300 text-teal-800',
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

    const currentTimePosition = useMemo(() => {
        const minutesFromStart = (now.getHours() - calendarStartHour) * 60 + now.getMinutes();
        if (minutesFromStart < 0) return null;
        return (minutesFromStart / 60) * hourHeightRem;
    }, [now]);


    return (
        <div ref={containerRef} className="bg-white p-4 sm:p-6 rounded-lg shadow-md flex flex-col h-[85vh]">
            <h2 className="text-xl font-bold mb-4 text-brand-dark">Agenda da Semana</h2>
            
            <header className="grid grid-cols-[4rem,1fr] sticky top-0 bg-white z-20 pb-2">
                <div />
                <div className="grid grid-cols-7">
                    {weekDates.map(date => (
                        <div key={date.toISOString()} className="flex flex-col items-center">
                            <span className="text-xs font-medium text-gray-500 uppercase">{date.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0,3)}</span>
                            <span className={`mt-1 text-lg font-semibold w-8 h-8 rounded-full flex items-center justify-center ${isToday(date) ? 'bg-brand-primary text-white' : 'text-gray-700'}`}>
                                {date.getDate()}
                            </span>
                        </div>
                    ))}
                </div>
            </header>

            <div ref={scrollContainerRef} className="relative overflow-y-auto flex-grow">
                {/* Background Grid & Timeline */}
                <div className="grid grid-cols-[4rem,1fr] h-full">
                    {/* Timeline */}
                    <div className="-mt-3">
                        {timeSlots.map(time => (
                            <div key={time} style={{ height: `${hourHeightRem}rem` }} className="flex justify-end pr-2">
                                <span className="text-xs text-gray-400">{time}</span>
                            </div>
                        ))}
                    </div>

                    {/* Day columns for appointments */}
                    <div className="grid grid-cols-7 relative">
                        {appointments.map(({ dayKey, events }) => (
                            <div key={dayKey} className="relative border-l border-gray-100">
                                {events.map((appt, index) => {
                                    const startMinutes = timeToMinutes(appt.startTime);
                                    const endMinutes = timeToMinutes(appt.endTime);
                                    const durationMinutes = endMinutes - startMinutes;

                                    if(durationMinutes <= 0) return null;

                                    const top = ((startMinutes - (calendarStartHour * 60)) / 60) * hourHeightRem;
                                    const height = (durationMinutes / 60) * hourHeightRem;
                                    const color = studentColors.get(appt.studentId) || 'bg-gray-100 border-gray-300 text-gray-800';
                                    
                                    return (
                                        <div
                                            key={`${appt.studentId}-${index}`}
                                            className={`absolute left-1 right-1 p-2 rounded-lg border text-xs overflow-hidden ${color}`}
                                            style={{
                                                top: `${top}rem`,
                                                height: `${height}rem`,
                                            }}
                                        >
                                            <p className="font-bold truncate">{appt.studentName}</p>
                                            <p className="truncate">{appt.startTime} - {appt.endTime}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Current Time Indicator */}
                {currentTimePosition !== null && isToday(now) && (
                     <div className="absolute top-0 left-16 right-0 pointer-events-none" style={{ transform: `translateY(${currentTimePosition}rem)` }}>
                        <div className="relative h-px bg-red-500">
                           <div className="absolute -left-2 -top-1.5 w-3 h-3 rounded-full bg-red-500"></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScheduleView;
