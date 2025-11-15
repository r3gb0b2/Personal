import React, { useState, useMemo } from 'react';
import { LibraryExercise, EXERCISE_CATEGORIES, MUSCLE_GROUPS, ExerciseCategory, MuscleGroup, TrainerSuggestion } from '../../types';
import Modal from './Modal';
import { PlusIcon } from '../icons';

interface ExerciseLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: LibraryExercise) => void;
  onCreateCustom: () => void;
  availableExercises: (LibraryExercise | TrainerSuggestion)[];
}

const ExerciseLibraryModal: React.FC<ExerciseLibraryModalProps> = ({ isOpen, onClose, onSelectExercise, onCreateCustom, availableExercises }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory | 'all'>('all');
  const [muscleGroupFilter, setMuscleGroupFilter] = useState<MuscleGroup | 'all'>('all');

  const filteredExercises = useMemo(() => {
    return availableExercises.filter(ex => {
      const nameMatch = ex.name.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryMatch = categoryFilter === 'all' || ex.category === categoryFilter;
      const muscleGroupMatch = muscleGroupFilter === 'all' || ex.muscleGroup === muscleGroupFilter;
      return nameMatch && categoryMatch && muscleGroupMatch;
    });
  }, [availableExercises, searchTerm, categoryFilter, muscleGroupFilter]);

  const handleSelect = (exercise: LibraryExercise | TrainerSuggestion) => {
    onSelectExercise(exercise as LibraryExercise);
  };

  return (
    <Modal title="Biblioteca de Exercícios" isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 border rounded-md space-y-3">
          <input
            type="text"
            placeholder="Buscar exercício pelo nome..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full border-gray-300 rounded-md shadow-sm"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value as ExerciseCategory | 'all')}
              className="w-full border-gray-300 rounded-md shadow-sm text-sm"
            >
              <option value="all">Todas as Categorias</option>
              {EXERCISE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={muscleGroupFilter}
              onChange={e => setMuscleGroupFilter(e.target.value as MuscleGroup | 'all')}
              className="w-full border-gray-300 rounded-md shadow-sm text-sm"
            >
              <option value="all">Todos os Grupos Musculares</option>
              {MUSCLE_GROUPS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        
        <button
            onClick={onCreateCustom}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-brand-primary border-2 border-dashed border-gray-300 rounded-md hover:bg-gray-100"
        >
            <PlusIcon className="w-4 h-4" />
            Criar Exercício Personalizado
        </button>

        <div className="border rounded-md max-h-80 overflow-y-auto">
          {filteredExercises.length > 0 ? (
            filteredExercises.map(ex => (
              <button
                key={ex.id}
                onClick={() => handleSelect(ex)}
                className="w-full text-left p-3 hover:bg-blue-50 border-b last:border-b-0"
              >
                <p className="font-semibold text-brand-dark">{ex.name}</p>
                <p className="text-xs text-gray-500">{ex.category} - {ex.muscleGroup}</p>
              </button>
            ))
          ) : (
            <p className="p-8 text-center text-gray-500">Nenhum exercício encontrado. Tente ajustar os filtros ou crie um novo.</p>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ExerciseLibraryModal;
