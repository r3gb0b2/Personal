import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, getDocs, setDoc, doc, query, where, Timestamp, addDoc } from 'firebase/firestore';
import { Workout, WorkoutTemplate, Exercise, LibraryExercise, TrainerSuggestion } from '../types';
import { PlusIcon, TrashIcon, EyeIcon, EyeOffIcon } from './icons';

interface WorkoutEditorProps {
  initialData: Workout | WorkoutTemplate | null;
  onSave: (data: Omit<Workout, 'id'> | Omit<WorkoutTemplate, 'id'>) => void;
  onCancel: () => void;
  trainerId: string;
  isTemplateMode: boolean; // True for templates, false for student workouts
  studentId?: string; // Only for student workouts
}

const WorkoutEditor: React.FC<WorkoutEditorProps> = ({ initialData, onSave, onCancel, trainerId, isTemplateMode, studentId }) => {
    const [title, setTitle] = useState(initialData?.title || '');
    const [exercises, setExercises] = useState<Exercise[]>(initialData?.exercises || []);
    const [availableExercises, setAvailableExercises] = useState<Omit<Exercise, 'id'>[]>([]);
    const [activeSuggestionBox, setActiveSuggestionBox] = useState<number | null>(null);
    const [flashedIndex, setFlashedIndex] = useState<number | null>(null);
    const exerciseRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        const fetchAvailableExercises = async () => {
            if (!trainerId) return;
            // 1. Fetch global library exercises
            const librarySnapshot = await getDocs(collection(db, 'libraryExercises'));
            const globalExercises = librarySnapshot.docs.map(doc => doc.data() as LibraryExercise);

            // 2. Fetch trainer's own suggestions (approved or pending)
            const suggestionsQuery = query(collection(db, 'trainerSuggestions'), where("trainerId", "==", trainerId));
            const suggestionsSnapshot = await getDocs(suggestionsQuery);
            const trainerExercises = suggestionsSnapshot.docs.map(doc => doc.data() as TrainerSuggestion);

            // 3. Combine and deduplicate, giving precedence to global exercises
            const combined = new Map<string, Omit<Exercise, 'id'>>();
            globalExercises.forEach(ex => combined.set(ex.name.toLowerCase(), ex));
            trainerExercises.forEach(ex => {
                if (!combined.has(ex.name.toLowerCase())) {
                    combined.set(ex.name.toLowerCase(), ex);
                }
            });
            
            setAvailableExercises(Array.from(combined.values()));
        };
        fetchAvailableExercises();
    }, [trainerId]);
    
    const handleExerciseChange = (index: number, field: keyof Exercise, value: string | boolean) => {
        const newExercises = [...exercises];
        newExercises[index] = { ...newExercises[index], [field]: value };
        setExercises(newExercises);
    };

    const addExercise = () => {
        setExercises([...exercises, { id: `${Date.now()}`, name: '', sets: '', reps: '', rest: '', notes: '', youtubeUrl: '', isHidden: false, studentFeedback: '' }]);
    };
    
    const removeExercise = (index: number) => {
        setExercises(exercises.filter((_, i) => i !== index));
    };

    const handleSelectSuggestion = (index: number, suggestion: Omit<Exercise, 'id'>) => {
        const newExercises = [...exercises];
        newExercises[index] = {
            ...newExercises[index],
            name: suggestion.name,
            sets: suggestion.sets,
            reps: suggestion.reps,
            rest: suggestion.rest,
            notes: suggestion.notes,
            youtubeUrl: suggestion.youtubeUrl,
        };
        setExercises(newExercises);
        setActiveSuggestionBox(null);
        
        // Visual feedback
        setFlashedIndex(index);
        setTimeout(() => setFlashedIndex(null), 1000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Create suggestions for new exercises
        const suggestionPromises = exercises.map(async (exercise) => {
            if (exercise.name) {
                const isGlobal = availableExercises.some(libEx => libEx.name.toLowerCase() === exercise.name.toLowerCase());
                
                if (!isGlobal) {
                    // Check if a suggestion already exists to avoid duplicates
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
            }
            return Promise.resolve();
        });

        await Promise.all(suggestionPromises);
        
        const dataToSave: any = { title, exercises };
        if (!isTemplateMode && studentId && initialData) {
            dataToSave.id = initialData.id;
            dataToSave.studentId = studentId;
            dataToSave.trainerId = trainerId;
        } else if (initialData) {
            dataToSave.id = initialData.id;
        }
        
        onSave(dataToSave);
    };

    const filteredSuggestions = (index: number) => {
        const currentName = exercises[index]?.name;
        if (activeSuggestionBox !== index || !currentName || currentName.length < 2) {
            return [];
        }
        return availableExercises.filter(ex => ex.name.toLowerCase().includes(currentName.toLowerCase()));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 p-2 max-h-[65vh] overflow-y-auto">
            <div>
                <label className="block text-sm font-bold text-gray-700">Título</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={isTemplateMode ? "Ex: Modelo de Treino de Força" : "Ex: Treino A - Foco em Peito"} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
            </div>
            <div className="space-y-4">
                {exercises.map((ex, index) => {
                    const cardClass = `p-4 border rounded-lg bg-gray-50 space-y-2 relative transition-all duration-300 ${ex.isHidden ? 'opacity-50 bg-gray-100' : ''} ${flashedIndex === index ? 'bg-green-100 border-green-300' : ''}`;
                    return (
                        <div key={ex.id} ref={el => exerciseRefs.current[index] = el} className={cardClass}>
                            <div className="absolute top-2 right-2 flex gap-2">
                                {!isTemplateMode && (
                                    <button type="button" onClick={() => handleExerciseChange(index, 'isHidden', !ex.isHidden)} className="text-gray-400 hover:text-blue-600" title={ex.isHidden ? 'Mostrar para o aluno' : 'Ocultar do aluno'}>
                                        {ex.isHidden ? <EyeOffIcon className="w-5 h-5"/> : <EyeIcon className="w-5 h-5"/>}
                                    </button>
                                )}
                                <button type="button" onClick={() => removeExercise(index)} className="text-gray-400 hover:text-red-600"><TrashIcon className="w-5 h-5"/></button>
                            </div>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={ex.name} 
                                    onChange={e => {
                                        handleExerciseChange(index, 'name', e.target.value);
                                        setActiveSuggestionBox(index);
                                    }}
                                    onBlur={() => setTimeout(() => setActiveSuggestionBox(null), 200)}
                                    placeholder="Nome do Exercício" 
                                    className="text-md font-semibold w-full border-b pb-1 bg-transparent focus:outline-none focus:border-brand-primary pr-16"
                                />
                                {filteredSuggestions(index).length > 0 && (
                                    <ul className="absolute z-20 w-full bg-white border rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
                                        {filteredSuggestions(index).map(suggestion => (
                                            <li
                                              key={suggestion.name}
                                              className="p-2 hover:bg-gray-100 cursor-pointer"
                                              onMouseDown={() => handleSelectSuggestion(index, suggestion)}
                                            >
                                              {suggestion.name}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <input type="text" value={ex.sets} onChange={e => handleExerciseChange(index, 'sets', e.target.value)} placeholder="Séries" className="text-sm w-full border-gray-300 rounded-md"/>
                                <input type="text" value={ex.reps} onChange={e => handleExerciseChange(index, 'reps', e.target.value)} placeholder="Reps" className="text-sm w-full border-gray-300 rounded-md"/>
                                <input type="text" value={ex.rest} onChange={e => handleExerciseChange(index, 'rest', e.target.value)} placeholder="Descanso" className="text-sm w-full border-gray-300 rounded-md"/>
                                <input type="text" value={ex.youtubeUrl} onChange={e => handleExerciseChange(index, 'youtubeUrl', e.target.value)} placeholder="Link YouTube (Opcional)" className="text-sm w-full border-gray-300 rounded-md"/>
                            </div>
                            <textarea value={ex.notes} onChange={e => handleExerciseChange(index, 'notes', e.target.value)} placeholder="Observações (ex: cadência, técnica)" className="text-sm w-full border-gray-300 rounded-md mt-1" rows={1}></textarea>
                             {!isTemplateMode && ex.studentFeedback && (
                                <div className="mt-2 p-2 bg-yellow-50 border-l-4 border-yellow-300">
                                    <p className="text-xs font-bold text-yellow-800">Feedback do Aluno:</p>
                                    <p className="text-sm text-yellow-900 italic">"{ex.studentFeedback}"</p>
                                </div>
                            )}
                        </div>
                    )
                })}
                <button type="button" onClick={addExercise} className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-brand-primary border-2 border-dashed border-gray-300 rounded-md hover:bg-gray-100">
                    <PlusIcon className="w-4 h-4"/> Adicionar Exercício
                </button>
            </div>
            <div className="flex justify-end gap-4 pt-4 sticky bottom-0 bg-white py-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent">Salvar</button>
            </div>
        </form>
    );
};

export default WorkoutEditor;