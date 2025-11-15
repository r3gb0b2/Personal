
import React, { useState, useRef, useEffect } from 'react';
import { Workout, Student, Trainer, ExerciseSet, ExerciseLog, LoggedSet } from '../../types';
import { DumbbellIcon, ExclamationCircleIcon, EyeIcon, EyeOffIcon, SendIcon, PrintIcon, CheckCircleIcon } from '../icons';
import { db } from '../../firebase';
import { doc, updateDoc, collection, query, where, orderBy, limit, getDocs, addDoc, Timestamp, deleteDoc } from 'firebase/firestore';
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
    const [sessionLogs, setSessionLogs] = useState<{ [exerciseId: string]: { logData: { [setId: string]: LoggedSet }, logDocId?: string } }>({});
    const [historicalLogs, setHistoricalLogs] = useState<{ [exerciseId: string]: ExerciseLog }>({});
    const [showSuccess, setShowSuccess] = useState(false);


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

    useEffect(() => {
        const fetchHistoricalLogs = async () => {
            if (!selectedWorkout) return;
            const exerciseIds = selectedWorkout.exercises.map(e => e.id);
            const logs: { [exerciseId: string]: ExerciseLog } = {};

            for (const exId of exerciseIds) {
                const q = query(
                    collection(db, "exerciseLogs"),
                    where("studentId", "==", student.id),
                    where("exerciseId", "==", exId),
                    orderBy("date", "desc"),
                    limit(1)
                );
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const doc = querySnapshot.docs[0];
                    logs[exId] = { id: doc.id, ...doc.data() } as ExerciseLog;
                }
            }
            setHistoricalLogs(logs);
        };

        if (selectedWorkout) {
            fetchHistoricalLogs();
            setSessionLogs({}); // Reset logs for the new session
        }
    }, [selectedWorkout, student.id]);

    const handleFeedbackChange = (exerciseId: string, text: string) => {
        setFeedback(prev => ({...prev, [exerciseId]: text}));
    };
    
    const handleSendFeedback = async (workoutId: string, exerciseId: string) => {
        const feedbackText = feedback[exerciseId];
        if (!feedbackText || !feedbackText.trim()) return;
        setIsSubmittingFeedback(exerciseId);
        try {
            const workout = workouts.find(w => w.id === workoutId);
            if (!workout) throw new Error("Workout not found");
            const updatedExercises = workout.exercises.map(ex => ex.id === exerciseId ? { ...ex, studentFeedback: feedbackText } : ex);
            await updateDoc(doc(db, 'workouts', workoutId), { exercises: updatedExercises });
            alert("Feedback enviado com sucesso!");
            setFeedback(prev => ({...prev, [exerciseId]: ''}));
            const updatedWorkout = { ...workout, exercises: updatedExercises };
            onWorkoutUpdate(updatedWorkout);
            if (selectedWorkout?.id === workoutId) setSelectedWorkout(updatedWorkout);
        } catch (error) {
            alert("Não foi possível enviar o feedback.");
        } finally {
            setIsSubmittingFeedback(null);
        }
    };

// FIX: Rewrote state update to be more type-safe and avoid spreading potentially undefined values.
    const handleLogChange = (exerciseId: string, setId: string, field: 'reps' | 'load', value: string) => {
        setSessionLogs(prev => {
            const exerciseLog = prev[exerciseId] || { logData: {} };
            const setLog: LoggedSet = exerciseLog.logData[setId] || { reps: '', load: '' };
    
            return {
                ...prev,
                [exerciseId]: {
                    ...exerciseLog,
                    logData: {
                        ...exerciseLog.logData,
                        [setId]: {
                            ...setLog,
                            [field]: value,
                        },
                    },
                },
            };
        });
    };

    const handleLogAndComplete = async (exerciseId: string, exerciseName: string) => {
        if (!selectedWorkout) return;
        const currentWorkout = workouts.find(w => w.id === selectedWorkout.id);
        if (!currentWorkout) return;

// FIX: Explicitly handle potentially undefined `logData` and use `Object.values` on a correctly typed object to prevent TypeScript from inferring `unknown[]`.
        const logData = sessionLogs[exerciseId]?.logData;
        const loggedSets = logData ? Object.values(logData).filter(s => s.reps || s.load) : [];
        let logDocId: string | undefined = undefined;

        if (loggedSets.length > 0) {
            const logData: Omit<ExerciseLog, 'id'> = {
                studentId: student.id,
                workoutId: currentWorkout.id,
                exerciseId, exerciseName,
                date: new Date().toISOString(),
                loggedSets,
            };
            const docRef = await addDoc(collection(db, "exerciseLogs"), {
                ...logData, date: Timestamp.now()
            });
            logDocId = docRef.id;
            setSessionLogs(prev => ({...prev, [exerciseId]: { ...prev[exerciseId], logDocId }}));
        }

        const currentCompleted = currentWorkout.completedExerciseIds || [];
        const newCompleted = [...currentCompleted, exerciseId];
        
        try {
            await updateDoc(doc(db, 'workouts', currentWorkout.id), { completedExerciseIds: newCompleted });
            const updatedWorkout = { ...currentWorkout, completedExerciseIds: newCompleted };
            setSelectedWorkout(updatedWorkout);
            onWorkoutUpdate(updatedWorkout);

            const allExercisesDone = updatedWorkout.exercises.filter(ex => !ex.isHidden).every(ex => newCompleted.includes(ex.id));
            if (allExercisesDone) {
                setShowSuccess(true);
            }
        } catch (error) {
            console.error("Error completing exercise:", error);
        }
    };

    const handleUndoCompletion = async (exerciseId: string) => {
        if (!selectedWorkout) return;
        const currentWorkout = workouts.find(w => w.id === selectedWorkout.id);
        if (!currentWorkout) return;

        const logDocIdToDelete = sessionLogs[exerciseId]?.logDocId;
        if (logDocIdToDelete) {
            try {
                await deleteDoc(doc(db, "exerciseLogs", logDocIdToDelete));
                setSessionLogs(prev => {
                    const newLogs = {...prev};
                    delete newLogs[exerciseId];
                    return newLogs;
                })
            } catch (error) {
                console.error("Failed to delete exercise log:", error);
            }
        }
        
        const newCompleted = (currentWorkout.completedExerciseIds || []).filter(id => id !== exerciseId);
        await updateDoc(doc(db, 'workouts', currentWorkout.id), { completedExerciseIds: newCompleted });
        const updatedWorkout = { ...currentWorkout, completedExerciseIds: newCompleted };
        setSelectedWorkout(updatedWorkout);
        onWorkoutUpdate(updatedWorkout);
    };

    if (showSuccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-green-50 text-center p-4">
                <CheckCircleIcon className="w-24 h-24 text-green-500 mb-4"/>
                <h2 className="text-3xl font-bold text-green-800">Parabéns!</h2>
                <p className="text-lg text-gray-700 mt-2">Você concluiu seu treino de hoje com sucesso. Ótimo trabalho!</p>
                <button 
                    onClick={() => {
                        setShowSuccess(false);
                        setSelectedWorkout(null);
                    }}
                    className="mt-8 px-6 py-3 bg-brand-primary text-white font-bold rounded-lg shadow-md hover:bg-brand-accent"
                >
                    Voltar para a Lista de Treinos
                </button>
            </div>
        )
    }

    if (selectedWorkout) {
        const completedExercises = selectedWorkout.completedExerciseIds || [];
        const exercisesToShow = selectedWorkout.exercises.filter(ex => !ex.isHidden);
        const sortedExercises = [...exercisesToShow].sort((a, b) => {
            const aDone = completedExercises.includes(a.id);
            const bDone = completedExercises.includes(b.id);
            return aDone === bDone ? 0 : aDone ? 1 : -1;
        });

        return (
            <>
                <div className="bg-brand-dark sticky top-0 z-20">
                    <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                        <h1 className="text-xl sm:text-2xl font-bold text-white truncate">{selectedWorkout.title}</h1>
                        <div>
                            <button onClick={() => setWorkoutToPrint(selectedWorkout)} className="text-white hover:text-gray-300 mr-4" title="Baixar PDF"><PrintIcon className="w-6 h-6"/></button>
                            <button onClick={() => setSelectedWorkout(null)} className="text-white hover:text-gray-300">&times; Voltar</button>
                        </div>
                    </header>
                </div>
                <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-4">
                    {sortedExercises.map(ex => {
                         const isCompleted = completedExercises.includes(ex.id);
                         const historicalLog = historicalLogs[ex.id];
                         if (isCompleted) {
                            return (
                                <div key={ex.id} className="p-4 bg-green-50 border border-green-200 rounded-lg flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <CheckCircleIcon className="w-6 h-6 text-green-500"/>
                                        <p className="font-semibold text-gray-700">{ex.name}</p>
                                    </div>
                                    <button onClick={() => handleUndoCompletion(ex.id)} className="text-sm font-medium text-gray-600 hover:text-red-600">Desfazer</button>
                                </div>
                            )
                         }

                         return (
                            <div key={ex.id} className="p-4 bg-white rounded-lg shadow-md border">
                                <h3 className="text-lg font-bold">{ex.name}</h3>
                                {ex.youtubeUrl && getYoutubeEmbedUrl(ex.youtubeUrl) && (
                                    <div className="mt-2 aspect-video"><iframe width="100%" height="100%" src={getYoutubeEmbedUrl(ex.youtubeUrl)!} title={ex.name} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe></div>
                                )}
                                {historicalLog && (
                                    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                                        <p className="text-xs font-bold text-blue-800">Última vez ({new Date(historicalLog.date).toLocaleDateString('pt-BR')}):</p>
                                        <div className="text-xs text-blue-700 space-y-1 mt-1">
                                        {historicalLog.loggedSets.map((s, i) => (
                                            <p key={i}><strong>Série {i+1}:</strong> {s.reps} reps @ {s.load}</p>
                                        ))}
                                        </div>
                                    </div>
                                )}
                                <div className="mt-3 space-y-2">
                                    {ex.sets.map((set, setIndex) => (
                                        <div key={set.id} className="grid grid-cols-[auto,1fr,auto] items-center gap-x-3 p-2 bg-gray-50 rounded-md">
                                            <span className="font-bold text-sm">Série {setIndex + 1}</span>
                                            <span className="text-sm text-gray-600">{renderSetDetails(set)}</span>
                                            {set.type === 'reps_load' && (
                                                <div className="col-start-2 col-span-2 grid grid-cols-2 gap-2 mt-1">
                                                    <input type="text" placeholder="Reps" onChange={(e) => handleLogChange(ex.id, set.id, 'reps', e.target.value)} className="w-full text-sm border-gray-300 rounded-md"/>
                                                    <input type="text" placeholder="Carga" onChange={(e) => handleLogChange(ex.id, set.id, 'load', e.target.value)} className="w-full text-sm border-gray-300 rounded-md"/>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                 <div className="mt-4 pt-4 border-t">
                                     <button onClick={() => handleLogAndComplete(ex.id, ex.name)} className="w-full py-2 bg-green-600 text-white font-bold rounded-md hover:bg-green-700">Registrar e Concluir Exercício</button>
                                </div>

                                <div className="mt-4 pt-4 border-t">
                                     <h4 className="text-sm font-semibold mb-2">Feedback para o Personal (opcional)</h4>
                                     <div className="flex items-center gap-2">
                                         <textarea value={feedback[ex.id] || ''} onChange={(e) => handleFeedbackChange(ex.id, e.target.value)} placeholder="Ex: Senti dor no ombro, achei muito pesado..." className="flex-1 text-sm border-gray-300 rounded-md shadow-sm" rows={2}/>
                                         <button onClick={() => handleSendFeedback(selectedWorkout.id, ex.id)} disabled={!feedback[ex.id] || isSubmittingFeedback === ex.id} className="p-2 bg-brand-primary text-white rounded-md hover:bg-brand-accent disabled:bg-gray-400"><SendIcon className="w-5 h-5"/></button>
                                     </div>
                                 </div>
                            </div>
                         )
                    })}
                </main>
            </>
        )
    }

    return (
        <>
            <div className="bg-brand-dark">
                <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <h1 className="text-xl sm:text-2xl font-bold text-white">Minhas Fichas de Treino</h1>
                    <button onClick={onBack} className="text-white hover:text-gray-300">&times; Voltar</button>
                </header>
            </div>
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                 {workouts.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {workouts.map(w => {
                             const completedCount = w.completedExerciseIds?.length || 0;
                             const totalExercises = (w.exercises || []).filter(ex => !ex.isHidden).length;
                             const progress = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;
                             return (
                                <button key={w.id} onClick={() => setSelectedWorkout(w)} className="text-left p-6 bg-white rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all">
                                    <h2 className="text-xl font-bold text-brand-dark">{w.title}</h2>
                                    <p className="text-sm text-gray-500">Criado em: {new Date(w.createdAt).toLocaleDateString('pt-BR')}</p>
                                    <div className="mt-4">
                                        <div className="flex justify-between items-center text-sm font-semibold text-gray-600 mb-1">
                                            <span>Progresso</span>
                                            <span>{completedCount}/{totalExercises}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${progress}%`}}></div>
                                        </div>
                                    </div>
                                </button>
                             )
                         })}
                     </div>
                 ) : (
                     <p className="text-center text-gray-500 py-16">Nenhuma ficha de treino foi criada para você ainda.</p>
                 )}
            </main>
        </>
    );
};

export default WorkoutPortal;
