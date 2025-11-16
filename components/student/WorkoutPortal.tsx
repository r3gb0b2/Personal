

import React, { useState, useRef, useEffect } from 'react';
import { Workout, Student, Trainer, ExerciseSet, ExerciseLog, LoggedSet } from '../../types';
import { DumbbellIcon, ExclamationCircleIcon, EyeIcon, EyeOffIcon, SendIcon, PrintIcon, CheckCircleIcon } from '../icons';
import { db } from '../../firebase';
import { doc, updateDoc, collection, query, where, orderBy, limit, getDocs, addDoc, Timestamp, deleteDoc } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import WorkoutPDFLayout from '../pdf/WorkoutPDFLayout';

interface StudentWorkoutViewProps {
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


const StudentWorkoutView: React.FC<StudentWorkoutViewProps> = ({ workouts, onBack, isPlanActive, onWorkoutUpdate, student, trainer }) => {
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

        const logDataForPayload = sessionLogs[exerciseId]?.logData;
        const loggedSetsForPayload: LoggedSet[] = logDataForPayload
            ? Object.keys(logDataForPayload)
                .map((key) => logDataForPayload[key])
                .filter((s) => s.reps || s.load)
            : [];
        
        if (loggedSetsForPayload.length > 0) {
            const logPayload: Omit<ExerciseLog, 'id'> = {
                studentId: student.id,
                workoutId: currentWorkout.id,
                exerciseId, exerciseName,
                date: new Date().toISOString(),
                loggedSets: loggedSetsForPayload,
            };
            const docRef = await addDoc(collection(db, "exerciseLogs"), {
                ...logPayload, date: Timestamp.now()
            });
            const logDocIdForPayload = docRef.id;
            setSessionLogs(prev => ({...prev, [exerciseId]: { ...prev[exerciseId], logDocId: logDocIdForPayload }}));
        }

        const currentCompleted = currentWorkout.completedExerciseIds || [];
        const newCompleted = [...currentCompleted, exerciseId];
        const updatedWorkoutPartial = { ...currentWorkout, completedExerciseIds: newCompleted };
        
        const allExercisesDone = updatedWorkoutPartial.exercises
            .filter(ex => !ex.isHidden)
            .every(ex => newCompleted.includes(ex.id));

        try {
            if (allExercisesDone) {
                const finalWorkoutUpdate = { ...updatedWorkoutPartial, completedAt: new Date().toISOString() };
                await updateDoc(doc(db, 'workouts', currentWorkout.id), {
                    completedExerciseIds: newCompleted,
                    completedAt: Timestamp.now()
                });
                onWorkoutUpdate(finalWorkoutUpdate);
                setSelectedWorkout(finalWorkoutUpdate);
                setShowSuccess(true);
            } else {
                await updateDoc(doc(db, 'workouts', currentWorkout.id), { completedExerciseIds: newCompleted });
                onWorkoutUpdate(updatedWorkoutPartial);
                setSelectedWorkout(updatedWorkoutPartial);
            }
        } catch (error) {
            console.error("Error completing exercise:", error);
        }
    };

    const handleUndoCompletion = async (exerciseId: string) => {
        if (!selectedWorkout) return;
        const currentWorkout = workouts.find(w => w.id === selectedWorkout.id);
        if (!currentWorkout) return;

        // Also delete the log if it was created in this session
        const logToDelete = sessionLogs[exerciseId];
        if (logToDelete?.logDocId) {
            try {
                await deleteDoc(doc(db, "exerciseLogs", logToDelete.logDocId));
                setSessionLogs(prev => {
                    const newLogs = { ...prev };
                    delete newLogs[exerciseId];
                    return newLogs;
                });
            } catch (error) {
                console.error("Error deleting session log:", error);
            }
        }

        const newCompleted = (currentWorkout.completedExerciseIds || []).filter(id => id !== exerciseId);
        const wasCompleted = !!currentWorkout.completedAt;
        
        try {
             const dataToUpdate: { completedExerciseIds: string[]; completedAt?: any } = {
                completedExerciseIds: newCompleted
            };
            if (wasCompleted) {
                dataToUpdate.completedAt = null;
            }
            
            await updateDoc(doc(db, 'workouts', currentWorkout.id), dataToUpdate);

            const updatedWorkout = { ...currentWorkout, completedExerciseIds: newCompleted };
            if (wasCompleted) {
                updatedWorkout.completedAt = null;
            }

            setSelectedWorkout(updatedWorkout);
            onWorkoutUpdate(updatedWorkout);
            setShowSuccess(false); // Hide success message if they undo
        } catch (error) {
            console.error("Error undoing completion:", error);
        }
    };

    if (showSuccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-full text-center p-4">
                <CheckCircleIcon className="w-24 h-24 text-green-500 mb-4" />
                <h2 className="text-3xl font-bold text-brand-dark">Treino Concluído!</h2>
                <p className="text-gray-600 mt-2">Parabéns por finalizar sua ficha de treino. Excelente trabalho!</p>
                <button
                    onClick={() => {
                        setShowSuccess(false);
                        setSelectedWorkout(null);
                    }}
                    className="mt-6 px-6 py-3 bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-accent transition-colors"
                >
                    Voltar para a Lista de Treinos
                </button>
            </div>
        );
    }
    
    const activeWorkouts = workouts.filter(w => !w.completedAt);
    const completedWorkouts = workouts.filter(w => w.completedAt);

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
             <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-2">
                    <DumbbellIcon className="w-7 h-7" />
                    {selectedWorkout ? selectedWorkout.title : 'Minhas Fichas de Treino'}
                </h2>
                {selectedWorkout && (
                    <button onClick={() => setSelectedWorkout(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                        Voltar para a Lista
                    </button>
                )}
            </div>
            <main>
                {!isPlanActive ? (
                    <div className="text-center p-8 bg-white rounded-lg shadow-md">
                        <ExclamationCircleIcon className="w-12 h-12 mx-auto text-red-500 mb-4" />
                        <h2 className="text-2xl font-bold text-red-700">Acesso Bloqueado</h2>
                        <p className="mt-2 text-gray-600">Seu plano não está ativo. Por favor, entre em contato com seu personal para regularizar a situação.</p>
                    </div>
                ) : selectedWorkout ? (
                    // DETAILED WORKOUT VIEW
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <button onClick={() => setWorkoutToPrint(selectedWorkout)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700">
                                <PrintIcon className="w-5 h-5" /> Baixar PDF
                            </button>
                        </div>
                        {(selectedWorkout.exercises || []).filter(ex => !ex.isHidden).map(ex => {
                            const isCompleted = selectedWorkout.completedExerciseIds?.includes(ex.id);

                            if (isCompleted) {
                                return (
                                    <div key={ex.id} className="p-4 border rounded-lg shadow-sm bg-green-50 border-green-200 flex justify-between items-center transition-all duration-300">
                                        <div className="flex items-center gap-3">
                                            <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0" />
                                            <h3 className="text-md font-bold text-green-800">{ex.name}</h3>
                                        </div>
                                        <button onClick={() => handleUndoCompletion(ex.id)} className="px-3 py-1 text-xs font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 whitespace-nowrap">
                                            Desfazer
                                        </button>
                                    </div>
                                );
                            }
                            
                            const embedUrl = getYoutubeEmbedUrl(ex.youtubeUrl);
                            const lastLog = historicalLogs[ex.id];

                            return (
                                <div key={ex.id} className="p-4 border rounded-lg shadow-sm transition-all duration-300 bg-white">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-xl font-bold text-brand-dark">{ex.name}</h3>
                                            <p className="text-sm text-gray-500">{ex.category} | {ex.muscleGroup}</p>
                                        </div>
                                    </div>
                                    {embedUrl && (
                                        <div className="mt-3 aspect-w-16 aspect-h-9">
                                            <iframe src={embedUrl} title={ex.name} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full rounded-md"></iframe>
                                        </div>
                                    )}
                                    <div className="mt-3 space-y-2">
                                        <div className="grid grid-cols-[50px,1fr,auto] gap-x-4 items-center font-semibold text-sm text-gray-500">
                                            <span>Série</span>
                                            <span>Execução</span>
                                            <span className="text-right">Seu Log</span>
                                        </div>
                                        {ex.sets.map((set, index) => (
                                            <div key={set.id} className="grid grid-cols-[50px,1fr,120px] gap-x-4 items-center p-2 bg-gray-50 rounded-md">
                                                <span className="font-bold text-center">{index + 1}</span>
                                                <span className="text-sm">{renderSetDetails(set)}</span>
                                                <div className="flex gap-1">
                                                    <input type="text" placeholder="Reps" onChange={e => handleLogChange(ex.id, set.id, 'reps', e.target.value)} className="w-1/2 text-sm border-gray-300 rounded-md"/>
                                                    <input type="text" placeholder="Carga" onChange={e => handleLogChange(ex.id, set.id, 'load', e.target.value)} className="w-1/2 text-sm border-gray-300 rounded-md"/>
                                                </div>
                                            </div>
                                        ))}
                                        {lastLog && (
                                            <div className="text-xs text-gray-500 italic p-2 bg-blue-50 border-l-4 border-blue-200 rounded-r-md">
                                                Último treino ({new Date(lastLog.date).toLocaleDateString('pt-BR')}):
                                                {lastLog.loggedSets.map((s, i) => ` ${s.reps}x${s.load}`).join(' | ')}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4 pt-4 border-t">
                                        <button onClick={() => handleLogAndComplete(ex.id, ex.name)} className="w-full py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">
                                            Marcar como Concluído
                                        </button>
                                    </div>
                                    <div className="mt-4">
                                        <textarea value={feedback[ex.id] || ''} onChange={e => handleFeedbackChange(ex.id, e.target.value)} placeholder="Deixar um feedback sobre o exercício..." rows={2} className="w-full text-sm border-gray-300 rounded-md"></textarea>
                                        <button onClick={() => handleSendFeedback(selectedWorkout.id, ex.id)} disabled={isSubmittingFeedback === ex.id} className="mt-2 flex items-center gap-2 px-3 py-1 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent disabled:bg-gray-400">
                                            <SendIcon className="w-4 h-4" /> {isSubmittingFeedback === ex.id ? 'Enviando...' : 'Enviar Feedback'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    // WORKOUT LIST VIEW
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-semibold mb-3 text-brand-dark">Treinos Ativos</h3>
                            <div className="space-y-4">
                                {activeWorkouts.length > 0 ? activeWorkouts.map(w => (
                                    <div key={w.id} className="p-4 border rounded-lg bg-white shadow-sm flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-lg text-brand-dark">{w.title}</p>
                                            <p className="text-sm text-gray-500">Criado em: {new Date(w.createdAt).toLocaleDateString('pt-BR')}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => setWorkoutToPrint(w)} className="text-gray-500 hover:text-purple-600" title="Baixar PDF do Treino">
                                                <PrintIcon className="w-6 h-6"/>
                                            </button>
                                            <button onClick={() => setSelectedWorkout(w)} className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent">
                                                Iniciar Treino
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-center text-gray-500 p-4 bg-gray-50 rounded-md">Você não tem treinos ativos no momento.</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-semibold mb-3 text-brand-dark">Treinos Concluídos</h3>
                            <div className="space-y-4">
                                {completedWorkouts.length > 0 ? completedWorkouts.map(w => (
                                    <div key={w.id} className="p-4 border rounded-lg bg-green-50 border-green-200 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-lg text-green-800">{w.title}</p>
                                            <p className="text-sm text-green-700">Concluído em: {w.completedAt ? new Date(w.completedAt).toLocaleDateString('pt-BR') : 'Data inválida'}</p>
                                        </div>
                                        <button onClick={() => setSelectedWorkout(w)} className="px-4 py-2 text-sm font-medium text-green-800 bg-white border border-green-300 rounded-md hover:bg-green-100">
                                            Ver Detalhes
                                        </button>
                                    </div>
                                )) : (
                                    <p className="text-center text-gray-500 p-4 bg-gray-50 rounded-md">Nenhum treino concluído ainda.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
            {/* HIDDEN PDF LAYOUT */}
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
        </div>
    );
};

export default StudentWorkoutView;