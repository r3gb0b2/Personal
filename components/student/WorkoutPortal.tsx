import React, { useState } from 'react';
import { Workout } from '../../types';
import { DumbbellIcon, ExclamationCircleIcon, EyeIcon, EyeOffIcon, SendIcon } from '../icons';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface WorkoutPortalProps {
    workouts: Workout[];
    onBack: () => void;
    isPlanActive: boolean;
}

const getYoutubeEmbedUrl = (url: string | undefined): string | null => {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        let videoId = urlObj.searchParams.get('v');
        if (!videoId) {
            // Handles short URLs like youtu.be/VIDEOID
            const pathParts = urlObj.pathname.split('/');
            videoId = pathParts[pathParts.length - 1];
        }
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    } catch (e) {
        console.error("Invalid YouTube URL:", e);
        return null;
    }
}

const WorkoutPortal: React.FC<WorkoutPortalProps> = ({ workouts, onBack, isPlanActive }) => {
    const [hiddenExercises, setHiddenExercises] = useState<string[]>([]);
    const [feedback, setFeedback] = useState<{ [exerciseId: string]: string }>({});
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<string | null>(null);

    const toggleExerciseVisibility = (exerciseId: string) => {
        setHiddenExercises(prev => 
            prev.includes(exerciseId) 
            ? prev.filter(id => id !== exerciseId)
            : [...prev, exerciseId]
        );
    };

    const restoreAllExercises = () => {
        setHiddenExercises([]);
    };
    
    const handleFeedbackChange = (exerciseId: string, text: string) => {
        setFeedback(prev => ({...prev, [exerciseId]: text}));
    };
    
    const handleSendFeedback = async (workoutId: string, exerciseId: string) => {
        const feedbackText = feedback[exerciseId];
        if (!feedbackText || !feedbackText.trim()) return;

        setIsSubmittingFeedback(exerciseId);
        try {
            const workoutRef = doc(db, 'workouts', workoutId);
            const workout = workouts.find(w => w.id === workoutId);
            if (!workout) throw new Error("Workout not found");

            const updatedExercises = workout.exercises.map(ex => 
                ex.id === exerciseId ? { ...ex, studentFeedback: feedbackText } : ex
            );

            await updateDoc(workoutRef, { exercises: updatedExercises });
            alert("Feedback enviado com sucesso!");
            setFeedback(prev => ({...prev, [exerciseId]: ''}));

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

        if (workouts.length > 0) {
            return (
                 <div className="space-y-8">
                    {hiddenExercises.length > 0 && (
                        <div className="text-center">
                            <button onClick={restoreAllExercises} className="px-4 py-2 bg-brand-secondary text-white font-semibold rounded-lg shadow hover:bg-gray-700">
                                Restaurar Exercícios
                            </button>
                        </div>
                    )}
                    {workouts.map(workout => {
                        const visibleExercises = workout.exercises.filter(ex => !ex.isHidden);
                        if (visibleExercises.length === 0) return null;

                        return (
                            <div key={workout.id} className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                                <h2 className="text-2xl font-bold text-brand-dark mb-4">{workout.title}</h2>
                                
                                {/* Mobile View: Card-based layout */}
                                <div className="space-y-4 md:hidden">
                                    {visibleExercises.map(ex => {
                                        const isHidden = hiddenExercises.includes(ex.id);
                                        
                                        if (isHidden) {
                                            return (
                                                <div key={ex.id} className="bg-gray-100 p-3 rounded-lg flex justify-between items-center border shadow-sm">
                                                    <p className="text-gray-500 line-through">{ex.name}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">Concluído</span>
                                                        <button onClick={() => toggleExerciseVisibility(ex.id)} className="text-gray-400 hover:text-brand-primary">
                                                            <EyeOffIcon className="w-5 h-5"/>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        const embedUrl = getYoutubeEmbedUrl(ex.youtubeUrl);
                                        return (
                                            <div key={ex.id} className="bg-gray-50 p-4 rounded-lg border relative transition-opacity">
                                                <div className="absolute top-3 right-3 flex items-center gap-2">
                                                    <button onClick={() => toggleExerciseVisibility(ex.id)} className="text-gray-400 hover:text-brand-primary" title="Marcar como concluído">
                                                        <EyeIcon className="w-5 h-5"/>
                                                    </button>
                                                </div>

                                                <h3 className="font-bold text-lg mb-3 text-brand-secondary">{ex.name}</h3>
                                                
                                                {embedUrl && (
                                                    <div className="mb-4">
                                                        <iframe
                                                            className="w-full aspect-video rounded-md shadow"
                                                            src={embedUrl}
                                                            title={ex.name}
                                                            frameBorder="0"
                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                            allowFullScreen
                                                        ></iframe>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-center border-t border-b py-3">
                                                    <div>
                                                        <p className="text-sm text-gray-500">Séries</p>
                                                        <p className="font-bold text-lg">{ex.sets || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-500">Reps</p>
                                                        <p className="font-bold text-lg">{ex.reps || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-500">Descanso</p>
                                                        <p className="font-bold text-lg">{ex.rest || '-'}</p>
                                                    </div>
                                                </div>

                                                {ex.notes && (
                                                    <div className="mt-3">
                                                        <p className="text-sm font-semibold text-gray-600">Observações:</p>
                                                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{ex.notes}</p>
                                                    </div>
                                                )}

                                                <div className="mt-4 pt-4 border-t">
                                                     <p className="text-sm font-semibold text-gray-600 mb-1">Feedback para o Personal:</p>
                                                     {ex.studentFeedback ? (
                                                        <p className="text-sm italic text-gray-500 bg-gray-100 p-2 rounded-md">"Enviado: {ex.studentFeedback}"</p>
                                                     ) : (
                                                        <div className="flex items-center gap-2">
                                                            <input 
                                                                type="text" 
                                                                placeholder="Opcional: como foi o exercício?" 
                                                                className="flex-grow text-sm border-gray-300 rounded-md shadow-sm"
                                                                value={feedback[ex.id] || ''}
                                                                onChange={(e) => handleFeedbackChange(ex.id, e.target.value)}
                                                            />
                                                            <button 
                                                                onClick={() => handleSendFeedback(workout.id, ex.id)} 
                                                                disabled={isSubmittingFeedback === ex.id}
                                                                className="p-2 bg-brand-primary text-white rounded-md hover:bg-brand-accent disabled:bg-gray-400"
                                                            >
                                                                <SendIcon className="w-4 h-4"/>
                                                            </button>
                                                        </div>
                                                     )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Desktop View: Table layout */}
                                <div className="overflow-x-auto hidden md:block">
                                    <table className="w-full text-left">
                                        <thead className="bg-brand-light">
                                            <tr>
                                                <th className="p-3 font-semibold w-1/4">Exercício</th>
                                                <th className="p-3 font-semibold">Séries</th>
                                                <th className="p-3 font-semibold">Reps</th>
                                                <th className="p-3 font-semibold">Descanso</th>
                                                <th className="p-3 font-semibold">Observações</th>
                                                <th className="p-3 font-semibold w-1/4">Feedback</th>
                                                <th className="p-3 font-semibold text-center">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {visibleExercises.map(ex => {
                                                const isHidden = hiddenExercises.includes(ex.id);
                                                
                                                if (isHidden) {
                                                    return (
                                                        <tr key={ex.id} className="border-t">
                                                            <td className="p-3">
                                                                <div className="flex justify-between items-center">
                                                                    <p className="text-gray-500 line-through">{ex.name}</p>
                                                                    <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">Concluído</span>
                                                                </div>
                                                            </td>
                                                            <td colSpan={5} className="p-3 text-center text-gray-400">—</td>
                                                            <td className="p-3 align-top text-center">
                                                                <button onClick={() => toggleExerciseVisibility(ex.id)} className="text-gray-400 hover:text-brand-primary" title="Restaurar exercício">
                                                                    <EyeOffIcon className="w-6 h-6"/>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                }

                                                return (
                                                    <tr key={ex.id} className="border-t">
                                                        <td className="p-3 font-medium align-top">
                                                            {ex.name}
                                                        </td>
                                                        <td className="p-3 align-top">{ex.sets}</td>
                                                        <td className="p-3 align-top">{ex.reps}</td>
                                                        <td className="p-3 align-top">{ex.rest}</td>
                                                        <td className="p-3 text-sm text-gray-600 align-top whitespace-pre-wrap">{ex.notes}</td>
                                                        <td className="p-3 align-top">
                                                             {ex.studentFeedback ? (
                                                                <p className="text-sm italic text-gray-500 bg-gray-100 p-2 rounded-md">"Enviado: {ex.studentFeedback}"</p>
                                                             ) : (
                                                                <div className="flex items-center gap-1">
                                                                    <input 
                                                                        type="text" 
                                                                        placeholder="Como foi?" 
                                                                        className="flex-grow text-sm border-gray-300 rounded-md shadow-sm w-full"
                                                                        value={feedback[ex.id] || ''}
                                                                        onChange={(e) => handleFeedbackChange(ex.id, e.target.value)}
                                                                    />
                                                                    <button 
                                                                        onClick={() => handleSendFeedback(workout.id, ex.id)}
                                                                        disabled={isSubmittingFeedback === ex.id}
                                                                        className="p-2 bg-brand-primary text-white rounded-md hover:bg-brand-accent disabled:bg-gray-400"
                                                                        title="Enviar Feedback"
                                                                    >
                                                                        <SendIcon className="w-4 h-4"/>
                                                                    </button>
                                                                </div>
                                                             )}
                                                        </td>
                                                        <td className="p-3 align-top text-center">
                                                            <button onClick={() => toggleExerciseVisibility(ex.id)} className="text-gray-400 hover:text-brand-primary" title="Marcar como concluído">
                                                                <EyeIcon className="w-6 h-6"/>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
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
        </>
    );
};

export default WorkoutPortal;