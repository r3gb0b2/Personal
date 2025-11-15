import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Workout, Student, Trainer, ExerciseSet } from '../../types';
import { DumbbellIcon, ExclamationCircleIcon, SendIcon, PrintIcon, CheckCircleIcon } from '../icons';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import WorkoutPDFLayout from '../pdf/WorkoutPDFLayout';

interface WorkoutPortalProps {
    workouts: Workout[];
    onBack: () => void;
    isPlanActive: boolean;
    onWorkoutUpdate: (updatedWorkout: Workout) => void;
    student: Student;
    trainer: Trainer | null;
}

const getYoutubeEmbedUrl = (url: string | undefined): string | null => {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        let videoId = urlObj.searchParams.get('v');
        if (!videoId) {
            const pathParts = urlObj.pathname.split('/');
            videoId = pathParts[pathParts.length - 1];
        }
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    } catch (e) {
        console.error("Invalid YouTube URL:", e);
        return null;
    }
}

const renderSetDetails = (set: ExerciseSet): string => {
    switch(set.type) {
        case 'reps_load': return `${set.reps || '-'} reps @ ${set.load || '-'}`;
        case 'reps_load_time': return `${set.reps || '-'} reps @ ${set.load || '-'} [${set.time || '-'}]`;
        case 'reps_time': return `${set.reps || '-'} reps [${set.time || '-'}]`;
        case 'run': return `${set.distance || '-'} em ${set.time || '-'}`;
        case 'cadence': return `Cadência ${set.cadence || '-'} | ${set.reps || '-'} reps @ ${set.load || '-'}`;
        case 'observation': return `${set.observation || '-'}`;
        default: return '';
    }
};


const WorkoutPortal: React.FC<WorkoutPortalProps> = ({ workouts, onBack, isPlanActive, onWorkoutUpdate, student, trainer }) => {
    const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
    
    // By deriving the selected workout from props, we ensure it's never stale.
    const selectedWorkout = useMemo(() => {
        if (!selectedWorkoutId) return null;
        return workouts.find(w => w.id === selectedWorkoutId) || null;
    }, [workouts, selectedWorkoutId]);

    const [feedback, setFeedback] = useState<{ [exerciseId: string]: string }>({});
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<string | null>(null);
    const [workoutToPrint, setWorkoutToPrint] = useState<Workout | null>(null);
    const pdfLayoutRef = useRef<HTMLDivElement>(null);

    const handleFeedbackChange = (exerciseId: string, text: string) => {
        setFeedback(prev => ({...prev, [exerciseId]: text}));
    };

    useEffect(() => {
        if (workoutToPrint && pdfLayoutRef.current && student && trainer) {
            const generatePdf = async () => {
                const element = pdfLayoutRef.current;
                if (!element) return;

                const canvas = await html2canvas(element, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');
                
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`treino-${student.name.replace(/\s/g, '_')}-${workoutToPrint.title.replace(/\s/g, '_')}.pdf`);

                setWorkoutToPrint(null);
            };
            setTimeout(generatePdf, 100);
        }
    }, [workoutToPrint, student, trainer]);

    const toggleExerciseCompletion = async (exerciseId: string) => {
        if (!selectedWorkout) return;

        const currentCompleted = selectedWorkout.completedExerciseIds || [];
        const isCompleted = currentCompleted.includes(exerciseId);
        
        const newCompleted = isCompleted 
            ? currentCompleted.filter(id => id !== exerciseId)
            : [...currentCompleted, exerciseId];
            
        try {
            const workoutRef = doc(db, 'workouts', selectedWorkout.id);
            await updateDoc(workoutRef, { completedExerciseIds: newCompleted });
            const updatedWorkout = { ...selectedWorkout, completedExerciseIds: newCompleted };
            
            // The parent component's state is updated, which will trigger a re-render
            // of this component with a fresh `workouts` prop. The `useMemo` hook
            // will then provide the updated `selectedWorkout`.
            onWorkoutUpdate(updatedWorkout);
        } catch (error) {
            console.error("Error updating exercise status:", error);
            alert("Não foi possível salvar o status do exercício.");
        }
    };
    
    const handleSendFeedback = async (exerciseId: string) => {
        if (!selectedWorkout) return;
        const feedbackText = feedback[exerciseId];
        if (!feedbackText || !feedbackText.trim()) return;

        setIsSubmittingFeedback(exerciseId);
        try {
            const workoutRef = doc(db, 'workouts', selectedWorkout.id);
            if (!selectedWorkout.exercises) throw new Error("Workout data is missing exercises.");

            const updatedExercises = selectedWorkout.exercises.map(ex => 
                ex.id === exerciseId ? { ...ex, studentFeedback: feedbackText } : ex
            );

            await updateDoc(workoutRef, { exercises: updatedExercises });
            alert("Feedback enviado com sucesso!");
            setFeedback(prev => ({...prev, [exerciseId]: ''}));
            
            const updatedWorkout = { ...selectedWorkout, exercises: updatedExercises };
            onWorkoutUpdate(updatedWorkout);

        } catch (error) {
            console.error("Error sending feedback:", error);
            alert("Não foi possível enviar o feedback. Tente novamente.");
        } finally {
            setIsSubmittingFeedback(null);
        }
    };

    const renderContent = () => {
        if (!isPlanActive) {
            return (
                <div className="text-center py-16 bg-white p-6 rounded-lg shadow-md">
                    <ExclamationCircleIcon className="w-16 h-16 mx-auto text-red-400"/>
                    <h3 className="mt-4 text-xl font-semibold text-gray-700">Acesso à Ficha de Treino Bloqueado</h3>
                    <p className="mt-2 text-gray-500">Seu plano está inativo ou vencido. Por favor, entre em contato com seu personal para regularizar sua situação.</p>
                </div>
            );
        }

        if (!selectedWorkout) {
            if (workouts.length === 0) {
                 return (
                    <div className="text-center py-16">
                        <DumbbellIcon className="w-16 h-16 mx-auto text-gray-300"/>
                        <h3 className="mt-4 text-xl font-semibold text-gray-700">Nenhuma ficha de treino encontrada.</h3>
                        <p className="mt-2 text-gray-500">Peça ao seu personal para cadastrar seus treinos.</p>
                    </div>
                );
            }
            return (
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-brand-dark mb-2">Selecione seu Treino</h2>
                    {workouts.map(workout => {
                        const visibleExercises = (workout.exercises || []).filter(ex => ex && !ex.isHidden);
                        if (visibleExercises.length === 0) return null;

                        const totalExercises = visibleExercises.length;
                        const completedCount = workout.completedExerciseIds?.length || 0;
                        const progress = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;

                        return (
                            <div key={workout.id} onClick={() => setSelectedWorkoutId(workout.id)} className="bg-white p-4 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-xl text-brand-primary">{workout.title}</h3>
                                    <span className="text-sm font-semibold text-gray-600">{completedCount}/{totalExercises} concluídos</span>
                                </div>
                                <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                                    <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )
        }

        const visibleExercises = (selectedWorkout.exercises || []).filter(ex => ex && !ex.isHidden);
        return (
            <div>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <button onClick={() => setSelectedWorkoutId(null)} className="text-sm font-medium text-brand-primary hover:underline mb-2">&larr; Voltar para a lista de treinos</button>
                        <h2 className="text-2xl font-bold text-brand-dark">{selectedWorkout.title}</h2>
                    </div>
                     <button 
                        onClick={() => setWorkoutToPrint(selectedWorkout)}
                        className="text-gray-500 hover:text-brand-primary"
                        title="Baixar Treino em PDF"
                    >
                        <PrintIcon className="w-6 h-6" />
                    </button>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                     {visibleExercises.map((ex, exIndex) => {
                         if (!ex) return null; // Defensive check for malformed data
                         const isCompleted = selectedWorkout.completedExerciseIds?.includes(ex.id);
                         const embedUrl = getYoutubeEmbedUrl(ex.youtubeUrl);

                         return (
                            <div key={ex.id || exIndex} className={`bg-white p-4 rounded-lg border shadow-sm transition-all duration-300 relative flex flex-col ${isCompleted ? 'opacity-60 bg-green-50' : ''}`}>
                                {isCompleted && (
                                    <div className="absolute top-3 right-3 flex items-center gap-2 text-green-700 font-bold text-sm bg-green-200 px-2 py-1 rounded-full z-10">
                                        <CheckCircleIcon className="w-5 h-5" />
                                        Concluído
                                    </div>
                                )}
                                <h3 className="font-bold text-lg mb-3 text-brand-secondary pr-24">{ex.name}</h3>
                                
                                {!isCompleted && embedUrl && (<div className="mb-4"><iframe className="w-full aspect-video rounded-md shadow" src={embedUrl} title={ex.name} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe></div>)}
                                
                                <div className="mb-3 overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-200">
                                            <tr>
                                                <th className="p-2 w-12 text-center">Série</th>
                                                <th className="p-2">Detalhes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(ex.sets || []).map((set, setIndex) => {
                                                if (!set) return null; // Defensive check for malformed data
                                                return (
                                                    <tr key={set.id || setIndex} className="border-b">
                                                        <td className="p-2 text-center font-medium">{setIndex + 1}</td>
                                                        <td className="p-2">{renderSetDetails(set)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                
                                {ex.rest && (<div className="text-sm mb-4"><span className="font-semibold">Descanso:</span> {ex.rest}</div>)}

                                <div className="mt-auto pt-4 border-t">
                                     {isCompleted ? (
                                        <button onClick={() => toggleExerciseCompletion(ex.id)} className="w-full py-2 px-4 font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
                                            Desfazer
                                        </button>
                                     ) : (
                                        <>
                                            <div className="mb-4">
                                                <p className="text-sm font-semibold text-gray-600 mb-1">Feedback para o Personal:</p>
                                                 {ex.studentFeedback ? (
                                                    <p className="text-sm italic text-gray-500 bg-gray-100 p-2 rounded-md">"Enviado: {ex.studentFeedback}"</p>
                                                 ) : (
                                                    <div className="flex items-center gap-2">
                                                        <input type="text" placeholder="Opcional: como foi o exercício?" className="flex-grow text-sm border-gray-300 rounded-md shadow-sm" value={feedback[ex.id] || ''} onChange={(e) => handleFeedbackChange(ex.id, e.target.value)} />
                                                        <button onClick={() => handleSendFeedback(ex.id)} disabled={isSubmittingFeedback === ex.id} className="p-2 bg-brand-primary text-white rounded-md hover:bg-brand-accent disabled:bg-gray-400"><SendIcon className="w-4 h-4"/></button>
                                                    </div>
                                                 )}
                                            </div>
                                            <button onClick={() => toggleExerciseCompletion(ex.id)} className="w-full py-2 px-4 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">
                                                Concluir Exercício
                                            </button>
                                        </>
                                     )}
                                </div>
                            </div>
                         );
                     })}
                 </div>
            </div>
        );
    };

    return (
        <>
            <div className="bg-brand-dark">
                <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <DumbbellIcon className="w-8 h-8 text-white"/>
                        <h1 className="text-xl sm:text-2xl font-bold text-white">Minha Ficha de Treino</h1>
                    </div>
                    <button onClick={onBack} className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors">
                        <span>Voltar ao Painel</span>
                    </button>
                </header>
            </div>

            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
               {renderContent()}
            </main>
            
            <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
                {workoutToPrint && student && trainer && (
                    <WorkoutPDFLayout
                        ref={pdfLayoutRef}
                        student={student}
                        trainer={trainer}
                        workout={workoutToPrint}
                    />
                )}
            </div>
        </>
    );
};

export default WorkoutPortal;