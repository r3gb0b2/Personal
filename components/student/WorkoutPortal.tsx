
import React, { useState, useRef, useEffect } from 'react';
import { Workout, Student, Trainer, ExerciseSet } from '../../types';
import { DumbbellIcon, ExclamationCircleIcon, EyeIcon, EyeOffIcon, SendIcon, PrintIcon, CheckCircleIcon } from '../icons';
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
    const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
    const [feedback, setFeedback] = useState<{ [exerciseId: string]: string }>({});
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<string | null>(null);
    const [workoutToPrint, setWorkoutToPrint] = useState<Workout | null>(null);
    const pdfLayoutRef = useRef<HTMLDivElement>(null);

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

    // This function was missing, causing a crash when opening a workout.
    const handleFeedbackChange = (exerciseId: string, text: string) => {
        setFeedback(prev => ({...prev, [exerciseId]: text}));
    };
    
    const handleSendFeedback = async (workoutId: string, exerciseId: string) => {
        const feedbackText = feedback[exerciseId];
        if (!feedbackText || !feedbackText.trim()) return;

        setIsSubmittingFeedback(exerciseId);
        try {
            const workoutRef = doc(db, 'workouts', workoutId);
            // Find the correct, up-to-date workout object from the main list
            const workout = workouts.find(w => w.id === workoutId);
            if (!workout || !workout.exercises) throw new Error("Workout not found");

            const updatedExercises = workout.exercises.map(ex => 
                ex.id === exerciseId ? { ...ex, studentFeedback: feedbackText } : ex
            );

            await updateDoc(workoutRef, { exercises: updatedExercises });
            alert("Feedback enviado com sucesso!");
            setFeedback(prev => ({...prev, [exerciseId]: ''}));

            // Propagate the change up to keep all states in sync
            const updatedWorkout = { ...workout, exercises: updatedExercises };
            onWorkoutUpdate(updatedWorkout);

            // Also update the local selectedWorkout state
            if (selectedWorkout && selectedWorkout.id === workoutId) {
                setSelectedWorkout(updatedWorkout);
            }

        } catch (error) {
            console.error("Error sending feedback:", error);
            alert("Não foi possível enviar o feedback. Tente novamente.");
        } finally {
            setIsSubmittingFeedback(null);
        }
    };

    const toggleExerciseCompleted = async (exerciseId: string) => {
        if (!selectedWorkout) return;

        // Defensively get the latest workout data from props instead of relying on local state
        const currentWorkoutFromProps = workouts.find(w => w.id === selectedWorkout.id);
        if (!currentWorkoutFromProps) {
            alert("Erro: O treino selecionado não foi encontrado. Tente recarregar a página.");
            return;
        }
        
        const currentCompleted = currentWorkoutFromProps.completedExerciseIds || [];
        const isCompleted = currentCompleted.includes(exerciseId);
        
        const newCompleted = isCompleted 
            ? currentCompleted.filter(id => id !== exerciseId)
            : [...currentCompleted, exerciseId];
            
        try {
            // Use the ID from the props version, which is safer
            const workoutRef = doc(db, 'workouts', currentWorkoutFromProps.id);
            await updateDoc(workoutRef, { completedExerciseIds: newCompleted });
            
            // Create the updated object based on the props version
            const updatedWorkout = { ...currentWorkoutFromProps, completedExerciseIds: newCompleted };
            
            // Update both the local selected state and the main list in the parent
            setSelectedWorkout(updatedWorkout);
            onWorkoutUpdate(updatedWorkout);
            
        } catch (error) {
            console.error("Error updating exercise status:", error);
            alert("Não foi possível salvar o status do exercício.");
        }
    };


    const renderSelectedWorkout = (workout: Workout) => {
        const visibleExercises = (workout.exercises || []).filter(ex => !ex.isHidden);
        return (
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSelectedWorkout(null)} className="text-brand-primary hover:underline text-sm">&larr; Voltar para a lista</button>
                        <h2 className="text-2xl font-bold text-brand-dark">{workout.title}</h2>
                        <button 
                            onClick={() => setWorkoutToPrint(workout)}
                            className="text-gray-500 hover:text-brand-primary"
                            title="Baixar Treino em PDF"
                        >
                            <PrintIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                    {visibleExercises.map(ex => {
                        const isCompleted = workout.completedExerciseIds?.includes(ex.id);
                        const embedUrl = getYoutubeEmbedUrl(ex.youtubeUrl);

                        if (isCompleted) {
                            return (
                                <div key={ex.id} className="p-3 rounded-lg border bg-green-100 flex items-center justify-between transition-all duration-300 col-span-1">
                                    <div className="flex items-center gap-3">
                                        <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0" />
                                        <h3 className="font-semibold text-gray-800">{ex.name}</h3>
                                    </div>
                                    <button
                                        onClick={() => toggleExerciseCompleted(ex.id)}
                                        className="px-3 py-1 text-sm font-bold text-yellow-900 bg-yellow-400 rounded-md hover:bg-yellow-500"
                                    >
                                        Desfazer
                                    </button>
                                </div>
                            )
                        }

                        return (
                            <div key={ex.id} className={`p-4 rounded-lg border relative flex flex-col transition-all duration-300 bg-gray-50`}>
                                <h3 className="font-bold text-lg mb-3 text-brand-secondary">{ex.name}</h3>
                                
                                {embedUrl && (<div className="mb-4"><iframe className="w-full aspect-video rounded-md shadow" src={embedUrl} title={ex.name} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe></div>)}
                                
                                <div className="mb-3 overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-200"><tr><th className="p-2 w-12 text-center">Série</th><th className="p-2">Detalhes</th></tr></thead>
                                        <tbody>
                                            {(ex.sets || []).map((set, index) => (
                                                <tr key={set.id} className="border-b"><td className="p-2 text-center font-medium">{index + 1}</td><td className="p-2">{renderSetDetails(set)}</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {ex.rest && (<div className="text-sm"><span className="font-semibold">Descanso:</span> {ex.rest}</div>)}

                                <div className="mt-4 pt-4 border-t space-y-2 flex-grow flex flex-col justify-end">
                                     <p className="text-sm font-semibold text-gray-600">Feedback para o Personal:</p>
                                     {ex.studentFeedback ? (
                                        <p className="text-sm italic text-gray-500 bg-gray-100 p-2 rounded-md">"Enviado: {ex.studentFeedback}"</p>
                                     ) : (
                                        <div className="flex items-center gap-2">
                                            <input type="text" placeholder="Opcional: como foi o exercício?" className="flex-grow text-sm border-gray-300 rounded-md shadow-sm" value={feedback[ex.id] || ''} onChange={(e) => handleFeedbackChange(ex.id, e.target.value)} />
                                            <button onClick={() => handleSendFeedback(workout.id, ex.id)} disabled={isSubmittingFeedback === ex.id} className="p-2 bg-brand-primary text-white rounded-md hover:bg-brand-accent disabled:bg-gray-400"><SendIcon className="w-4 h-4"/></button>
                                        </div>
                                     )}
                                     <button 
                                        onClick={() => toggleExerciseCompleted(ex.id)}
                                        className={`w-full mt-3 py-2 px-4 text-sm font-bold rounded-lg shadow-sm transition-colors bg-green-500 text-white hover:bg-green-600`}
                                     >
                                         {'Concluir Exercício'}
                                     </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )
    };
    
    const renderWorkoutList = () => {
        return (
            <div className="space-y-4">
                {workouts.map(w => {
                    const totalExercises = w.exercises?.filter(ex => !ex.isHidden).length || 0;
                    const completedCount = w.completedExerciseIds?.length || 0;
                    const progress = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;
                    return(
                        <button key={w.id} onClick={() => setSelectedWorkout(w)} className="w-full text-left p-6 bg-white rounded-lg shadow-md hover:shadow-lg hover:border-brand-primary border-2 border-transparent transition-all">
                            <h3 className="text-xl font-bold text-brand-dark">{w.title}</h3>
                            <div className="mt-3 flex items-center gap-4">
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                                </div>
                                <span className="text-sm font-semibold text-gray-600">{completedCount}/{totalExercises}</span>
                            </div>
                        </button>
                    );
                })}
            </div>
        );
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
        
        if (selectedWorkout) {
            return renderSelectedWorkout(selectedWorkout);
        }

        if (workouts.length > 0) {
            return renderWorkoutList();
        }

        return (
            <div className="text-center py-16">
                <DumbbellIcon className="w-16 h-16 mx-auto text-gray-300"/>
                <h3 className="mt-4 text-xl font-semibold text-gray-700">Nenhuma ficha de treino encontrada.</h3>
                <p className="mt-2 text-gray-500">Peça ao seu personal para cadastrar seus treinos.</p>
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