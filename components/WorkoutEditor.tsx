
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
// FIX: Changed firebase import path to use the scoped package '@firebase/firestore' to maintain consistency with the fix in `firebase.ts` and resolve potential module loading issues.
import { collection, getDocs, query, where, Timestamp, addDoc } from '@firebase/firestore';
import { Workout, WorkoutTemplate, Exercise, LibraryExercise, TrainerSuggestion, ExerciseSet, ExerciseSetType, EXERCISE_CATEGORIES, MUSCLE_GROUPS, ExerciseCategory, MuscleGroup } from '../types';
import { PlusIcon, TrashIcon, EyeIcon, EyeOffIcon } from './icons';
import ExerciseLibraryModal from './modals/ExerciseLibraryModal';

interface WorkoutEditorProps {
  initialData: Workout | WorkoutTemplate | null;
  onSave: (data: Omit<Workout, 'id'> | Omit<WorkoutTemplate, 'id'>) => void;
  onCancel: () => void;
  trainerId: string;
  isTemplateMode: boolean; // True for templates, false for student workouts
  studentId?: string; // Only for student workouts
}

const setTypeLabels: { [key in ExerciseSetType]: string } = {
    reps_load: 'Repetições e Carga',
    reps_load_time: 'Repetições, Carga e Tempo',
    reps_time: 'Repetições e Tempo',
    run: 'Corrida',
    cadence: 'Cadência',
    observation: 'Observação',
};

const WorkoutEditor: React.FC<WorkoutEditorProps> = ({ initialData, onSave, onCancel, trainerId, isTemplateMode, studentId }) => {
    const [title, setTitle] = useState(initialData?.title || '');
    const [exercises, setExercises] = useState<Exercise[]>(initialData?.exercises || []);
    const [availableExercises, setAvailableExercises] = useState<(LibraryExercise | TrainerSuggestion)[]>([]);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);

    useEffect(() => {
        const fetchAvailableExercises = async () => {
            if (!trainerId) return;
            const librarySnapshot = await getDocs(collection(db, 'libraryExercises'));
            const globalExercises = librarySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LibraryExercise));

            const suggestionsQuery = query(collection(db, 'trainerSuggestions'), where("trainerId", "==", trainerId));
            const suggestionsSnapshot = await getDocs(suggestionsQuery);
            const trainerExercisesData = suggestionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainerSuggestion));
            
            const combined = new Map<string, (LibraryExercise | TrainerSuggestion)>();
            globalExercises.forEach(ex => combined.set(ex.name.toLowerCase(), ex));
            trainerExercisesData.forEach(ex => {
                if (!combined.has(ex.name.toLowerCase())) {
                    combined.set(ex.name.toLowerCase(), ex);
                }
            });
            
            setAvailableExercises(Array.from(combined.values()).sort((a, b) => a.name.localeCompare(b.name)));
        };
        fetchAvailableExercises();
    }, [trainerId]);
    
    const handleExerciseChange = (index: number, field: keyof Omit<Exercise, 'sets' | 'id'>, value: string | boolean | ExerciseCategory | MuscleGroup) => {
        const newExercises = [...exercises];
        (newExercises[index] as any)[field] = value;
        setExercises(newExercises);
    };
    
    const handleSetChange = (exIndex: number, setIndex: number, field: keyof ExerciseSet, value: string) => {
        const newExercises = [...exercises];
        const newSets = [...newExercises[exIndex].sets];
        newSets[setIndex] = { ...newSets[setIndex], [field]: value };
        newExercises[exIndex].sets = newSets;
        setExercises(newExercises);
    };
    
    const removeExercise = (index: number) => {
        setExercises(exercises.filter((_, i) => i !== index));
    };

    const addSet = (exIndex: number) => {
        const newExercises = [...exercises];
        const newSet: ExerciseSet = {
            id: `${Date.now()}-${Math.random()}`,
            type: 'reps_load',
            reps: '',
            load: '',
            time: '',
            distance: '',
            cadence: '',
            observation: '',
        };
        const newSets = [...newExercises[exIndex].sets, newSet];
        newExercises[exIndex].sets = newSets;
        setExercises(newExercises);
    };

    const removeSet = (exIndex: number, setIndex: number) => {
        const newExercises = [...exercises];
        newExercises[exIndex].sets = newExercises[exIndex].sets.filter((_, i) => i !== setIndex);
        setExercises(newExercises);
    };
    
    const handleAddExerciseFromLibrary = (exerciseFromLib: LibraryExercise) => {
        const newExercise: Exercise = {
            id: `${Date.now()}-${Math.random()}`,
            name: exerciseFromLib.name,
            category: exerciseFromLib.category,
            muscleGroup: exerciseFromLib.muscleGroup,
            rest: exerciseFromLib.rest,
            youtubeUrl: exerciseFromLib.youtubeUrl,
            sets: exerciseFromLib.sets.map(s => ({...s, id: `${Date.now()}-${Math.random()}`})),
            isHidden: false,
            studentFeedback: ''
        };
        setExercises(prev => [...prev, newExercise]);
        setIsLibraryOpen(false);
    };
    
    const handleCreateCustomExercise = () => {
        const newExercise: Exercise = {
            id: `${Date.now()}-${Math.random()}`,
            name: '',
            category: 'Musculação',
            muscleGroup: 'Outro',
            rest: '',
            youtubeUrl: '',
            sets: [],
            isHidden: false,
            studentFeedback: ''
        };
        setExercises(prev => [...prev, newExercise]);
        setIsLibraryOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const suggestionPromises = exercises.map(async (exercise) => {
            // Check if it's a new, custom exercise
            if (exercise.name && !availableExercises.some(libEx => libEx.name.toLowerCase() === exercise.name.toLowerCase())) {
                 // Check if a suggestion for this already exists
                const suggestionQuery = query(
                    collection(db, 'trainerSuggestions'),
                    where("trainerId", "==", trainerId),
                    where("name", "==", exercise.name.trim())
                );
                const existingSuggestions = await getDocs(suggestionQuery);

                if (existingSuggestions.empty) {
                    const { id, isHidden, studentFeedback, ...suggestionData } = exercise;
                    const newSuggestion: Omit<TrainerSuggestion, 'id'> = {
                        ...suggestionData,
                        trainerId,
                        status: 'pending',
                        submittedAt: new Date().toISOString()
                    };
                    return addDoc(collection(db, 'trainerSuggestions'), {
                        ...newSuggestion,
                        submittedAt: Timestamp.now()
                    });
                }
            }
            return Promise.resolve();
        });

        await Promise.all(suggestionPromises);
        
        const dataToSave = {
            ...(initialData || {}),
            title,
            exercises,
        };
        
        onSave(dataToSave as any);
    };

    const renderSetInputs = (exIndex: number, set: ExerciseSet, setIndex: number) => {
        switch(set.type) {
            case 'reps_load':
                return <><input type="text" value={set.reps || ''} onChange={e => handleSetChange(exIndex, setIndex, 'reps', e.target.value)} placeholder="Reps" className="text-sm w-full border-gray-300 rounded-md"/><input type="text" value={set.load || ''} onChange={e => handleSetChange(exIndex, setIndex, 'load', e.target.value)} placeholder="Carga" className="text-sm w-full border-gray-300 rounded-md"/></>;
            case 'reps_load_time':
                return <><input type="text" value={set.reps || ''} onChange={e => handleSetChange(exIndex, setIndex, 'reps', e.target.value)} placeholder="Reps" className="text-sm w-full border-gray-300 rounded-md"/><input type="text" value={set.load || ''} onChange={e => handleSetChange(exIndex, setIndex, 'load', e.target.value)} placeholder="Carga" className="text-sm w-full border-gray-300 rounded-md"/><input type="text" value={set.time || ''} onChange={e => handleSetChange(exIndex, setIndex, 'time', e.target.value)} placeholder="Tempo" className="text-sm w-full border-gray-300 rounded-md"/></>;
            case 'reps_time':
                return <><input type="text" value={set.reps || ''} onChange={e => handleSetChange(exIndex, setIndex, 'reps', e.target.value)} placeholder="Reps" className="text-sm w-full border-gray-300 rounded-md"/><input type="text" value={set.time || ''} onChange={e => handleSetChange(exIndex, setIndex, 'time', e.target.value)} placeholder="Tempo" className="text-sm w-full border-gray-300 rounded-md"/></>;
            case 'run':
                return <><input type="text" value={set.distance || ''} onChange={e => handleSetChange(exIndex, setIndex, 'distance', e.target.value)} placeholder="Distância" className="text-sm w-full border-gray-300 rounded-md"/><input type="text" value={set.time || ''} onChange={e => handleSetChange(exIndex, setIndex, 'time', e.target.value)} placeholder="Tempo" className="text-sm w-full border-gray-300 rounded-md"/></>;
            case 'cadence':
                return <><input type="text" value={set.cadence || ''} onChange={e => handleSetChange(exIndex, setIndex, 'cadence', e.target.value)} placeholder="Cadência" className="text-sm w-full border-gray-300 rounded-md"/><input type="text" value={set.reps || ''} onChange={e => handleSetChange(exIndex, setIndex, 'reps', e.target.value)} placeholder="Reps" className="text-sm w-full border-gray-300 rounded-md"/><input type="text" value={set.load || ''} onChange={e => handleSetChange(exIndex, setIndex, 'load', e.target.value)} placeholder="Carga" className="text-sm w-full border-gray-300 rounded-md"/></>;
            case 'observation':
                return <input type="text" value={set.observation || ''} onChange={e => handleSetChange(exIndex, setIndex, 'observation', e.target.value)} placeholder="Observação" className="text-sm w-full border-gray-300 rounded-md col-span-full"/>;
            default: return null;
        }
    };

    return (
        <>
        <form onSubmit={handleSubmit} className="space-y-6 p-2 max-h-[65vh] overflow-y-auto">
            <div>
                <label className="block text-sm font-bold text-gray-700">Título</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={isTemplateMode ? "Ex: Modelo de Treino de Força" : "Ex: Treino A - Foco em Peito"} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
            </div>
            <div className="space-y-4">
                {exercises.map((ex, index) => {
                    const cardClass = `p-4 border rounded-lg bg-gray-50 space-y-3 relative transition-all duration-300 ${ex.isHidden ? 'opacity-50 bg-gray-100' : ''}`;
                    const isCustom = !availableExercises.some(libEx => libEx.name.toLowerCase() === ex.name.toLowerCase());
                    return (
                        <div key={ex.id} className={cardClass}>
                            <div className="absolute top-2 right-2 flex gap-2">
                                {!isTemplateMode && <button type="button" onClick={() => handleExerciseChange(index, 'isHidden', !ex.isHidden)} className="text-gray-400 hover:text-blue-600" title={ex.isHidden ? 'Mostrar para o aluno' : 'Ocultar do aluno'}>{ex.isHidden ? <EyeOffIcon className="w-5 h-5"/> : <EyeIcon className="w-5 h-5"/>}</button>}
                                <button type="button" onClick={() => removeExercise(index)} className="text-gray-400 hover:text-red-600"><TrashIcon className="w-5 h-5"/></button>
                            </div>
                             <input type="text" value={ex.name} onChange={e => handleExerciseChange(index, 'name', e.target.value)} placeholder="Nome do Exercício" disabled={!isCustom} className="text-md font-semibold w-full border-b pb-1 bg-transparent focus:outline-none focus:border-brand-primary pr-16 disabled:bg-gray-100 disabled:cursor-not-allowed" />
                            <div className="grid grid-cols-2 gap-2">
                                <select value={ex.category} onChange={e => handleExerciseChange(index, 'category', e.target.value as ExerciseCategory)} disabled={!isCustom} className="text-sm w-full border-gray-300 rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed">
                                    {EXERCISE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select value={ex.muscleGroup} onChange={e => handleExerciseChange(index, 'muscleGroup', e.target.value as MuscleGroup)} disabled={!isCustom} className="text-sm w-full border-gray-300 rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed">
                                    {MUSCLE_GROUPS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input type="text" value={ex.rest} onChange={e => handleExerciseChange(index, 'rest', e.target.value)} placeholder="Descanso" className="text-sm w-full border-gray-300 rounded-md"/>
                                <input type="text" value={ex.youtubeUrl || ''} onChange={e => handleExerciseChange(index, 'youtubeUrl', e.target.value)} placeholder="Link YouTube (Opcional)" className="text-sm w-full border-gray-300 rounded-md"/>
                            </div>
                            
                            <div className="space-y-2 pt-2">
                                {ex.sets.map((set, setIndex) => (
                                    <div key={set.id} className="p-2 border rounded-md bg-white grid grid-cols-[1fr,auto] gap-2 items-center">
                                        <div className="grid grid-cols-3 gap-2 items-center">
                                            <select value={set.type} onChange={e => handleSetChange(index, setIndex, 'type', e.target.value)} className="text-sm border-gray-300 rounded-md col-span-full sm:col-span-1">
                                                {Object.entries(setTypeLabels).map(([key, label]) => <option key={key} value={key as ExerciseSetType}>{label}</option>)}
                                            </select>
                                            <div className="col-span-full sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                {renderSetInputs(index, set, setIndex)}
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => removeSet(index, setIndex)} className="text-gray-400 hover:text-red-600 p-1"><TrashIcon className="w-4 h-4"/></button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => addSet(index)} className="w-full text-xs flex items-center justify-center gap-1 py-1 font-medium text-brand-primary border-2 border-dashed border-gray-300 rounded-md hover:bg-gray-100"><PlusIcon className="w-3 h-3"/> Adicionar Série</button>
                            </div>
                             {!isTemplateMode && ex.studentFeedback && (<div className="mt-2 p-2 bg-yellow-50 border-l-4 border-yellow-300"><p className="text-xs font-bold text-yellow-800">Feedback do Aluno:</p><p className="text-sm text-yellow-900 italic">"{ex.studentFeedback}"</p></div>)}
                        </div>
                    )
                })}
                <button type="button" onClick={() => setIsLibraryOpen(true)} className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-brand-primary border-2 border-dashed border-gray-300 rounded-md hover:bg-gray-100"><PlusIcon className="w-4 h-4"/> Adicionar Exercício</button>
            </div>
            <div className="flex justify-end gap-4 pt-4 sticky bottom-0 bg-white py-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent">Salvar</button>
            </div>
        </form>
        {isLibraryOpen && (
            <ExerciseLibraryModal
                isOpen={isLibraryOpen}
                onClose={() => setIsLibraryOpen(false)}
                onSelectExercise={handleAddExerciseFromLibrary}
                onCreateCustom={handleCreateCustomExercise}
                availableExercises={availableExercises}
            />
        )}
        </>
    );
};

export default WorkoutEditor;
